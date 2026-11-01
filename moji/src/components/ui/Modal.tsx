import { type ReactNode, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
  /** 无 title 时的无障碍名称；有 title 时以 aria-labelledby 指向标题为准 */
  ariaLabel?: string;
}

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/* ---------- 背景滚动锁（模块级计数，支持嵌套 Modal） ---------- */

let scrollLockCount = 0;
let savedBodyOverflow = '';

function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (scrollLockCount === 0) savedBodyOverflow = document.body.style.overflow;
  scrollLockCount += 1;
  document.body.style.overflow = 'hidden';
}

function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  scrollLockCount = Math.max(0, scrollLockCount - 1);
  if (scrollLockCount === 0) document.body.style.overflow = savedBodyOverflow;
}

function getFocusableElements(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('hidden') && el.getAttribute('aria-hidden') !== 'true'
  );
}

export function Modal({ open, onClose, title, children, className, ariaLabel }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // 用 ref 持有最新 onClose，避免父级每次渲染都重跑焦点/滚动副作用
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  // 记录打开前的焦点元素：在 render 阶段捕获，避免被子元素 autoFocus 抢占
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  if (open && !wasOpenRef.current) {
    wasOpenRef.current = true;
    previouslyFocusedRef.current =
      typeof document !== 'undefined' && document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  } else if (!open && wasOpenRef.current) {
    wasOpenRef.current = false;
  }

  useEffect(() => {
    if (!open) return;

    const panel = panelRef.current;
    lockBodyScroll();

    // 初始聚焦：优先 data-autofocus / autofocus 元素（含 React autoFocus 已聚焦的情况），否则聚焦面板
    const autoFocusTarget =
      panel?.querySelector<HTMLElement>('[data-autofocus], [autofocus]') ??
      (document.activeElement instanceof HTMLElement && panel?.contains(document.activeElement)
        ? document.activeElement
        : null);
    if (autoFocusTarget) {
      autoFocusTarget.focus();
    } else {
      panel?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab') return;

      const panelEl = panelRef.current;
      if (!panelEl) return;

      const focusable = getFocusableElements(panelEl);
      if (focusable.length === 0) {
        event.preventDefault();
        panelEl.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      const inside = active instanceof HTMLElement && panelEl.contains(active);

      if (event.shiftKey) {
        // Shift+Tab 从首元素（或面板/外部）循环到末元素
        if (!inside || active === first || active === panelEl) {
          event.preventDefault();
          last.focus();
        }
      } else if (!inside || active === last || active === panelEl) {
        // Tab 从末元素（或面板/外部）循环到首元素
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      unlockBodyScroll();

      const target = previouslyFocusedRef.current;
      if (target && target.isConnected) {
        target.focus();
      }
    };
  }, [open]);

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
      aria-labelledby={title ? titleId : undefined}
      aria-label={!title ? ariaLabel : undefined}
    >
      <div
        ref={panelRef}
        data-testid="modal-content"
        tabIndex={-1}
        className={cn(
          'relative bg-white dark:bg-ink-800 rounded-2xl shadow-paper-xl dark:shadow-none',
          'border border-black/[0.04] dark:border-white/[0.06]',
          'p-6 w-full max-w-md',
          'animate-scale-in',
          'focus:outline-none',
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3
              id={titleId}
              className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 tracking-wide"
            >
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
