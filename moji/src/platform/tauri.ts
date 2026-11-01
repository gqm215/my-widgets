import type { MojiBridge } from './bridge';

/**
 * Tauri 侧桥接实现：把 Rust 命令与事件包装成与 Electron preload 完全一致的形状。
 *
 * 命令名必须与 `src-tauri/src/lib.rs` 里注册的一致：
 *   moji_load / moji_save / moji_close_window / moji_toggle_widget
 * 事件名：`moji:changed`
 *
 * 用动态 import，避免 Web / PWA 构建在缺少 Tauri 运行时的情况下加载失败。
 */
export async function createTauriBridge(): Promise<MojiBridge> {
  const [{ invoke }, { listen }] = await Promise.all([
    import('@tauri-apps/api/core'),
    import('@tauri-apps/api/event'),
  ]);

  return {
    shell: 'tauri',

    load: async () => {
      const payload = await invoke<string | null>('moji_load');
      return payload ?? null;
    },

    save: async (payload) => {
      await invoke('moji_save', { payload });
    },

    onChange: (listener) => {
      let disposed = false;
      let unlisten: (() => void) | null = null;

      void listen<string>('moji:changed', (event) => {
        listener(event.payload ?? null);
      }).then((fn) => {
        // 事件订阅是异步的，若在此期间已取消，立刻退订
        if (disposed) fn();
        else unlisten = fn;
      });

      return () => {
        disposed = true;
        unlisten?.();
        unlisten = null;
      };
    },

    closeWindow: () => {
      void invoke('moji_close_window').catch((error) => {
        console.error('[墨集] 关闭窗口失败：', error);
      });
    },

    toggleWidget: () => {
      void invoke('moji_toggle_widget').catch((error) => {
        console.error('[墨集] 切换桌面小组件失败：', error);
      });
    },
  };
}
