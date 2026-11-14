import { Info, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import type { Todo } from '@/types';

export interface TaskDetailProps {
  todo: Todo;
  /** 窄屏抽屉模式提供关闭按钮 */
  onClose?: () => void;
}

/**
 * 详情栏占位（B2-T1）：本卡只出空态占位，编辑/日期/优先级/子任务/放弃
 * 等完整详情能力由 B2-T2 的 TaskDetail 接管并同步 ?task= 参数（D9）。
 */
export function TaskDetail({ todo, onClose }: TaskDetailProps) {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-dark/60 dark:border-ink-700/60">
        <span className="text-sm font-serif font-medium text-ink-700 dark:text-ink-200">
          任务详情
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
            className="p-1.5 rounded-md text-ink-400 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <EmptyState
          icon={<Info className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
          title="选中任务查看详情"
          description={`已选中「${todo.title}」。标题、描述、日期、优先级与子任务的编辑将在后续版本提供。`}
        />
      </div>
    </div>
  );
}
