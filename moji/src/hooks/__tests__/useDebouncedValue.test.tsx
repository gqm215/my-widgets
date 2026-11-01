import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedValue', () => {
  it('首帧立即返回当前值', () => {
    const { result } = renderHook(() => useDebouncedValue('墨', 100));
    expect(result.current).toBe('墨');
  });

  it('延迟结束前保持旧值，结束后更新', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(99);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('ab');
  });

  it('延迟内连续变化只输出最后一次', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 120), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    act(() => {
      vi.advanceTimersByTime(40);
    });
    rerender({ value: 'abc' });
    act(() => {
      vi.advanceTimersByTime(40);
    });
    rerender({ value: 'abcd' });

    act(() => {
      vi.advanceTimersByTime(119);
    });
    expect(result.current).toBe('a');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('abcd');
  });

  it('默认延迟为 150ms', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }: { value: string }) => useDebouncedValue(value), {
      initialProps: { value: 'old' },
    });

    rerender({ value: 'new' });
    act(() => {
      vi.advanceTimersByTime(149);
    });
    expect(result.current).toBe('old');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current).toBe('new');
  });

  it('卸载时清理未触发的定时器', () => {
    vi.useFakeTimers();
    const { rerender, unmount } = renderHook(({ value }: { value: string }) => useDebouncedValue(value, 100), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'ab' });
    expect(vi.getTimerCount()).toBeGreaterThan(0);

    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('支持非字符串值', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }: { value: number }) => useDebouncedValue(value, 50), {
      initialProps: { value: 1 },
    });

    rerender({ value: 2 });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(result.current).toBe(2);
  });
});
