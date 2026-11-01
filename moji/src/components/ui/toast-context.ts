import { createContext, useContext } from 'react';

/* ---------- 类型定义 ---------- */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

/* ---------- Context ---------- */

export const ToastContext = createContext<ToastContextValue | null>(null);

/** 在 ToastProvider 内部获取 toast 方法；越界使用直接抛错，便于尽早暴露问题 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
