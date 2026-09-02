import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    const inputId = id ?? label?.replace(/\s+/g, '-').toLowerCase();

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3.5 py-2 rounded-md border bg-white dark:bg-ink-800',
            'text-ink-900 dark:text-ink-100 placeholder-ink-300 dark:placeholder-ink-500',
            'transition-all duration-200 ease-zen',
            'focus:outline-none focus:ring-2 focus:ring-vermilion/15 focus:border-vermilion/60',
            'focus:shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]',
            'hover:border-ink-300 dark:hover:border-ink-500',
            error
              ? 'border-vermilion dark:border-vermilion'
              : 'border-paper-dark dark:border-ink-600',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-vermilion">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';