import { useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronRight, Flag, RotateCcw, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/utils/todoFilters';
import type { Todo } from '@/types';

export interface TaskRowProps {
  todo: Todo;
  /** 该任务的子任务（父行内嵌展示） */
  subtasks: Todo[];
  today: string;
  selected: boolean;
  onSelect: (id: string) => void;
  onDelete: (todo: Todo) => void;
  animationIndex?: number;
}

/**
 * 任务行（D4/D11）：勾选 + 标题 + 优先级小旗（高/中优，仅展示）+ 截止日期（逾期红色）+ 子任务折叠。
 * - completed 行可勾回进行中；abandoned 行用「恢复」替代勾选框（restoreTodo）
 * - 子任务仅一层，缩进展示在父行下方，删除按钮 hover 显
 * - 点击标题选中任务，交由详情栏（B2-T2 填内容）
 * - 行内优先级/日期为纯展示（B2-T3 打磨）：改优先级走详情栏，不提供行内直点
 */
export function TaskRow({
  todo,
  subtasks,
  today,
  selected,
  onSelect,
  onDelete,
  animationIndex = 0,
}: TaskRowProps) {
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const restoreTodo = useAppStore((s) => s.restoreTodo);
  const [subtasksOpen, setSubtasksOpen] = useState(false);

  const completed = todo.status === 'completed';
  const abandoned = todo.status === 'abandoned';
  const overdue = isOverdue(todo, today);
  const doneSubtasks = subtasks.filter((st) => st.status === 'completed').length;
  /** B2-T3 打磨：行内优先级小旗（仅高/中优展示，低/无优不添噪）；只展示，直点改优先级在详情栏 */
  const showPriorityFlag = todo.priority === 'high' || todo.priority === 'medium';

  return (
    <div
      data-testid={`todo-${todo.id}`}
      className={cn(
        'todo-item-enter group bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none',
        'px-4 py-3 md:px-5 transition-shadow duration-200 hover:shadow-paper-lg dark:hover:shadow-none',
        completed && 'todo-completed opacity-75',
        abandoned && 'opacity-60',
        selected && 'ring-1 ring-vermilion/50',
      )}
      style={{ animationDelay: `${animationIndex * 50}ms` }}
    >
      <div className="flex items-start gap-3">
        {abandoned ? (
          <button
            type="button"
            onClick={() => restoreTodo(todo.id)}
            aria-label={`恢复「${todo.title}」`}
            className="w-6 h-6 mt-0.5 rounded flex-shrink-0 flex items-center justify-center text-ink-400 dark:text-ink-300 hover:text-success hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" strokeWidth={1.5} />
          </button>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={completed}
            aria-label={`标记「${todo.title}」为${completed ? '未完成' : '已完成'}`}
            onClick={() => toggleTodo(todo.id)}
            className={cn(
              'w-6 h-6 mt-0.5 rounded border-2 flex-shrink-0 transition-colors duration-200 flex items-center justify-center',
              completed
                ? 'bg-success border-success'
                : todo.priority === 'high'
                  ? 'border-vermilion'
                  : todo.priority === 'medium'
                    ? 'border-rattan'
                    : 'border-ink-300 dark:border-ink-600',
            )}
          >
            {completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
          </button>
        )}

        <div className="flex-1 min-w-0">
          <button
            type="button"
            onClick={() => onSelect(todo.id)}
            className="block w-full text-left rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-vermilion/40"
          >
            <span
              className={cn(
                'todo-text block font-medium',
                completed || abandoned
                  ? 'text-ink-300 dark:text-ink-600'
                  : 'text-ink-900 dark:text-ink-100',
              )}
            >
              {todo.title}
            </span>
          </button>

          {(showPriorityFlag || todo.dueDate || subtasks.length > 0) && (
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              {showPriorityFlag && (
                <span className="flex items-center">
                  <Flag
                    aria-hidden="true"
                    strokeWidth={2}
                    className={cn(
                      'w-3 h-3',
                      todo.priority === 'high' ? 'text-vermilion' : 'text-rattan'
                    )}
                  />
                  <span className="sr-only">
                    {todo.priority === 'high' ? '高优先级' : '中优先级'}
                  </span>
                </span>
              )}
              {todo.dueDate && (
                <span
                  className={cn(
                    'flex items-center gap-1 text-xs',
                    overdue ? 'text-vermilion font-medium' : 'text-ink-400 dark:text-ink-300',
                  )}
                >
                  <CalendarDays aria-hidden="true" strokeWidth={1.5} className="w-3 h-3" />
                  截止 {todo.dueDate}
                </span>
              )}
              {subtasks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSubtasksOpen((v) => !v)}
                  aria-expanded={subtasksOpen}
                  className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100 transition-colors"
                >
                  {subtasksOpen ? (
                    <ChevronDown className="w-3.5 h-3.5" strokeWidth={1.5} />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                  )}
                  <span>
                    子任务 {doneSubtasks}/{subtasks.length}
                  </span>
                </button>
              )}
            </div>
          )}

          {subtasksOpen && subtasks.length > 0 && (
            <ul className="mt-2 ml-1 pl-2 space-y-1.5 border-l border-paper-dark dark:border-ink-600">
              {subtasks.map((st) => {
                const stCompleted = st.status === 'completed';
                return (
                  <li
                    key={st.id}
                    data-testid={`subtask-${st.id}`}
                    className="group/sub flex items-center gap-2"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={stCompleted}
                      aria-label={`标记「${st.title}」为${stCompleted ? '未完成' : '已完成'}`}
                      onClick={() => toggleTodo(st.id)}
                      className={cn(
                        'w-5 h-5 rounded border-2 flex-shrink-0 transition-colors duration-200 flex items-center justify-center',
                        stCompleted
                          ? 'bg-success border-success'
                          : 'border-ink-300 dark:border-ink-600',
                      )}
                    >
                      {stCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span
                      className={cn(
                        'todo-text flex-1 min-w-0 truncate text-sm',
                        stCompleted
                          ? 'text-ink-300 dark:text-ink-600'
                          : 'text-ink-700 dark:text-ink-200',
                      )}
                    >
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete(st)}
                      aria-label={`删除${st.title}`}
                      className="p-1 rounded text-ink-300 dark:text-ink-500 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDelete(todo)}
          aria-label={`删除${todo.title}`}
          className="p-2 rounded-md flex-shrink-0 text-ink-400 dark:text-ink-300 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
