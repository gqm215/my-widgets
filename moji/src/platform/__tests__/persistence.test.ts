import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '@/store';
import { flushState, payloadSavedAt, readLocalPayload, serializeState } from '@/utils/storage';
import { emptyState } from '@/test/fixtures';
import { initPersistence, type PersistenceSession } from '@/platform/persistence';
import type { MojiBridge } from '@/platform/bridge';

const STORAGE_KEY = 'moji-app-data';

/** 构造一个可断言、可主动触发外部变更的假 Electron 桥 */
function createFakeBridge(initialPayload: string | null) {
  let listener: ((payload: string | null) => void) | null = null;
  // 显式声明签名，便于断言调用参数（mock.calls[0][0] 为 payload 字符串）
  const save = vi.fn<(payload: string) => Promise<void>>(async () => {});
  const saveSync = vi.fn<(payload: string) => void>();

  const bridge: MojiBridge = {
    shell: 'electron',
    load: vi.fn(async () => initialPayload),
    save,
    saveSync,
    onChange: vi.fn((cb) => {
      listener = cb;
      return () => {
        listener = null;
      };
    }),
    closeWindow: vi.fn(),
    toggleWidget: vi.fn(),
  };

  return {
    bridge,
    save,
    saveSync,
    closeWindow: bridge.closeWindow as ReturnType<typeof vi.fn>,
    emit: (payload: string | null) => listener?.(payload),
    hasListener: () => listener !== null,
  };
}

function payloadOf(state: unknown, savedAt?: number): string {
  return JSON.stringify({ version: 1, ...(savedAt === undefined ? {} : { savedAt }), data: state });
}

/** 等待已被 `void` 掉的异步保存落地 */
function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

let session: PersistenceSession | null = null;

beforeEach(() => {
  localStorage.clear();
  useAppStore.setState(emptyState());
});

afterEach(() => {
  session?.dispose();
  session = null;
  delete window.mojiBridge;
  localStorage.clear();
});

describe('initPersistence', () => {
  it('Web 环境不接管持久化', async () => {
    session = await initPersistence();
    expect(session.bridge).toBeNull();
  });

  it('首次运行把当前数据写成桌面数据文件', async () => {
    const fake = createFakeBridge(null);
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    await flushPromises();

    // 有同步能力时初始化也用同步写，避免首次启动就丢
    expect(fake.saveSync).toHaveBeenCalledTimes(1);
    const saved = fake.saveSync.mock.calls[0][0];
    expect(JSON.parse(saved)).toMatchObject({ version: 1, data: { notes: [], todos: [] } });
  });

  it('远端有数据时以数据文件为准灌入 store 与 localStorage', async () => {
    const remote = payloadOf({
      ...emptyState(),
      todos: [
        {
          id: 'todo-remote',
          title: '来自数据文件',
          priority: 'high',
          completed: false,
          createdAt: '2025-06-02T09:00:00.000Z',
        },
      ],
    });
    const fake = createFakeBridge(remote);
    window.mojiBridge = fake.bridge;

    session = await initPersistence();

    expect(useAppStore.getState().todos).toHaveLength(1);
    expect(useAppStore.getState().todos[0].title).toBe('来自数据文件');
    expect(localStorage.getItem(STORAGE_KEY)).toContain('来自数据文件');
    // 灌入过程不应回写数据文件
    await flushPromises();
    expect(fake.save).not.toHaveBeenCalled();
  });

  it('本地编辑后 flushState 会同步写入桌面壳', async () => {
    const fake = createFakeBridge(payloadOf(emptyState(), 1));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    useAppStore.getState().addTodo({ title: '新加待办', priority: 'medium' });
    flushState();
    await flushPromises();

    expect(fake.saveSync).toHaveBeenCalledTimes(1);
    expect(fake.saveSync.mock.calls[0][0]).toContain('新加待办');
  });

  it('收到其他窗口的写入时静默应用，不回写形成回声', async () => {
    const fake = createFakeBridge(payloadOf(emptyState()));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    fake.emit(
      payloadOf({
        ...emptyState(),
        memos: [
          {
            id: 'memo-widget',
            content: '小组件写入的备忘',
            createdAt: '2025-06-02T09:00:00.000Z',
          },
        ],
      }),
    );
    await flushPromises();

    expect(useAppStore.getState().memos[0].content).toBe('小组件写入的备忘');
    expect(fake.save).not.toHaveBeenCalled();
    expect(localStorage.getItem(STORAGE_KEY)).toContain('小组件写入的备忘');
  });

  it('非法外部载荷被忽略，现有数据保持不变', async () => {
    const fake = createFakeBridge(payloadOf(emptyState()));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    fake.emit('{"data":{"notes":"不是数组"}}');

    expect(useAppStore.getState().notes).toEqual([]);
    expect(useAppStore.getState().todos).toEqual([]);
  });

  it('dispose 之后解除落盘钩子与订阅', async () => {
    const fake = createFakeBridge(payloadOf(emptyState()));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    expect(fake.hasListener()).toBe(true);

    session.dispose();
    session = null;

    useAppStore.getState().addTodo({ title: 'dispose 之后', priority: 'low' });
    flushState();
    await flushPromises();

    expect(fake.hasListener()).toBe(false);
    expect(fake.save).not.toHaveBeenCalled();
  });
});

/**
 * 数据不丢的回归测试。
 *
 * 线上问题：改完内容立刻关窗，重启后修改丢失。根因是关窗时的 flush 走了异步 IPC，
 * 进程先退出、文件没写完；而启动时又无条件以「旧的数据文件」为准，把 localStorage 里的新数据覆盖掉。
 */
