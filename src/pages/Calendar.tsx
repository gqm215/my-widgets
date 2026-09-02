
import { useAppStore } from '@/store';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, X, Plus, ListTodo } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths,
  addWeeks, subWeeks, isToday, setHours, setMinutes,
} from 'date-fns';
import { useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Modal, Button, EmptyState } from '@/components/ui';
import type { Todo, Event, Priority } from '@/types';

// ========== types & helpers ==========

type CalendarView = 'month' | 'week';

interface DayItems {
  todos: Todo[];
  events: Event[];
}

interface WeekDayData {
  day: Date;
  allDayEvents: Event[];
  timedEvents: Event[];
  todos: Todo[];
}

function mkDayStr(d: Date) {
  return format(d, 'yyyy-MM-dd');
}

// ========== main component ==========

export default function CalendarPage() {
  const todos = useAppStore((s) => s.todos);
  const events = useAppStore((s) => s.events);
  const addTodo = useAppStore((s) => s.addTodo);
  const addEvent = useAppStore((s) => s.addEvent);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView]       = useState<CalendarView>('month');
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // 新增表单对话框状态
  const [todoModalOpen, setTodoModalOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('medium');
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventLocation, setNewEventLocation] = useState('');
  const [newEventIsAllDay, setNewEventIsAllDay] = useState(false);
  const [newEventStart, setNewEventStart] = useState('');
  const [newEventEnd, setNewEventEnd] = useState('');

  // 处理 URL 参数中的日期跳转
  useEffect(() => {
    const dateParam = searchParams.get('date');
    if (dateParam) {
      const targetDate = new Date(dateParam);
      if (!isNaN(targetDate.getTime())) {
        setCurrentDate(targetDate);
        setSelectedDay(targetDate);
      }
    }
  }, [searchParams]);

  // 快速创建待办
  const handleQuickAddTodo = () => {
    if (!selectedDay || !newTodoTitle.trim()) return;
    addTodo({
      title: newTodoTitle.trim(),
      priority: newTodoPriority,
      dueDate: mkDayStr(selectedDay),
    });
    setNewTodoTitle('');
    setNewTodoPriority('medium');
    setTodoModalOpen(false);
  };

  // 快速创建日程
  const handleQuickAddEvent = () => {
    if (!selectedDay || !newEventTitle.trim()) return;
    let startDate: Date;
    let endDate: Date | undefined;

    if (newEventIsAllDay) {
      startDate = new Date(selectedDay);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(selectedDay);
      endDate.setHours(23, 59, 59, 999);
    } else {
      const [startH, startM] = (newEventStart || '09:00').split(':').map(Number);
      startDate = setMinutes(setHours(selectedDay, startH || 9), startM || 0);
      if (newEventEnd) {
        const [endH, endM] = newEventEnd.split(':').map(Number);
        endDate = setMinutes(setHours(selectedDay, endH || 10), endM || 0);
      }
    }

    addEvent({
      title: newEventTitle.trim(),
      location: newEventLocation.trim() || undefined,
      startDate: startDate.toISOString(),
      endDate: endDate?.toISOString(),
      isAllDay: newEventIsAllDay,
      repeat: 'none',
    });
    setNewEventTitle('');
    setNewEventLocation('');
    setNewEventIsAllDay(false);
    setNewEventStart('09:00');
    setNewEventEnd('10:00');
    setEventModalOpen(false);
  };

  // 打开新增待办对话框
  const openTodoModal = () => {
    if (!selectedDay) return;
    setNewTodoTitle('');
    setNewTodoPriority('medium');
    setTodoModalOpen(true);
  };

  // 打开新增日程对话框
  const openEventModal = () => {
    if (!selectedDay) return;
    // 设置默认时间为当天 9:00 - 10:00
    const defaultStart = '09:00';
    const defaultEnd = '10:00';
    setNewEventTitle('');
    setNewEventLocation('');
    setNewEventIsAllDay(false);
    setNewEventStart(defaultStart);
    setNewEventEnd(defaultEnd);
    setEventModalOpen(true);
  };

  // ---------- navigation ----------

  const handlePrev = () => {
    setCurrentDate(
      view === 'month' ? subMonths(currentDate, 1) : subWeeks(currentDate, 1)
    );
  };
  const handleNext = () => {
    setCurrentDate(
      view === 'month' ? addMonths(currentDate, 1) : addWeeks(currentDate, 1)
    );
  };
  const handleToday = () => {
    const t = new Date();
    setCurrentDate(t);
    setSelectedDay(t);
  };

  // ---------- computed ranges ----------

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

  // ---------- data filters ----------

  function getDayItems(day: Date): DayItems {
    const ds = mkDayStr(day);
    return {
      events: events.filter((e) => mkDayStr(new Date(e.startDate)) === ds),
      todos:  todos.filter((t) => t.dueDate && mkDayStr(new Date(t.dueDate)) === ds),
    };
  }

  const selectedDayItems = selectedDay ? getDayItems(selectedDay) : null;

  // ---------- week helpers ----------

  const weekData = useMemo((): WeekDayData[] => {
    return weekDays.map((day) => {
      const ds = mkDayStr(day);
      const dayEvents = events.filter((e) => mkDayStr(new Date(e.startDate)) === ds);
      const dayTodos = todos.filter((t) => t.dueDate && mkDayStr(new Date(t.dueDate)) === ds);
      return {
        day,
        allDayEvents: dayEvents.filter((e) => e.isAllDay),
        timedEvents:  dayEvents.filter((e) => !e.isAllDay),
        todos: dayTodos,
      };
    });
  }, [weekDays, events, todos]);

  // ========== render ==========

  return (
    <div className="p-4 md:p-8 flex flex-col h-full">
      {/* ---- toolbar ---- */}
      <div className="flex items-center justify-between mb-4 md:mb-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
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
            onClick={handleNext}
            className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-ink-700 dark:text-ink-300" strokeWidth={1.5} />
          </button>
          <button
            onClick={handleToday}
            className="ml-2 px-3 py-1 text-sm border border-paper-dark dark:border-ink-600 rounded-md text-ink-500 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            今天
          </button>
        </div>

        {/* view toggle */}
        <div className="flex items-center bg-paper-dark dark:bg-ink-700 rounded-md p-0.5">
          <button
            onClick={() => setView('month')}
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
            onClick={() => setView('week')}
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

      {/* ---- body ---- */}
      <div className="flex-1 flex gap-4 min-h-0">
        <div className="flex-1 min-w-0 overflow-auto">
          {view === 'month' ? (
            <MonthView
              days={monthDays}
              currentMonth={currentDate}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              getDayItems={getDayItems}
            />
          ) : (
            <WeekView
              weekData={weekData}
              hours={hours}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
            />
          )}
        </div>

        {/* day detail sidebar */}
        {selectedDay && (
          <DayDetailPanel
            day={selectedDay}
            items={selectedDayItems}
            onClose={() => setSelectedDay(null)}
            onAddTodo={openTodoModal}
            onAddEvent={openEventModal}
          />
        )}

        {/* 快速添加待办 Modal */}
        <Modal open={todoModalOpen} onClose={() => setTodoModalOpen(false)} title="添加待办">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">标题</label>
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="待办事项标题"
                className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddTodo(); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">优先级</label>
              <div className="flex gap-2">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setNewTodoPriority(p)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm transition-colors border',
                      newTodoPriority === p
                        ? p === 'high'
                          ? 'bg-vermilion/10 border-vermilion text-vermilion'
                          : p === 'medium'
                            ? 'bg-rattan/10 border-rattan text-rattan'
                            : 'bg-ink-100 dark:bg-ink-700 border-ink-300 dark:border-ink-500 text-ink-600 dark:text-ink-300'
                        : 'border-paper-dark dark:border-ink-600 text-ink-500 dark:text-ink-400 hover:bg-paper-dark dark:hover:bg-ink-700',
                    )}
                  >
                    {p === 'high' ? '高' : p === 'medium' ? '中' : '低'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">截止日期</label>
              <input
                type="date"
                value={selectedDay ? mkDayStr(selectedDay) : ''}
                disabled
                className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-paper-accent/50 dark:bg-ink-800 text-ink-500 dark:text-ink-400 cursor-not-allowed"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setTodoModalOpen(false)}>取消</Button>
              <Button variant="primary" onClick={handleQuickAddTodo} disabled={!newTodoTitle.trim()}>创建待办</Button>
            </div>
          </div>
        </Modal>

        {/* 快速添加日程 Modal */}
        <Modal open={eventModalOpen} onClose={() => setEventModalOpen(false)} title="添加日程">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">标题</label>
              <input
                type="text"
                value={newEventTitle}
                onChange={(e) => setNewEventTitle(e.target.value)}
                placeholder="日程标题"
                className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleQuickAddEvent(); }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">地点</label>
              <input
                type="text"
                value={newEventLocation}
                onChange={(e) => setNewEventLocation(e.target.value)}
                placeholder="可选"
                className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 placeholder:text-ink-400 dark:placeholder:text-ink-500 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isAllDay"
                checked={newEventIsAllDay}
                onChange={(e) => setNewEventIsAllDay(e.target.checked)}
                className="w-4 h-4 rounded border-paper-dark dark:border-ink-600 text-vermilion focus:ring-vermilion/50"
              />
              <label htmlFor="isAllDay" className="text-sm text-ink-700 dark:text-ink-200 cursor-pointer">全天</label>
            </div>
            {!newEventIsAllDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">开始时间</label>
                  <input
                    type="time"
                    value={newEventStart}
                    onChange={(e) => setNewEventStart(e.target.value)}
                    className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1">结束时间</label>
                  <input
                    type="time"
                    value={newEventEnd}
                    onChange={(e) => setNewEventEnd(e.target.value)}
                    className="w-full px-3 py-2 border border-paper-dark dark:border-ink-600 rounded-md bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100 focus:outline-none focus:ring-2 focus:ring-vermilion/50 transition-colors"
                  />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setEventModalOpen(false)}>取消</Button>
              <Button variant="primary" onClick={handleQuickAddEvent} disabled={!newEventTitle.trim()}>创建日程</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}

