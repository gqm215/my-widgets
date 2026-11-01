import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CalendarClock, ListTodo, Plus, Repeat, X } from 'lucide-react';
import { EmptyState } from '@/components/ui';
import { formatTime } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { Event, Todo } from '@/types';

export interface DayDetailPanelProps {
  /** 选中日期（本地时间） */
  day: Date;
  /** 当天日程（循环事件已展开） */
  events: Event[];
  /** 当天待办 */
  todos: Todo[];
  onClose: () => void;
  onAddTodo: () => void;
  onAddEvent: () => void;
  /** 额外类名，用于侧栏/抽屉布局微调 */
  className?: string;
}

const REPEAT_LABELS: Record<Event['repeat'], string> = {
  none: '',
  daily: '每天',
  weekly: '每周',
  monthly: '每月',
};

/** 日程详情面板：桌面端作为右侧栏，移动端作为抽屉内容复用同一渲染 */
export function DayDetailPanel({
  day,
  events,
  todos,
  onClose,
  onAddTodo,
  onAddEvent,
  className,
}: DayDetailPanelProps) {
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
  );
  const empty = sortedEvents.length === 0 && todos.length === 0;

  return (
    <div
      className={cn(
        'bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 overflow-y-auto flex flex-col',
        className,
      )}
      data-testid="day-detail-panel"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif font-semibold text-ink-900 dark:text-ink-100">
          {format(day, 'MM月dd日 EEEE', { locale: zhCN })}
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭日期详情"
          className="p-1 hover:bg-paper-dark dark:hover:bg-ink-700 rounded text-ink-400 dark:text-ink-300 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>

      {empty ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState title="当天无事项" description="点击下方按钮为此日添加待办或日程。" />
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {sortedEvents.length > 0 && (
            <section aria-label="当日日程">
              <p className="text-xs text-ink-400 dark:text-ink-300 mb-1.5 font-medium">日程</p>
              {sortedEvents.map((event) => (
                <div
                  key={`${event.id}-${event.startDate}`}
                  data-testid={`day-event-${event.id}`}
                  className="text-sm px-2 py-1.5 bg-rattan/10 rounded mb-1"
                >
                  <div className="flex items-center gap-1.5">
                    <p className="text-ink-900 dark:text-ink-100 truncate">{event.title}</p>
                    {event.repeat !== 'none' && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] text-rattan flex-shrink-0">
                        <Repeat className="w-2.5 h-2.5" strokeWidth={2} />
                        {REPEAT_LABELS[event.repeat]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-ink-400 dark:text-ink-300 flex items-center gap-1 mt-0.5">
                    <CalendarClock className="w-3 h-3" strokeWidth={1.5} />
                    {event.isAllDay ? '全天' : formatTime(event.startDate)}
                    {event.endDate && !event.isAllDay && ` - ${formatTime(event.endDate)}`}
                  </p>
                </div>
              ))}
            </section>
          )}

          {todos.length > 0 && (
            <section aria-label="当日待办">
              <p className="text-xs text-ink-400 dark:text-ink-300 mb-1.5 font-medium">待办</p>
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    'text-sm px-2 py-1.5 rounded mb-1',
                    todo.completed
                      ? 'bg-ink-100 dark:bg-ink-700 text-ink-400 dark:text-ink-300 line-through'
                      : todo.priority === 'high'
                        ? 'bg-vermilion/10 text-ink-900 dark:text-ink-100'
                        : 'bg-paper-dark dark:bg-ink-700/50 text-ink-700 dark:text-ink-200',
                  )}
                >
                  {todo.title}
                </div>
              ))}
            </section>
          )}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-paper-dark dark:border-ink-600 space-y-2">
        <button
          type="button"
          onClick={onAddTodo}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-vermilion/10 hover:bg-vermilion/20 text-vermilion text-sm transition-colors"
        >
          <ListTodo className="w-4 h-4" strokeWidth={1.5} />
          添加待办
        </button>
        <button
          type="button"
          onClick={onAddEvent}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-rattan/10 hover:bg-rattan/20 text-rattan text-sm transition-colors"
        >
          <Plus className="w-4 h-4" strokeWidth={1.5} />
          添加日程
        </button>
      </div>
    </div>
  );
}

export default DayDetailPanel;
