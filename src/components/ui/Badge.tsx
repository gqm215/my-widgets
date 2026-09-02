import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variantStyles = {
  default:
    'bg-ink-100/80 dark:bg-ink-700/70 text-ink-700 dark:text-ink-200 ring-1 ring-inset ring-black/[0.04] dark:ring-white/[0.06]',
  vermilion:
    'bg-vermilion/10 text-vermilion dark:bg-vermilion/20 dark:text-vermilion-light ring-1 ring-inset ring-vermilion/20 dark:ring-vermilion/30',
  rattan:
    'bg-rattan/10 text-rattan dark:bg-rattan/20 dark:text-rattan-light ring-1 ring-inset ring-rattan/25 dark:ring-rattan/30',
  success:
    'bg-success/10 text-success dark:bg-success/20 dark:text-success ring-1 ring-inset ring-success/25 dark:ring-success/35',
  ink: 'bg-ink-700 text-white dark:bg-ink-300 dark:text-ink-900',
} as const;

export interface BadgeProps {
  variant?: keyof typeof variantStyles;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium tracking-wide rounded-full',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}