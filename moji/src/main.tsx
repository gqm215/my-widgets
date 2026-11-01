import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { ThemeProvider } from '@/hooks/useTheme';
import { ToastProvider } from '@/components/ui/Toast';
import { PWARegister } from '@/components/PWARegister';
import { flushState } from '@/utils/storage';
import { initPersistence } from '@/platform/persistence';

// 页面隐藏 / 关闭前立即落盘，避免丢失防抖窗口内（≤300ms）的最后一次修改
const flushPersistedState = () => {
  flushState();
};
window.addEventListener('beforeunload', flushPersistedState);
window.addEventListener('pagehide', flushPersistedState);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') flushState();
});

/** 桌面小组件窗口：URL 带 ?window=widget，只渲染紧凑视图 */
const isWidgetWindow = new URLSearchParams(window.location.search).get('window') === 'widget';
if (isWidgetWindow) {
  // 小组件窗口是透明无边框的，去掉页面底色（见 index.css 的 .moji-widget 规则）
  document.documentElement.classList.add('moji-widget');
}

/**
 * 启动流程：先把桌面壳的数据文件接进 store，**再**动态加载 UI。
 *
 * 顺序很重要：store 在模块求值时就会 `loadState()`，所以要等
 * `initPersistence()` 把远端数据灌进 localStorage 之后才 import App。
 */
async function bootstrap() {
  const { bridge } = await initPersistence();
  const container = document.getElementById('root');
  if (!container) throw new Error('找不到 #root 挂载点');

  const root = createRoot(container);

  if (isWidgetWindow) {
    const { WidgetApp } = await import('./widget/WidgetApp');
    root.render(
      <StrictMode>
        <ThemeProvider>
          <ToastProvider>
            <WidgetApp bridge={bridge} />
          </ToastProvider>
        </ThemeProvider>
      </StrictMode>,
    );
    return;
  }

  const { default: App } = await import('./App');
  root.render(
    <StrictMode>
      <ThemeProvider>
        <ToastProvider>
          <App />
          {/* PWA 只在浏览器里注册：桌面壳不是 secure context，注册会静默失败 */}
          {!bridge && <PWARegister />}
        </ToastProvider>
      </ThemeProvider>
    </StrictMode>,
  );
}

void bootstrap();
