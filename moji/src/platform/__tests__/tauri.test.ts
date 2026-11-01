import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  listen: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke }));
vi.mock('@tauri-apps/api/event', () => ({ listen: mocks.listen }));

import { createTauriBridge } from '@/platform/tauri';

/** 让 `void invoke(...)` / `listen(...).then(...)` 之类的微任务落地 */
function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

beforeEach(() => {
  mocks.invoke.mockReset();
  mocks.listen.mockReset();
});

describe('createTauriBridge', () => {
  it('标记 shell 为 tauri，load 透传 moji_load 的返回', async () => {
    mocks.invoke.mockResolvedValueOnce('{"version":1}');
    const bridge = await createTauriBridge();

    expect(bridge.shell).toBe('tauri');
    await expect(bridge.load()).resolves.toBe('{"version":1}');
    expect(mocks.invoke).toHaveBeenCalledWith('moji_load');
  });

  it('load 收到 null 时归一化为 null', async () => {
    mocks.invoke.mockResolvedValueOnce(null);
    const bridge = await createTauriBridge();
    await expect(bridge.load()).resolves.toBeNull();
  });

  it('save 用 payload 参数调用 moji_save', async () => {
    mocks.invoke.mockResolvedValue(undefined);
    const bridge = await createTauriBridge();

    await bridge.save('{"a":1}');
    expect(mocks.invoke).toHaveBeenCalledWith('moji_save', { payload: '{"a":1}' });
  });

  it('onChange 订阅 moji:changed、转发载荷，取消时退订', async () => {
    const unlisten = vi.fn();
    mocks.listen.mockResolvedValueOnce(unlisten);
    const bridge = await createTauriBridge();

    const listener = vi.fn();
    const off = bridge.onChange(listener);
    await flushMicrotasks();

    expect(mocks.listen).toHaveBeenCalledWith('moji:changed', expect.any(Function));
    mocks.listen.mock.calls[0][1]({ payload: '{"b":2}' });
    expect(listener).toHaveBeenCalledWith('{"b":2}');

    off();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('订阅尚未完成就取消时，等 listen 落地后立即退订', async () => {
    const unlisten = vi.fn();
    let releaseListen: (fn: () => void) => void = () => {};
    mocks.listen.mockReturnValueOnce(
      new Promise<() => void>((resolve) => {
        releaseListen = resolve;
      }),
    );
    const bridge = await createTauriBridge();

    const off = bridge.onChange(vi.fn());
    off();
    expect(unlisten).not.toHaveBeenCalled();

    releaseListen(unlisten);
    await flushMicrotasks();
    expect(unlisten).toHaveBeenCalledTimes(1);
  });

  it('closeWindow / toggleWidget 调用对应命令，失败只记日志不抛出', async () => {
    mocks.invoke.mockRejectedValue(new Error('boom'));
    const bridge = await createTauriBridge();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => bridge.closeWindow()).not.toThrow();
    expect(() => bridge.toggleWidget()).not.toThrow();
    await flushMicrotasks();

    expect(mocks.invoke).toHaveBeenCalledWith('moji_close_window');
    expect(mocks.invoke).toHaveBeenCalledWith('moji_toggle_widget');
    expect(errorSpy).toHaveBeenCalledTimes(2);

    errorSpy.mockRestore();
  });
});
