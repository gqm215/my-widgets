import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const variants = {
  primary:
    'bg-vermilion hover:bg-vermilion-light text-white shadow-sm hover:shadow-glow-vermilion',
  secondary:
    'bg-ink-700 hover:bg-ink-900 text-white shadow-sm',
  ghost:
    'text-ink-600 hover:bg-paper-dark/70 dark:text-ink-300 dark:hover:bg-ink-700/70',
  danger:
    'bg-vermilion hover:bg-vermilion-light text-white shadow-sm hover:shadow-glow-vermilion',
  outline:
    'border border-paper-dark dark:border-ink-600 text-ink-700 dark:text-ink-200 hover:bg-paper-dark/60 dark:hover:bg-ink-700/60 hover:border-ink-300 dark:hover:border-ink-500',
} as const;

const sizes = {
  sm: 'px-3 py-1.5 text-sm rounded-md gap-1.5',
  md: 'px-4 py-2 rounded-md gap-2',
  lg: 'px-6 py-3 text-lg rounded-lg gap-2',
} as const;

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  children: ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      data-variant={variant}
      className={cn(
        'inline-flex items-center justify-center font-medium tracking-wide',
        'transition-all duration-200 ease-zen',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40 focus-visible:ring-offset-1',
        'active:scale-[0.97] active:transition-transform active:duration-100',
        'disabled:opacity-60 disabled:shadow-none disabled:cursor-not-allowed disabled:active:scale-100',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
