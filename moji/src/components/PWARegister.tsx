import { useEffect, useState, memo } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { DownloadCloud, X, RefreshCw } from 'lucide-react';

/** Chromium 的 beforeinstallprompt 事件（未进入 TS 标准 DOM 库） */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt: () => Promise<void>;
}

/** Safari/iOS 会把 standalone 标记挂在 navigator 上 */
interface NavigatorWithStandalone extends Navigator {
  readonly standalone?: boolean;
}

function PWARegisterImpl() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstall, setShowInstall] = useState(false);

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(url) {
      console.log('SW registered:', url);
    },
    onRegisterError(error) {
      console.error('SW registration failed', error);
    },
  });

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as NavigatorWithStandalone).standalone === true;
    if (isStandalone) return;

    const handler = (event: Event) => {
      const promptEvent = event as BeforeInstallPromptEvent;
      promptEvent.preventDefault();
      setDeferredPrompt(promptEvent);
      const dismissed = localStorage.getItem('moji_pwa_install_dismissed');
      if (!dismissed) setShowInstall(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstall(false);
      setDeferredPrompt(null);
    }
  };

  const dismissInstall = () => {
    setShowInstall(false);
    localStorage.setItem('moji_pwa_install_dismissed', '1');
  };

  const close = () => {
    setNeedRefresh(false);
    setOfflineReady(false);
  };

  const update = () => {
    updateServiceWorker(true);
  };

  const toastClass =
    'fixed left-1/2 -translate-x-1/2 z-[60] w-[min(92vw,420px)] animate-fade-in';

  if (needRefresh) {
    return (
      <div className={`${toastClass} bottom-6`}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-ink-800 shadow-paper dark:shadow-none border border-paper-dark dark:border-ink-700">
          <div className="flex-shrink-0 mt-0.5 text-rattan dark:text-rattan-light">
            <RefreshCw className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">发现新版本</p>
            <p className="text-xs text-ink-500 dark:text-ink-300 mt-0.5">
              刷新以应用最新版本
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={update}
              className="text-xs px-3 py-1.5 rounded-md bg-vermilion text-white hover:bg-vermilion/90 transition-colors"
            >
              更新
            </button>
            <button
              onClick={close}
              className="p-1 rounded text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (offlineReady) {
    return (
      <div className={`${toastClass} bottom-6`}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-ink-800 shadow-paper dark:shadow-none border border-paper-dark dark:border-ink-700">
          <div className="flex-shrink-0 mt-0.5 text-rattan dark:text-rattan-light">
            <DownloadCloud className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">已可离线使用</p>
            <p className="text-xs text-ink-500 dark:text-ink-300 mt-0.5">
              应用已缓存，断网也能访问
            </p>
          </div>
          <button
            onClick={close}
            className="p-1 rounded text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 transition-colors"
            aria-label="关闭"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    );
  }

  if (showInstall) {
    return (
      <div className={`${toastClass} bottom-6`}>
        <div className="flex items-start gap-3 p-4 rounded-lg bg-white dark:bg-ink-800 shadow-paper dark:shadow-none border border-paper-dark dark:border-ink-700">
          <div className="flex-shrink-0 mt-0.5 text-vermilion">
            <DownloadCloud className="w-5 h-5" strokeWidth={1.5} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-ink-900 dark:text-ink-100">安装墨集到桌面</p>
            <p className="text-xs text-ink-500 dark:text-ink-300 mt-0.5">
              添加到主屏幕，随时开启墨色纸韵的日程管理
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleInstall}
              className="text-xs px-3 py-1.5 rounded-md bg-vermilion text-white hover:bg-vermilion/90 transition-colors"
            >
              安装
            </button>
            <button
              onClick={dismissInstall}
              className="p-1 rounded text-ink-400 hover:text-ink-700 dark:hover:text-ink-100 transition-colors"
              aria-label="关闭"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

export const PWARegister = memo(PWARegisterImpl);
