import { useMemo, useState, type ReactNode, type RefObject } from 'react';
import { CheckSquare, ChevronDown, ChevronRight } from 'lucide-react';
import { EmptyState, Input } from '@/components/ui';
import { cn } from '@/lib/utils';
import { isOverdue } from '@/utils/todoFilters';
import { TaskRow } from './TaskRow';
import type { Priority, Todo } from '@/types';

export type PriorityFilter = 'all' | Priority;
export type SortBy = 'createdAt' | 'dueDate' | 'priority';

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

/** 排序（D10 沿用现有三种：创建/截止/优先级），截止无日期沉底 */
function sortTodos(list: Todo[], sortBy: SortBy): Todo[] {
  const sorted = [...list];
  sorted.sort((a, b) => {
    switch (sortBy) {
      case 'dueDate': {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      case 'priority':
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      case 'createdAt':
      default:
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });
  return sorted;
}

export interface TaskListProps {
  /** 当前视图成员（页面已应用优先级筛选） */
  todos: Todo[];
  /** 全量待办，用于查找子任务 */
  allTodos: Todo[];
  /** 视图原始成员数（未套优先级筛选），用于区分「真空」与「被筛空」 */
  totalInView: number;
  today: string;
  sortBy: SortBy;
  /** D8：隐藏「已完成 / 已放弃」折叠分组 */
  hiddenCompleted: boolean;
  /** 当前视图空态引导文案 */
  emptyHint: string;
  /** 内联添加框（D7 决策：今天/最近7天视图归属不明，不提供，传 null 隐藏） */
  inlineAdd: { inputRef: RefObject<HTMLInputElement>; placeholder: string } | null;
  onCreateTodo: (title: string) => void;
  selectedTaskId: string | null;
  onSelectTask: (id: string) => void;
  onDeleteTask: (todo: Todo) => void;
}

/**
 * 任务列表区（D7/D11/D20）：
 * - 逾期红色分组置顶（vermilion 组头）
 * - 进行中任务紧跟其后
 * - 「已完成」「已放弃」独立折叠分组沉底，默认收起（D11）
 */
export function TaskList({
  todos,
  allTodos,
  totalInView,
  today,
  sortBy,
  hiddenCompleted,
  emptyHint,
  inlineAdd,
  onCreateTodo,
  selectedTaskId,
  onSelectTask,
  onDeleteTask,
}: TaskListProps) {
  const [draft, setDraft] = useState('');
  const [completedOpen, setCompletedOpen] = useState(false);
  const [abandonedOpen, setAbandonedOpen] = useState(false);

  // 子任务索引：parentId → 子任务列表（按创建先后展示）
  const childrenMap = useMemo(() => {
    const map = new Map<string, Todo[]>();
    allTodos.forEach((t) => {
      if (!t.parentId) return;
      const arr = map.get(t.parentId);
      if (arr) arr.push(t);
      else map.set(t.parentId, [t]);
    });
    return map;
  }, [allTodos]);

  const childrenOf = (id: string): Todo[] =>
    (childrenMap.get(id) ?? []).slice().sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const overdue = useMemo(
    () => sortTodos(todos.filter((t) => isOverdue(t, today)), sortBy),
    [todos, today, sortBy]
  );
  const active = useMemo(
    () => sortTodos(todos.filter((t) => t.status === 'active' && !isOverdue(t, today)), sortBy),
    [todos, today, sortBy]
  );
  const completed = useMemo(
    () => sortTodos(todos.filter((t) => t.status === 'completed'), sortBy),
    [todos, sortBy]
  );
  const abandoned = useMemo(
    () => sortTodos(todos.filter((t) => t.status === 'abandoned'), sortBy),
    [todos, sortBy]
  );

  const hasActiveContent = overdue.length > 0 || active.length > 0;
  const hasFoldContent =
    !hiddenCompleted && (completed.length > 0 || abandoned.length > 0);
  const showEmpty = !hasActiveContent && !hasFoldContent;

  // 空态三分：真空 / 被优先级筛空 / 进行中内容全被隐藏
  let emptyTitle = '暂无待办事项';
  let emptyDescription = emptyHint;
  if (totalInView > 0 && todos.length === 0) {
    emptyTitle = '没有匹配的待办';
    emptyDescription = '试试调整优先级筛选，查看更多内容。';
  } else if (showEmpty && totalInView > 0) {
    emptyTitle = '没有进行中的待办';
    emptyDescription = '已完成与已放弃的内容已隐藏，可从右上角开关恢复显示。';
  }

  const renderRow = (todo: Todo, index: number) => (
    <TaskRow
      key={todo.id}
      todo={todo}
      subtasks={childrenOf(todo.id)}
      today={today}
      selected={todo.id === selectedTaskId}
      onSelect={onSelectTask}
      onDelete={onDeleteTask}
      animationIndex={index}
    />
  );

  return (
    <div className="space-y-2">
      {inlineAdd && (
        <div className="mb-4">
          <Input
            ref={inlineAdd.inputRef}
            aria-label="新建待办"
            placeholder={inlineAdd.placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              const title = draft.trim();
              if (!title) return;
              onCreateTodo(title);
              setDraft('');
            }}
          />
        </div>
      )}

      {showEmpty ? (
        <EmptyState
          icon={<CheckSquare className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <>
          {/* D7：逾期红色分组置顶 */}
          {overdue.length > 0 && (
            <section aria-label="已逾期任务">
              <div
                data-testid="overdue-group-header"
                className="flex items-center gap-1.5 px-1 py-1 text-vermilion"
              >
                <span className="text-sm font-medium">已逾期 ({overdue.length})</span>
              </div>
              <div className="space-y-2">{overdue.map(renderRow)}</div>
            </section>
          )}

          {active.length > 0 && <div className="space-y-2">{active.map(renderRow)}</div>}

          {/* D11：已完成 / 已放弃 折叠分组沉底，默认收起 */}
          {!hiddenCompleted && completed.length > 0 && (
            <FoldGroup
              label="已完成"
              count={completed.length}
              open={completedOpen}
              onToggle={() => setCompletedOpen((v) => !v)}
            >
              {completed.map(renderRow)}
            </FoldGroup>
          )}

          {!hiddenCompleted && abandoned.length > 0 && (
            <FoldGroup
              label="已放弃"
              count={abandoned.length}
              open={abandonedOpen}
              onToggle={() => setAbandonedOpen((v) => !v)}
            >
              {abandoned.map(renderRow)}
            </FoldGroup>
          )}
        </>
      )}
    </div>
  );
}

interface FoldGroupProps {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function FoldGroup({ label, count, open, onToggle, children }: FoldGroupProps) {
  return (
    <section aria-label={label} className={cn('pt-2 mt-2 border-t border-paper-dark/70 dark:border-ink-700/70')}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex items-center gap-1.5 px-1 py-1.5 rounded-md text-sm text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100 transition-colors"
      >
        {open ? (
          <ChevronDown className="w-4 h-4" strokeWidth={1.5} />
        ) : (
          <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
        )}
        <span>
          {label} ({count})
        </span>
      </button>
      {open && <div className="mt-1 space-y-2">{children}</div>}
    </section>
  );
}
