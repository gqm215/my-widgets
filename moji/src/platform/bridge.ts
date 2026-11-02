/**
 * 桌面壳（Electron / Tauri）与 Web 之间的统一桥接契约。
 *
 * - Electron：由 `electron/preload.cjs` 通过 contextBridge 注入 `window.mojiBridge`
 * - Tauri：由 `./tauri` 在运行时用 `@tauri-apps/api` 包装成同样的形状
 * - Web / PWA：没有桥，数据仍然走 localStorage
 */

export type ShellKind = 'web' | 'electron' | 'tauri';
export type DesktopShell = Exclude<ShellKind, 'web'>;

export interface MojiBridge {
  readonly shell: DesktopShell;
  /** 读取持久化数据（原始 JSON 文本）；没有数据返回 null */
  load(): Promise<string | null>;
  /** 保存原始 JSON 文本（调用方已完成 300ms 防抖） */
  save(payload: string): Promise<void>;
  /**
   * 同步保存：只在「窗口关闭 / 页面卸载前」调用。
   * Electron 用 sendSync 实现，保证进程退出前文件已经写完——异步 IPC 会随窗口销毁而丢。
   * 没有同步能力的壳可以不实现，调用方会退回异步 save。
   */
  saveSync?(payload: string): void;
  /** 订阅其他窗口的写入；返回取消订阅函数 */
  onChange(listener: (payload: string | null) => void): () => void;
  /**
   * 需要在关窗前先落盘时由壳触发（Tauri 的窗口关闭是原生行为，不一定会执行 beforeunload）。
   * 回调里应当 flushState() 后再 closeWindow()。返回取消订阅函数。
   */
  onFlushRequest?(listener: () => void): () => void;
  /** 关闭当前窗口（桌面小组件的关闭按钮） */
  closeWindow(): void;
  /** 主窗口：显示 / 隐藏桌面小组件窗口 */
  toggleWidget(): void;
}

declare global {
  interface Window {
    /** Electron preload / Tauri 适配层写入的桥接实例 */
    mojiBridge?: MojiBridge;
    /** Tauri 运行时注入的内部对象，仅用于探测环境 */
    __TAURI_INTERNALS__?: unknown;
  }
}

/** 同步探测当前运行环境 */
export function detectShell(): ShellKind {
  if (typeof window === 'undefined') return 'web';
  if (window.mojiBridge) return window.mojiBridge.shell;
  if (window.__TAURI_INTERNALS__) return 'tauri';
  return 'web';
}

/** 同步取已就绪的桥（UI 分支用；Web 下恒为 null） */
export function getBridge(): MojiBridge | null {
  if (typeof window === 'undefined') return null;
  return window.mojiBridge ?? null;
}

/**
 * 解析并初始化桥：
 * - Electron 直接用 preload 注入的实例；
 * - Tauri 用 JS 适配层创建，并缓存回 `window.mojiBridge`，让 `getBridge()` 之后也能同步命中；
 * - Web / PWA 返回 null。
 */
export async function resolveBridge(): Promise<MojiBridge | null> {
  if (typeof window === 'undefined') return null;
  if (window.mojiBridge) return window.mojiBridge;
  if (!window.__TAURI_INTERNALS__) return null;

  const { createTauriBridge } = await import('./tauri');
  const bridge = await createTauriBridge();
  window.mojiBridge = bridge;
  return bridge;
}
