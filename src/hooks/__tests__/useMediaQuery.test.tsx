import { describe, it, expect, vi, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { setMediaQuery } from '@/test/setup';

const originalMatchMedia = window.matchMedia;

afterEach(() => {
  window.matchMedia = originalMatchMedia;
});

describe('useMediaQuery', () => {
  it('初始值来自 window.matchMedia(query).matches', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);
  });

  it('查询不匹配时返回 false', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 9999px)'));
    expect(result.current).toBe(false);
  });

  it('媒体查询变化时更新返回值', () => {
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(true);

    act(() => {
      setMediaQuery('(min-width: 1024px)', false);
    });
    expect(result.current).toBe(false);

    act(() => {
      setMediaQuery('(min-width: 1024px)', true);
    });
    expect(result.current).toBe(true);
  });

  it('query 变化时重新订阅并忽略旧查询', () => {
    const { result, rerender } = renderHook(({ query }: { query: string }) => useMediaQuery(query), {
      initialProps: { query: '(min-width: 1024px)' },
    });
    expect(result.current).toBe(true);

    rerender({ query: '(min-width: 768px)' });
    expect(result.current).toBe(true);

    act(() => {
      setMediaQuery('(min-width: 768px)', false);
    });
    expect(result.current).toBe(false);

    // 旧查询的变化不再影响结果
    act(() => {
      setMediaQuery('(min-width: 1024px)', false);
    });
    expect(result.current).toBe(false);
  });

  it('卸载时移除 change 监听', () => {
    const listeners = new Set<(event: MediaQueryListEvent) => void>();
    const removeEventListener = vi.fn((_type: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.delete(listener);
    });
    const mediaQueryList = {
      matches: true,
      media: '(min-width: 900px)',
      onchange: null,
      addEventListener: (_type: string, listener: (event: MediaQueryListEvent) => void) => {
        listeners.add(listener);
      },
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn(() => mediaQueryList) as unknown as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 900px)'));
    expect(result.current).toBe(true);
    expect(window.matchMedia).toHaveBeenCalledWith('(min-width: 900px)');

    act(() => {
      listeners.forEach((listener) => listener({ matches: false } as MediaQueryListEvent));
    });
    expect(result.current).toBe(false);

    unmount();
    expect(removeEventListener).toHaveBeenCalledTimes(1);
    expect(listeners.size).toBe(0);
  });

  it('不支持 addEventListener 时回退到 addListener', () => {
    const addListener = vi.fn();
    const removeListener = vi.fn();
    const mediaQueryList = {
      matches: true,
      media: '(min-width: 600px)',
      onchange: null,
      addListener,
      removeListener,
      dispatchEvent: vi.fn(),
    };
    window.matchMedia = vi.fn(() => mediaQueryList) as unknown as typeof window.matchMedia;

    const { result, unmount } = renderHook(() => useMediaQuery('(min-width: 600px)'));
    expect(result.current).toBe(true);
    expect(addListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('没有 window.matchMedia 时安全返回 false', () => {
    window.matchMedia = undefined as unknown as typeof window.matchMedia;
    const { result } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    expect(result.current).toBe(false);
  });
});
