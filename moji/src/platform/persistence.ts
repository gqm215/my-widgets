import { useAppStore } from '@/store';
import {
  applyExternalPayload,
  flushState,
  payloadSavedAt,
  readLocalPayload,
  runWithoutPersist,
  serializeState,
  setPersistSink,
} from '@/utils/storage';
import { resolveBridge, type MojiBridge } from './bridge';

export interface PersistenceSession {
  /** 当前桌面壳的桥；Web / PWA 下为 null */
  bridge: MojiBridge | null;
  /** 解除落盘钩子与外部变更订阅 */
  dispose: () => void;
}

/**
 * 把桌面壳的读写接进 store：
 *
 * 1. 启动时比较 localStorage 与桌面数据文件的 `savedAt`，谁新用谁：
 *    - 文件更新 → 灌进 localStorage 与 store（正常路径）
 *    - localStorage 更新（上次关窗时文件没写完 / 进程被强杀）→ 以本地为准并补写文件，避免旧数据覆盖新数据
 * 2. 之后每次落盘（300ms 防抖）都会同步到数据文件；
 *    关窗 / 卸载前的强制落盘（immediate）走同步 IPC，保证进程退出前写完
 * 3. 其他窗口（例如桌面小组件）写入时，本窗口静默应用，不产生回写回声
 *
 * Web / PWA 下不做事，仍由 localStorage 全文负责持久化。
 */
export async function initPersistence(): Promise<PersistenceSession> {
  const bridge = await resolveBridge();
  if (!bridge) return { bridge: null, dispose: () => {} };

  let remote: string | null = null;
  try {
    remote = await bridge.load();
  } catch (error) {
    console.error('[墨集] 读取桌面数据失败：', error);
  }

  // 先挂落盘钩子：即使远端读取失败，后续编辑也能落盘
  setPersistSink((payload, immediate) => {
    // 关窗/卸载前的强制落盘用同步写入：异步 IPC 会随窗口销毁而丢失，导致最后一次修改没了
    if (immediate && bridge.saveSync) {
      try {
        bridge.saveSync(payload);
        return;
      } catch (error) {
        console.error('[墨集] 同步写入桌面数据失败，退回异步写入：', error);
      }
    }
    void bridge.save(payload).catch((error) => {
      console.error('[墨集] 写入桌面数据失败：', error);
    });
  });

  const hydrate = (payload: string | null) => {
    if (!payload) return;
    const state = applyExternalPayload(payload);
    // replaceAll 内部会立刻落盘；这里抑制掉，避免把刚收到的外部数据再写回去
    if (state) runWithoutPersist(() => useAppStore.getState().replaceAll(state));
  };

  const local = readLocalPayload();
  const remoteAt = payloadSavedAt(remote);
  const localAt = payloadSavedAt(local);

  if (local && localAt > remoteAt) {
    // 本地比文件新：上次关窗时文件没写成功（或进程被强杀），以本地为准并补写文件
    console.warn('[墨集] 本地数据比数据文件新，已用本地数据恢复并回写文件');
    hydrate(local);
    if (bridge.saveSync) {
      try {
        bridge.saveSync(local);
      } catch (error) {
        console.error('[墨集] 回写数据文件失败：', error);
      }
    } else {
      void bridge.save(local).catch((error) => console.error('[墨集] 回写数据文件失败：', error));
    }
  } else if (remote) {
    hydrate(remote);
  } else {
    // 首次运行：把 localStorage 里的当前数据（含欢迎示例）写成初始数据文件
    const initial = serializeState(useAppStore.getState().snapshot());
    if (bridge.saveSync) {
      try {
        bridge.saveSync(initial);
      } catch (error) {
        console.error('[墨集] 初始化桌面数据文件失败：', error);
      }
    } else {
      void bridge.save(initial).catch((error) => console.error('[墨集] 初始化桌面数据文件失败：', error));
    }
  }

  const dispose = bridge.onChange(hydrate);

  // Tauri 的关窗是原生行为，beforeunload 不保证执行：壳会先发请求，让我们落盘后再关
  const disposeFlushRequest =
    bridge.onFlushRequest?.(() => {
      flushState();
      bridge.closeWindow();
    }) ?? null;

  return {
    bridge,
    dispose: () => {
      dispose();
      disposeFlushRequest?.();
      setPersistSink(null);
    },
  };
}
