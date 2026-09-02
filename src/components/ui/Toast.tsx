import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------- 类型定义 ---------- */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const iconMap: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4" strokeWidth={1.5} />,
  error: <AlertCircle className="w-4 h-4" strokeWidth={1.5} />,
  warning: <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />,
  info: <Info className="w-4 h-4" strokeWidth={1.5} />,
};

const typeStyles: Record<ToastType, string> = {
  success: 'bg-success text-white',
  error: 'bg-vermilion text-white',
  warning: 'bg-rattan text-ink-900',
  info: 'bg-ink-700 text-white dark:bg-ink-300 dark:text-ink-900',
};

/* ---------- Context ---------- */

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}

/* ---------- Provider ---------- */

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, type, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {/* Toast 容器：底部居中 */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] flex flex-col items-center gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={cn(
                'pointer-events-auto flex items-center gap-2.5 pl-3.5 pr-3 py-2.5 rounded-xl',
                'shadow-paper-lg dark:shadow-none text-sm font-medium tracking-wide',
                'animate-slide-up-fade',
                'backdrop-blur-md saturate-150',
                typeStyles[t.type]
              )}
            >
              {iconMap[t.type]}
              <span>{t.message}</span>
              <button
                onClick={() => dismiss(t.id)}
                className="ml-1 p-0.5 rounded-md hover:bg-white/20 dark:hover:bg-black/20 transition-colors"
                aria-label="关闭"
              >
                <X className="w-3.5 h-3.5" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}