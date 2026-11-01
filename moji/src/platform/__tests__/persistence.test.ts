import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAppStore } from '@/store';
import { flushState } from '@/utils/storage';
import { emptyState } from '@/test/fixtures';
import { initPersistence, type PersistenceSession } from '@/platform/persistence';
import type { MojiBridge } from '@/platform/bridge';

const STORAGE_KEY = 'moji-app-data';

/** 构造一个可断言、可主动触发外部变更的假 Electron 桥 */
function createFakeBridge(initialPayload: string | null) {
  let listener: ((payload: string | null) => void) | null = null;
  // 显式声明签名，便于断言调用参数（mock.calls[0][0] 为 payload 字符串）
  const save = vi.fn<(payload: string) => Promise<void>>(async () => {});

  const bridge: MojiBridge = {
    shell: 'electron',
    load: vi.fn(async () => initialPayload),
    save,
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
    emit: (payload: string | null) => listener?.(payload),
    hasListener: () => listener !== null,
  };
}

function payloadOf(state: unknown): string {
  return JSON.stringify({ version: 1, data: state });
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

    expect(fake.save).toHaveBeenCalledTimes(1);
    const saved = fake.save.mock.calls[0][0];
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

  it('本地编辑落盘后同步给桌面壳', async () => {
    const fake = createFakeBridge(payloadOf(emptyState()));
    window.mojiBridge = fake.bridge;

    session = await initPersistence();
    useAppStore.getState().addTodo({ title: '新加待办', priority: 'medium' });
    flushState();
    await flushPromises();

    expect(fake.save).toHaveBeenCalledTimes(1);
    expect(fake.save.mock.calls[0][0]).toContain('新加待办');
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
