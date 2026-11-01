import { useAppStore } from '@/store';
import {
  applyExternalPayload,
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
 * 1. 启动时优先读桌面数据文件，灌进 localStorage 与 store（文件是唯一真相）；
 * 2. 之后本地每次落盘（store 的 300ms 防抖）都会同步写入桌面数据文件；
 * 3. 其他窗口（例如桌面小组件）写入时，本窗口静默应用，不产生回写回声。
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
  setPersistSink((payload) => {
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

  if (remote) {
    hydrate(remote);
  } else {
    // 首次运行：把 localStorage 里的当前数据（含欢迎示例）写成初始数据文件
    void bridge
      .save(serializeState(useAppStore.getState().snapshot()))
      .catch((error) => console.error('[墨集] 初始化桌面数据文件失败：', error));
  }

  const dispose = bridge.onChange(hydrate);

  return {
    bridge,
    dispose: () => {
      dispose();
      setPersistSink(null);
    },
  };
}