// ========== Month View ==========

function MonthView({
  days, currentMonth, selectedDay, onSelectDay, getDayItems,
}: {
  days: Date[];
  currentMonth: Date;
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
  getDayItems: (d: Date) => DayItems;
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
          const { todos: dt, events: de } = getDayItems(day);
          const current = isSameMonth(day, currentMonth);
          const today = isToday(day);
          const sel = selectedDay && isSameDay(day, selectedDay);

          return (
            <div
              key={day.toISOString()}
              onClick={() => onSelectDay(day)}
              className={cn(
                'min-h-[100px] md:min-h-[120px] p-2 border-b border-r border-paper-dark dark:border-ink-600 cursor-pointer transition-colors',
                !current ? 'bg-paper-accent/30 dark:bg-ink-900/50' : 'bg-white dark:bg-ink-800',
                sel && 'ring-2 ring-inset ring-vermilion/50',
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
                {de.slice(0, 3).map((ev) => (
                  <div key={ev.id} className="text-xs px-2 py-1 bg-rattan/20 text-rattan rounded truncate">
                    {ev.title}
                  </div>
                ))}
                {dt.slice(0, 3).map((todo) => (
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
                {dt.length + de.length > 3 && (
                  <div className="text-xs text-ink-400 dark:text-ink-500">
                    +{dt.length + de.length - 3} 更多
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

// ========== Week View ==========

const HOUR_HEIGHT = 48; // px per hour

function WeekView({
  weekData, hours, selectedDay, onSelectDay,
}: {
  weekData: WeekDayData[];
  hours: number[];
  selectedDay: Date | null;
  onSelectDay: (d: Date) => void;
}) {
  const maxAllDay =
    Math.max(1, ...weekData.map((d) => d.allDayEvents.length + d.todos.length));

  return (
    <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none overflow-hidden flex flex-col">
      {/* ---- header row (day names + dates) ---- */}
      <div className="flex border-b border-paper-dark dark:border-ink-600">
        <div className="w-16 flex-shrink-0 border-r border-paper-dark dark:border-ink-600" />
        {weekData.map(({ day }) => (
          <div
            key={day.toISOString()}
            onClick={() => onSelectDay(day)}
            className={cn(
              'flex-1 text-center py-2 cursor-pointer border-r border-paper-dark dark:border-ink-600 last:border-r-0',
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

      {/* ---- all-day area ---- */}
      <div className="border-b border-paper-dark dark:border-ink-600">
        <div className="flex" style={{ minHeight: `${maxAllDay * 32}px` }}>
          <div className="w-16 flex-shrink-0 border-r border-paper-dark dark:border-ink-600 py-1 px-2 flex items-start">
            <span className="text-[10px] text-ink-400 dark:text-ink-500">全天</span>
          </div>
          {weekData.map(({ day, allDayEvents, todos }) => (
            <div
              key={day.toISOString()}
              className="flex-1 border-r border-paper-dark dark:border-ink-600 last:border-r-0 p-0.5 space-y-0.5"
            >
              {allDayEvents.map((ev) => (
                <div key={ev.id} className="text-[10px] px-1.5 py-0.5 bg-rattan/20 text-rattan rounded truncate">
                  {ev.title}
                </div>
              ))}
              {todos.map((todo) => (
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

      {/* ---- time grid ---- */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex">
          {/* time column */}
          <div className="w-16 flex-shrink-0">
            {hours.map((h) => (
              <div
                key={h}
                style={{ height: HOUR_HEIGHT }}
                className="border-b border-paper-dark dark:border-ink-600 flex items-start justify-end pr-2"
              >
                <span className="text-[10px] text-ink-400 dark:text-ink-500 -mt-1.5">
                  {h === 0 ? '00:00' : `${String(h).padStart(2, '0')}:00`}
                </span>
              </div>
            ))}
          </div>

          {/* day columns */}
          {weekData.map(({ day, timedEvents }) => {
            const grouped = new Map<number, Event[]>();
            timedEvents.forEach((ev) => {
              const hr = new Date(ev.startDate).getHours();
              if (!grouped.has(hr)) grouped.set(hr, []);
              grouped.get(hr)!.push(ev);
            });

            return (
              <div
                key={day.toISOString()}
                onClick={() => onSelectDay(day)}
                className={cn(
                  'flex-1 border-r border-paper-dark dark:border-ink-600 last:border-r-0 relative cursor-pointer',
                  isToday(day) && 'bg-vermilion/[0.02] dark:bg-vermilion/[0.03]',
                )}
              >
                {/* grid lines */}
                {hours.map((h) => (
                  <div
                    key={h}
                    style={{ height: HOUR_HEIGHT }}
                    className="border-b border-paper-dark/30 dark:border-ink-600/30"
                  />
                ))}
                {/* event chips */}
                {Array.from(grouped.entries()).map(([hr, evs]) => (
                  <div
                    key={hr}
                    className="absolute left-0.5 right-0.5"
                    style={{ top: hr * HOUR_HEIGHT }}
                  >
                    {evs.map((ev) => (
                      <div
                        key={ev.id}
                        className="text-[10px] px-1 py-0.5 bg-rattan/20 text-rattan rounded truncate mb-0.5"
                      >
                        {ev.title}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ========== Day Detail Panel ==========

function DayDetailPanel({
  day, items, onClose, onAddTodo, onAddEvent,
}: {
  day: Date;
  items: DayItems | null;
  onClose: () => void;
  onAddTodo: () => void;
  onAddEvent: () => void;
}) {
  const empty = !items || (items.events.length === 0 && items.todos.length === 0);

  return (
    <div className="w-72 flex-shrink-0 hidden lg:flex lg:flex-col bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-serif font-semibold text-ink-900 dark:text-ink-100">
          {format(day, 'MM月dd日 EEEE')}
        </h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-paper-dark dark:hover:bg-ink-700 rounded text-ink-400 dark:text-ink-500 transition-colors"
        >
          <X className="w-4 h-4" strokeWidth={1.5} />
        </button>
      </div>
      {empty ? (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState
            title="当天无事项"
            description="点击下方按钮为此日添加待办或日程。"
          />
        </div>
      ) : (
        <div className="space-y-3">
          {items!.events.length > 0 && (
            <div>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-1.5 font-medium">日程</p>
              {items!.events.map((ev) => (
                <div key={ev.id} className="text-sm px-2 py-1.5 bg-rattan/10 rounded mb-1">
                  <p className="text-ink-900 dark:text-ink-100">{ev.title}</p>
                  <p className="text-xs text-ink-400 dark:text-ink-500">
                    {format(new Date(ev.startDate), 'HH:mm')}
                    {ev.endDate && ` - ${format(new Date(ev.endDate), 'HH:mm')}`}
                  </p>
                </div>
              ))}
            </div>
          )}
          {items!.todos.length > 0 && (
            <div>
              <p className="text-xs text-ink-400 dark:text-ink-500 mb-1.5 font-medium">待办</p>
              {items!.todos.map((todo) => (
                <div
                  key={todo.id}
                  className={cn(
                    'text-sm px-2 py-1.5 rounded mb-1',
                    todo.completed
                      ? 'bg-ink-100 dark:bg-ink-700 text-ink-400 dark:text-ink-500 line-through'
                      : todo.priority === 'high'
                        ? 'bg-vermilion/10 text-ink-900 dark:text-ink-100'
                        : 'bg-ink-50 dark:bg-ink-700/50 text-ink-700 dark:text-ink-200',
                  )}
                >
                  {todo.title}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* 快速操作按钮 */}
      <div className="mt-auto pt-4 border-t border-paper-dark dark:border-ink-600 space-y-2">
        <button
          onClick={onAddTodo}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-vermilion/10 hover:bg-vermilion/20 text-vermilion text-sm transition-colors"
        >
          <ListTodo className="w-4 h-4" strokeWidth={1.5} />
          添加待办
        </button>
        <button
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
