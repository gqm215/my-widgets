import { type ReactNode, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div
        data-testid="modal-content"
        className={cn(
          'relative bg-white dark:bg-ink-800 rounded-2xl shadow-paper-xl dark:shadow-none',
          'border border-black/[0.04] dark:border-white/[0.06]',
          'p-6 w-full max-w-md',
          'animate-scale-in',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-wide">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-all duration-200 hover:rotate-90"
              aria-label="关闭"
            >
              <X className="w-5 h-5 text-ink-400 dark:text-ink-300" strokeWidth={1.5} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
