import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Accent = 'vermilion' | 'rattan' | 'success' | 'ink' | 'none';

const accentMap: Record<Accent, string> = {
  vermilion: 'text-vermilion',
  rattan: 'text-rattan',
  success: 'text-success',
  ink: 'text-ink-500 dark:text-ink-300',
  none: '',
};

export interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  hoverable?: boolean;
  accent?: Accent;
  padded?: boolean;
}

export function Card({
  title,
  children,
  className,
  hoverable = false,
  accent = 'none',
  padded = true,
}: CardProps) {
  return (
    <div
      className={cn(
        'relative bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none',
        'border border-black/[0.03] dark:border-white/[0.03]',
        'overflow-hidden',
        hoverable &&
          'lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] cursor-pointer',
        padded && 'p-6',
        className
      )}
    >
      {accent !== 'none' && (
        <span
          className={cn(
            'absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-current to-transparent opacity-80',
            accentMap[accent]
          )}
        />
      )}
      {title && (
        <h3 className="font-serif font-semibold text-ink-900 dark:text-ink-100 mb-3 tracking-wide">
          {title}
        </h3>
      )}
      {children}
    </div>
  );
}
