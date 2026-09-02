import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  scene?: boolean;
  className?: string;
}

export function EmptyState({ icon, title, description, action, scene, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 text-center animate-fade-in',
        className
      )}
    >
      {scene ? (
        <div className="mb-6 relative">
          <img
            src="./scenes/empty-mountain.svg"
            alt=""
            className="w-44 h-44 object-cover rounded-full opacity-90 dark:opacity-70 dark:grayscale dark:brightness-75 shadow-paper-lg dark:shadow-none"
            loading="lazy"
          />
          <div className="absolute inset-0 rounded-full ring-1 ring-black/[0.04] dark:ring-white/[0.05] pointer-events-none" />
        </div>
      ) : icon ? (
        <div className="mb-6">{icon}</div>
      ) : (
        <div className="mb-6">
          <svg
            viewBox="0 0 80 80"
            className="w-16 h-16"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.8"
          >
            <circle cx="40" cy="40" r="36" className="text-ink-200 dark:text-ink-700" />
            <circle
              cx="40"
              cy="40"
              r="28"
              className="text-ink-300 dark:text-ink-600"
              strokeDasharray="4 6"
              strokeWidth="0.6"
            />
            <circle cx="40" cy="40" r="4" className="text-vermilion/60" fill="currentColor" />
          </svg>
        </div>
      )}

      <h3 className="text-ink-700 dark:text-ink-200 text-lg font-serif font-medium mb-2 tracking-wider">
        {title}
      </h3>

      {description && (
        <p className="text-ink-400 dark:text-ink-400 text-sm max-w-xs leading-relaxed mb-2">
          {description}
        </p>
      )}

      <div className="brush-divider w-12 my-5" aria-hidden />

      {action && <div>{action}</div>}
    </div>
  );
}
