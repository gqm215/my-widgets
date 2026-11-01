import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfDay,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useAppStore } from '@/store';
import { buildDayIndex, layoutTimedEvent, HOUR_HEIGHT } from '@/utils/calendar';
import { combineDateTime, parseDayKey, toDayKey } from '@/utils/date';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { Button, Input, Modal } from '@/components/ui';
import DayDetailPanel from '@/components/calendar/DayDetailPanel';
import { cn } from '@/lib/utils';
import type { Event, Todo } from '@/types';

type CalendarView = 'month' | 'week';

interface DayBucket {
  todos: Todo[];
  events: Event[];
}

const EMPTY_BUCKET: DayBucket = { todos: [], events: [] };

/** 月份网格 / 周视图共用的日期显示 */
function dayLabel(day: Date): string {
  return format(day, 'yyyy年M月d日', { locale: zhCN });
}

export default function CalendarPage() {
  const todos = useAppStore((s) => s.todos);
  const events = useAppStore((s) => s.events);
  const addTodo = useAppStore((s) => s.addTodo);
  const addEvent = useAppStore((s) => s.addEvent);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<CalendarView>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  const consumedDateRef = useRef(false);

  // 新增表单状态
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoError, setNewTodoError] = useState<string | null>(null);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventStart, setNewEventStart] = useState('09:00');
  const [newEventEnd, setNewEventEnd] = useState('10:00');
  const [newEventError, setNewEventError] = useState<string | null>(null);

  // ?date= 只消费一次，随后清空查询参数
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (!dateParam || consumedDateRef.current) return;
    consumedDateRef.current = true;
    const target = parseDayKey(dateParam);
    if (!Number.isNaN(target.getTime())) {
      setCurrentDate(target);
      setSelectedDay(target);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  /* ---------- 日期区间 ---------- */
  const monthDays = useMemo((): Date[] => {
    const ms = startOfMonth(currentDate);
    const me = endOfMonth(ms);
    const ws = startOfWeek(ms, { weekStartsOn: 1 });
    const we = endOfWeek(me, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  const weekDays = useMemo((): Date[] => {
    const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
    const we = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ws, end: we });
  }, [currentDate]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);

  /* ---------- 一次建索引（含循环事件展开） ---------- */
  const range = useMemo(() => {
    const days = view === 'month' ? monthDays : weekDays;
    return { from: startOfDay(days[0]), to: endOfDay(days[days.length - 1]) };
  }, [view, monthDays, weekDays]);

  const dayIndex = useMemo(
    () => buildDayIndex(todos, events, range),
    [todos, events, range],
  );

  const getBucket = (day: Date): DayBucket => dayIndex.get(toDayKey(day)) ?? EMPTY_BUCKET;
  const selectedBucket = selectedDay ? getBucket(selectedDay) : null;

  /* ---------- 导航 ---------- */
  const step = (direction: -1 | 1) => {
    const fn =
      view === 'month'
        ? direction === -1
          ? subMonths
          : addMonths
        : direction === -1
          ? subWeeks
          : addWeeks;
    setCurrentDate(fn(currentDate, 1));
  };

  const handlePrev = () => step(-1);
  const handleNext = () => step(1);
  const handleToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDay(now);
  };

  /* ---------- 快速添加 ---------- */
  const openTodoModal = () => {
    setNewTodoTitle('');
    setNewTodoError(null);
    setTodoModalOpen(true);
  };

  const handleQuickAddTodo = () => {
    if (!selectedDay) return;
    if (!newTodoTitle.trim()) {
      setNewTodoError('请输入待办标题');
      return;
    }
    addTodo({
      title: newTodoTitle.trim(),
      priority: 'medium',
      dueDate: toDayKey(selectedDay),
    });
    setTodoModalOpen(false);
    setNewTodoTitle('');
    setNewTodoError(null);
  };

  const openEventModal = () => {
    setNewEventTitle('');
    setNewEventStart('09:00');
    setNewEventEnd('10:00');
    setNewEventError(null);
    setEventModalOpen(true);
  };

  const handleQuickAddEvent = () => {
    if (!selectedDay) return;
    if (!newEventTitle.trim()) {
      setNewEventError('请输入日程标题');
      return;
    }
    const dayKey = toDayKey(selectedDay);
    const startISO = combineDateTime(dayKey, newEventStart);
    const endISO = combineDateTime(dayKey, newEventEnd);
    if (!startISO || !endISO) {
      setNewEventError('时间格式不正确');
      return;
    }
    if (new Date(endISO).getTime() < new Date(startISO).getTime()) {
      setNewEventError('结束时间不能早于开始时间');
      return;
    }
    addEvent({
      title: newEventTitle.trim(),
      startDate: startISO,
      endDate: endISO,
      isAllDay: false,
      repeat: 'none',
    });
    setEventModalOpen(false);
  };

  /* ---------- 渲染 ---------- */
  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      {/* 工具栏 */}
      <div className="flex items-center justify-between mb-4 md:mb-6 flex-shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            aria-label={view === 'month' ? '上一月' : '上一周'}
            className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={1.5} />
          </button>
          <h2 className="text-lg md:text-xl font-serif font-semibold text-ink-900 dark:text-ink-100 min-w-[140px] text-center">
            {view === 'month'
              ? format(currentDate, 'yyyy年 MM月')
              : `${format(weekDays[0], 'MM月dd日')} - ${format(weekDays[6], 'MM月dd日')}`}
          </h2>
          <button
            type="button"
            onClick={handleNext}
            aria-label={view === 'month' ? '下一月' : '下一周'}
            className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={handleToday}
            aria-label="今天"
            className="ml-2 px-3 py-1 text-sm border border-paper-dark dark:border-ink-600 rounded-md text-ink-500 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            今天
          </button>
        </div>

        <div className="flex items-center bg-paper-dark dark:bg-ink-700 rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setView('month')}
            aria-pressed={view === 'month'}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
              view === 'month'
                ? 'bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 shadow-sm'
                : 'text-ink-500 dark:text-ink-300 hover:text-ink-700 dark:hover:text-ink-100',
            )}
          >
            <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">月视图</span>
          </button>
          <button
            type="button"
            onClick={() => setView('week')}
            aria-pressed={view === 'week'}
            className={cn(
              'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1',
              view === 'week'
                ? 'bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 shadow-sm'
                : 'text-ink-500 dark:text-ink-300 hover:text-ink-700 dark:hover:text-ink-100',
            )}
          >
            <Clock className="w-4 h-4" strokeWidth={1.5} />
            <span className="hidden sm:inline">周视图</span>
          </button>
        </div>
      </div>

      {/* 主体 */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto">
          {view === 'month' ? (
            <MonthView
              days={monthDays}
              currentMonth={currentDate}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              getBucket={getBucket}
            />
          ) : (
            <WeekView
              weekDays={weekDays}
              hours={hours}
              getBucket={getBucket}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          )}
        </div>

        {/* 桌面端：常驻侧栏 */}
        {selectedDay && isDesktop && selectedBucket && (
          <DayDetailPanel
            day={selectedDay}
            events={selectedBucket.events}
            todos={selectedBucket.todos}
            onClose={() => setSelectedDay(null)}
            onAddTodo={openTodoModal}
            onAddEvent={openEventModal}
            className="w-72 flex-shrink-0"
          />
        )}
      </div>

      {/* 移动端：日期详情抽屉 */}
      {selectedDay && !isDesktop && selectedBucket && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 animate-fade-in"
            onClick={() => setSelectedDay(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="日期详情"
            className="absolute top-0 right-0 h-full w-80 max-w-full p-2 animate-slide-in-right"
          >
            <DayDetailPanel
              day={selectedDay}
              events={selectedBucket.events}
              todos={selectedBucket.todos}
              onClose={() => setSelectedDay(null)}
              onAddTodo={openTodoModal}
              onAddEvent={openEventModal}
              className="h-full"
            />
          </div>
        </div>
      )}

      {/* 快速添加待办 */}
      <Modal open={todoModalOpen} onClose={() => setTodoModalOpen(false)} title="添加待办">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleQuickAddTodo();
          }}
        >
          <Input
            label="标题"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="待办事项标题"
            autoFocus
          />
          <p className="text-xs text-ink-400 dark:text-ink-500">
            截止日期：{selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '—'}
          </p>
          {newTodoError && (
            <p role="alert" className="text-sm text-vermilion">
              {newTodoError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setTodoModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary">
              创建待办
            </Button>
          </div>
        </form>
      </Modal>

      {/* 快速添加日程 */}
      <Modal open={eventModalOpen} onClose={() => setEventModalOpen(false)} title="添加日程">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleQuickAddEvent();
          }}
        >
          <Input
            label="标题"
            value={newEventTitle}
            onChange={(e) => setNewEventTitle(e.target.value)}
            placeholder="日程标题"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="开始时间"
              type="time"
              value={newEventStart}
              onChange={(e) => setNewEventStart(e.target.value)}
            />
            <Input
              label="结束时间"
              type="time"
              value={newEventEnd}
              onChange={(e) => setNewEventEnd(e.target.value)}
            />
          </div>
          {newEventError && (
            <p role="alert" className="text-sm text-vermilion">
              {newEventError}
            </p>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setEventModalOpen(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary">
              创建日程
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

/* ========== 月视图 ========== */

function MonthView({
  days,
  currentMonth,
  selectedDay,
  onSelectDay,
  getBucket,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
  getBucket: (d: Date) => DayBucket;
}) {
  return (
    <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none overflow-hidden">
      <div className="grid grid-cols-7 bg-paper-accent dark:bg-ink-700 border-b border-paper-dark dark:border-ink-600">
        {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
          <div key={d} className="py-3 text-center text-sm font-medium text-ink-600 dark:text-ink-300">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const { todos: dayTodos, events: dayEvents } = getBucket(day);
          const current = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const selected = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={day.toISOString()}
              role="button"
              tabIndex={0}
              aria-label={dayLabel(day)}
              onClick={() => onSelectDay(day)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectDay(day);
                }
              }}
              className={cn(
                'min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-paper-dark dark:border-ink-600 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vermilion/50',
                !current ? 'bg-paper-accent/30 dark:bg-ink-900/50' : 'bg-white dark:bg-ink-800',
                selected && 'ring-2 ring-inset ring-vermilion/50',
              )}
            >
              <div
                className={cn(
                  'text-sm mb-1',
                  today
                    ? 'inline-flex items-center justify-center w-7 h-7 bg-vermilion text-white rounded-full'
                    : current
                      ? 'text-ink-900 dark:text-ink-100'
                      : 'text-ink-300 dark:text-ink-500',
                )}
              >
                {format(day, 'd')}
              </div>
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={`${ev.id}-${ev.startDate}`}
                    className="text-xs px-2 py-1 bg-rattan/20 text-rattan rounded truncate"
                  >
                    {ev.title}
                  </div>
                ))}
                {dayTodos.slice(0, 3).map((todo) => (
                  <div
                    key={todo.id}
                    className={cn(
                      'text-xs px-2 py-1 rounded truncate',
                      todo.completed
                        ? 'bg-ink-100 dark:bg-ink-700 text-ink-400 dark:text-ink-500 line-through'
                        : todo.priority === 'high'
                          ? 'bg-vermilion/20 text-vermilion'
                          : todo.priority === 'medium'
                            ? 'bg-rattan/20 text-rattan'
                            : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300',
                    )}
                  >
                    {todo.title}
                  </div>
                ))}
                {dayTodos.length + dayEvents.length > 3 && (
                  <div className="text-xs text-ink-400 dark:text-ink-500">
                    +{dayTodos.length + dayEvents.length - 3} 更多
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ========== 周视图 ========== */

const DAY_GRID_HEIGHT = HOUR_HEIGHT * 24;

function WeekView({
  weekDays,
  hours,
  getBucket,
  selectedDay,
  onSelectDay,
}: {
  weekDays: Date[];
  hours: number[];
  getBucket: (d: Date) => DayBucket;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
}) {
  const buckets = weekDays.map((day) => ({ day, ...getBucket(day) }));
  const maxAllDay = Math.max(
    1,
    ...buckets.map((b) => b.events.filter((e) => e.isAllDay).length + b.todos.length),
  );

  return (
    <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none overflow-hidden flex flex-col">
      {/* 表头：星期 + 日期 */}
      <div className="flex border-b border-paper-dark dark:border-ink-600">
        <div className="w-16 flex-shrink-0 border-r border-paper-dark dark:border-ink-600" />
        {buckets.map(({ day }) => (
          <div
            key={day.toISOString()}
            role="button"
            tabIndex={0}
            aria-label={dayLabel(day)}
            onClick={() => onSelectDay(day)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelectDay(day);
              }
            }}
            className={cn(
              'flex-1 text-center py-2 cursor-pointer border-r border-paper-dark dark:border-ink-600 last:border-r-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-vermilion/50',
              isToday(day) && 'bg-vermilion/5',
              selectedDay && isSameDay(day, selectedDay) && 'ring-2 ring-inset ring-vermilion/50',
            )}
          >
            <div className="text-xs text-ink-500 dark:text-ink-400">{format(day, 'EEE')}</div>
            <div
              className={cn(
                'text-lg font-semibold mt-0.5',
                isToday(day)
                  ? 'inline-flex items-center justify-center w-8 h-8 bg-vermilion text-white rounded-full'
                  : 'text-ink-900 dark:text-ink-100',
              )}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* 全天区域 */}
      <div className="border-b border-paper-dark dark:border-ink-600">
        <div className="flex" style={{ minHeight: `${maxAllDay * 32}px` }}>
          <div className="w-16 flex-shrink-0 border-r border-paper-dark dark:border-ink-600 py-1 px-2 flex items-start">
            <span className="text-[10px] text-ink-400 dark:text-ink-500">全天</span>
          </div>
          {buckets.map(({ day, events: dayEvents, todos: dayTodos }) => (
            <div
              key={day.toISOString()}
              className="flex-1 border-r border-paper-dark dark:border-ink-600 last:border-r-0 p-0.5 space-y-0.5"
            >
              {dayEvents
                .filter((ev) => ev.isAllDay)
                .map((ev) => (
                  <div
                    key={`${ev.id}-${ev.startDate}`}
                    className="text-[10px] px-1.5 py-0.5 bg-rattan/20 text-rattan rounded truncate"
                  >
                    {ev.title}
                  </div>
                ))}
              {dayTodos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    'text-[10px] px-1.5 py-0.5 rounded truncate',
                    todo.completed
                      ? 'bg-ink-100 dark:bg-ink-700 text-ink-400 line-through'
                      : todo.priority === 'high'
                        ? 'bg-vermilion/20 text-vermilion'
                        : 'bg-ink-100 dark:bg-ink-700 text-ink-600 dark:text-ink-300',
                  )}
                >
                  {todo.title}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* 时间网格：按时长渲染事件块 */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          <div className="w-16 flex-shrink-0">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-paper-dark dark:border-ink-600 flex items-start justify-end pr-2"
              >
                <span className="text-[10px] text-ink-400 dark:text-ink-500 -mt-1.5">
                  {String(h).padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>

          {buckets.map(({ day, events: dayEvents }) => {
            const timedEvents = dayEvents
              .filter((ev) => !ev.isAllDay)
              .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
            return (
              <div
                key={day.toISOString()}
                role="presentation"
                onClick={() => onSelectDay(day)}
                className={cn(
                  'flex-1 border-r border-paper-dark dark:border-ink-600 last:border-r-0 relative cursor-pointer',
                  isToday(day) && 'bg-vermilion/[0.02] dark:bg-vermilion/[0.03]',
                )}
                style={{ height: DAY_GRID_HEIGHT }}
              >
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-paper-dark/30 dark:border-ink-600/30"
                  />
                ))}
                {timedEvents.map((ev) => {
                  const { top, height } = layoutTimedEvent(ev);
                  return (
                    <div
                      key={`${ev.id}-${ev.startDate}`}
                      data-testid={`timed-event-${ev.id}`}
                      className="absolute left-0.5 right-0.5 px-1 py-0.5 bg-rattan/20 text-rattan rounded text-[10px] overflow-hidden"
                      style={{ top, height }}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
