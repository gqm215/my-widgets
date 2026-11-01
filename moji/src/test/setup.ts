import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { flushState } from '@/utils/storage';

/* =========================================================
   测试环境全局桩（jsdom 缺失能力补齐）
   ========================================================= */

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] ?? null;
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

/* =========================================================
   可控 matchMedia：测试里可用 setMediaQuery 调整视口/主题
   ========================================================= */

type MediaListener = (event: MediaQueryListEvent) => void;

const DEFAULT_MEDIA: Record<string, boolean> = {
  '(prefers-color-scheme: dark)': false,
  '(min-width: 768px)': true,
  '(min-width: 1024px)': true,
  '(min-width: 1280px)': true,
  '(display-mode: standalone)': false,
};

const mediaState = new Map<string, boolean>(Object.entries(DEFAULT_MEDIA));
const mediaListeners = new Map<string, Set<MediaListener>>();

/** 设置某个媒体查询的匹配结果，并通知已注册的监听器 */
export function setMediaQuery(query: string, matches: boolean): void {
  mediaState.set(query, matches);
  const listeners = mediaListeners.get(query);
  if (!listeners) return;
  const event = { matches, media: query } as MediaQueryListEvent;
  listeners.forEach((listener) => listener(event));
}

/** 重置所有媒体查询到默认值（桌面、浅色、非独立应用） */
export function resetMediaQueries(): void {
  mediaState.clear();
  Object.entries(DEFAULT_MEDIA).forEach(([query, matches]) => {
    mediaState.set(query, matches);
  });
}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => {
    const mql = {
      get matches() {
        return mediaState.get(query) ?? false;
      },
      media: query,
      onchange: null,
      addListener: (listener: MediaListener) => {
        if (!mediaListeners.has(query)) mediaListeners.set(query, new Set());
        mediaListeners.get(query)!.add(listener);
      },
      removeListener: (listener: MediaListener) => {
        mediaListeners.get(query)?.delete(listener);
      },
      addEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return;
        if (!mediaListeners.has(query)) mediaListeners.set(query, new Set());
        mediaListeners.get(query)!.add(listener);
      },
      removeEventListener: (type: string, listener: MediaListener) => {
        if (type !== 'change') return;
        mediaListeners.get(query)?.delete(listener);
      },
      dispatchEvent: () => false,
    };
    return mql as unknown as MediaQueryList;
  },
});

/* =========================================================
   ResizeObserver（笔记虚拟列表依赖）
   ========================================================= */

class ResizeObserverMock {
  private readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
  }

  observe(target: Element): void {
    const rect = { width: 320, height: 600, top: 0, left: 0, bottom: 600, right: 320, x: 0, y: 0 };
    this.callback(
      [{ target, contentRect: rect, borderBoxSize: [], contentBoxSize: [], devicePixelContentBoxSize: [] } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }

  unobserve(): void {}

  disconnect(): void {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  writable: true,
  value: ResizeObserverMock,
});

/* =========================================================
   浏览器 API 桩：下载/滚动/动画帧
   ========================================================= */

if (typeof URL.createObjectURL !== 'function') {
  Object.defineProperty(URL, 'createObjectURL', {
    writable: true,
    value: vi.fn(() => 'blob:mock-url'),
  });
}
if (typeof URL.revokeObjectURL !== 'function') {
  Object.defineProperty(URL, 'revokeObjectURL', {
    writable: true,
    value: vi.fn(),
  });
}

if (typeof window.scrollTo !== 'function') {
  Object.defineProperty(window, 'scrollTo', { writable: true, value: vi.fn() });
}
if (typeof Element.prototype.scrollTo !== 'function') {
  Object.defineProperty(Element.prototype, 'scrollTo', { writable: true, value: vi.fn() });
}
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Object.defineProperty(Element.prototype, 'scrollIntoView', { writable: true, value: vi.fn() });
}

if (typeof globalThis.requestAnimationFrame !== 'function') {
  Object.defineProperty(globalThis, 'requestAnimationFrame', {
    writable: true,
    value: (callback: FrameRequestCallback) =>
      setTimeout(() => callback(Date.now()), 16) as unknown as number,
  });
  Object.defineProperty(globalThis, 'cancelAnimationFrame', {
    writable: true,
    value: (handle: number) => clearTimeout(handle),
  });
}

/* =========================================================
   每个用例后的清理：定时器 / mock / 存储
   先 flush 防抖写入以取消挂起定时器，避免污染后续用例
   ========================================================= */

afterEach(() => {
  try {
    flushState();
  } catch {
    // 忽略清理阶段的异常
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
  localStorage.clear();
  resetMediaQueries();
});