describe('数据持久化可靠性', () => {
  it('关窗前的强制落盘走同步保存，不再走异步 save', async () => {
    const fake = createFakeBridge(payloadOf(emptyState(), 1));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    useAppStore.getState().addTodo({ title: '改完立刻关窗', priority: 'high' });
    flushState(); // 等价于 beforeunload 里的 flushState
    await flushPromises();

    expect(fake.saveSync).toHaveBeenCalledTimes(1);
    expect(fake.saveSync.mock.calls[0][0]).toContain('改完立刻关窗');
    // 同步路径已经写盘，不应再走异步路径
    expect(fake.save).not.toHaveBeenCalled();
  });

  it('防抖写入（非强制）仍然走异步 save', async () => {
    const fake = createFakeBridge(payloadOf(emptyState(), 1));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    useAppStore.getState().addTodo({ title: '普通防抖写入', priority: 'low' });
    // 等防抖窗口过去
    await new Promise((resolve) => setTimeout(resolve, 400));
    await flushPromises();

    expect(fake.save).toHaveBeenCalledTimes(1);
    expect(fake.saveSync).not.toHaveBeenCalled();
  });

  it('本地数据比数据文件新时以本地为准，并回写数据文件', async () => {
    // 模拟：上次关窗时文件没写完（文件 savedAt=1000），localStorage 里是更新的数据（savedAt=2000）
    const remote = payloadOf(
      {
        ...emptyState(),
        todos: [
          { id: 'todo-old', title: '旧数据文件', priority: 'low', completed: false, createdAt: '2025-06-02T09:00:00.000Z' },
        ],
      },
      1000,
    );
    const local = payloadOf(
      {
        ...emptyState(),
        todos: [
          { id: 'todo-new', title: '本地新数据', priority: 'high', completed: false, createdAt: '2025-06-02T09:00:00.000Z' },
        ],
      },
      2000,
    );
    localStorage.setItem(STORAGE_KEY, local);

    const fake = createFakeBridge(remote);
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    await flushPromises();

    // store 用的是本地新数据，而不是旧文件
    expect(useAppStore.getState().todos).toHaveLength(1);
    expect(useAppStore.getState().todos[0].title).toBe('本地新数据');
    // 并把新数据同步回文件
    expect(fake.saveSync).toHaveBeenCalledTimes(1);
    expect(fake.saveSync.mock.calls[0][0]).toContain('本地新数据');
  });

  it('数据文件更新时仍以文件为准（不会反过来被本地覆盖）', async () => {
    const remote = payloadOf(
      {
        ...emptyState(),
        todos: [
          { id: 'todo-file', title: '文件里的新数据', priority: 'high', completed: false, createdAt: '2025-06-02T09:00:00.000Z' },
        ],
      },
      2000,
    );
    const local = payloadOf(emptyState(), 1000);
    localStorage.setItem(STORAGE_KEY, local);

    const fake = createFakeBridge(remote);
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    await flushPromises();

    expect(useAppStore.getState().todos[0].title).toBe('文件里的新数据');
    expect(fake.save).not.toHaveBeenCalled();
    expect(fake.saveSync).not.toHaveBeenCalled();
  });

  it('旧格式载荷（没有 savedAt）仍以数据文件为准', async () => {
    const remote = payloadOf({
      ...emptyState(),
      memos: [{ id: 'memo-legacy', content: '旧格式数据', createdAt: '2025-06-02T09:00:00.000Z' }],
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: emptyState() }));

    const fake = createFakeBridge(remote);
    window.mojiBridge = fake.bridge;

    session = await initPersistence();

    expect(useAppStore.getState().memos[0].content).toBe('旧格式数据');
  });

  it('壳请求关窗前落盘时：先同步写盘，再关窗', async () => {
    const fake = createFakeBridge(payloadOf(emptyState(), 1));
    let flushListener: (() => void) | null = null;
    fake.bridge.onFlushRequest = vi.fn((cb: () => void) => {
      flushListener = cb;
      return () => {
        flushListener = null;
      };
    });
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    useAppStore.getState().addTodo({ title: '关窗前落盘', priority: 'high' });

    // 模拟 Tauri 拦截 CloseRequested 后发出的落盘请求
    expect(flushListener).not.toBeNull();
    flushListener!();
    await flushPromises();

    expect(fake.saveSync).toHaveBeenCalledTimes(1);
    expect(fake.saveSync.mock.calls[0][0]).toContain('关窗前落盘');
    expect(fake.closeWindow).toHaveBeenCalledTimes(1);
  });
});

describe('持久化载荷', () => {
  it('serializeState 会写入 savedAt 时间戳', () => {
    const payload = serializeState(emptyState(), 1234);
    expect(JSON.parse(payload)).toMatchObject({ version: 1, savedAt: 1234 });
    expect(payloadSavedAt(payload)).toBe(1234);
  });

  it('payloadSavedAt 对旧格式 / 坏 JSON 返回 0', () => {
    expect(payloadSavedAt(JSON.stringify({ version: 1, data: emptyState() }))).toBe(0);
    expect(payloadSavedAt('不是 json')).toBe(0);
    expect(payloadSavedAt(null)).toBe(0);
    expect(payloadSavedAt('{}')).toBe(0);
  });

  it('readLocalPayload 直接返回 localStorage 原文', () => {
    localStorage.setItem(STORAGE_KEY, '{"version":1}');
    expect(readLocalPayload()).toBe('{"version":1}');
  });
});
