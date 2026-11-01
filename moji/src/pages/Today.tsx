import { useAppStore } from '@/store';
import { format, endOfDay, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { CheckSquare, Calendar as CalendarIcon, ChevronDown, ChevronUp, ExternalLink, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDayIndex } from '@/utils/calendar';
import { formatTime, toDayKey } from '@/utils/date';

export default function Today() {
  const todos = useAppStore(state => state.todos);
  const events = useAppStore(state => state.events);
  const toggleTodo = useAppStore(state => state.toggleTodo);
  const navigate = useNavigate();

  const today = useMemo(() => new Date(), []);
  const todayStr = toDayKey(today);

  const [expandedTodos, setExpandedTodos] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedTodos(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const completedTodosCount = todos.filter(t => t.completed).length;
  const totalTodosCount = todos.length;

  // 一次建索引（含循环日程展开），取出今日待办与日程
  const todayIndex = useMemo(
    () => buildDayIndex(todos, events, { from: startOfDay(today), to: endOfDay(today) }),
    [todos, events, today],
  );
  const todayBucket = todayIndex.get(todayStr);
  const todayTodos = todayBucket?.todos ?? [];
  const todayEvents = todayBucket?.events ?? [];

  return (
    <div className="p-4 md:p-8">
      {/* 山水横披 + 日期标题 */}
      <div className="relative rounded-2xl overflow-hidden mb-6 md:mb-8 shadow-paper dark:shadow-none animate-fade-in group">
        <img
          src="./scenes/mountains-hero.svg"
          alt="水墨山水"
          className="w-full h-40 md:h-56 object-cover transition-transform duration-[6000ms] ease-out group-hover:scale-105"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-5 md:p-8">
          <p className="text-white/75 text-xs md:text-sm tracking-widest font-serif">
            {format(today, 'yyyy 年 M 月 d 日 EEEE', { locale: zhCN })}
          </p>
          <h2 className="text-white text-2xl md:text-4xl font-serif font-semibold mt-1 drop-shadow-lg">
            莫急，且从容
          </h2>
          <p className="text-white/70 text-xs md:text-sm mt-2 max-w-md font-serif">
            行到水穷处，坐看云起时
          </p>
        </div>
      </div>

      {/* Overview 统计卡片：小屏幕单列，中等及以上三列 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
        {/* 今日待办 —— 朱砂 */}
        <div
          className="relative overflow-hidden bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none p-5 md:p-6 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] border border-black/[0.03] dark:border-white/[0.03] animate-fade-in"
        >
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-vermilion to-transparent opacity-80" />
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-ink-500 dark:text-ink-300 text-sm font-medium tracking-wide">今日待办</h3>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-vermilion/10 text-vermilion">
              <CheckSquare className="w-4 h-4" strokeWidth={1.5} />
            </span>
          </div>
          <p className="text-3xl font-serif font-bold text-ink-900 dark:text-ink-100 tabular-nums">
            {todayTodos.length}
          </p>
          <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">
            {todayTodos.filter(t => t.completed).length} 已完成
          </p>
        </div>

        {/* 今日日程 —— 赭黄 */}
        <div
          className="relative overflow-hidden bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none p-5 md:p-6 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] border border-black/[0.03] dark:border-white/[0.03] animate-fade-in"
          style={{ animationDelay: '60ms' }}
        >
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-rattan to-transparent opacity-80" />
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-ink-500 dark:text-ink-300 text-sm font-medium tracking-wide">今日日程</h3>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-rattan/10 text-rattan">
              <CalendarIcon className="w-4 h-4" strokeWidth={1.5} />
            </span>
          </div>
          <p className="text-3xl font-serif font-bold text-ink-900 dark:text-ink-100 tabular-nums">
            {todayEvents.length}
          </p>
          <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">
            {todayEvents.length > 0 ? '即将开始' : '今日清闲'}
          </p>
        </div>

        {/* 完成率 —— 青绿 */}
        <div
          className="relative overflow-hidden bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none p-5 md:p-6 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] border border-black/[0.03] dark:border-white/[0.03] animate-fade-in"
          style={{ animationDelay: '120ms' }}
        >
          <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-success to-transparent opacity-80" />
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-ink-500 dark:text-ink-300 text-sm font-medium tracking-wide">完成率</h3>
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-success/10 text-success">
              <TrendingUp className="w-4 h-4" strokeWidth={1.5} />
            </span>
          </div>
          <p className="text-3xl font-serif font-bold text-success tabular-nums">
            {totalTodosCount > 0 ? Math.round((completedTodosCount / totalTodosCount) * 100) : 0}%
          </p>
          <div className="w-full bg-paper-dark dark:bg-ink-700 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-gradient-to-r from-success to-success h-1.5 rounded-full transition-all duration-700 ease-zen"
              style={{ width: `${totalTodosCount > 0 ? (completedTodosCount / totalTodosCount) * 100 : 0}%` }}
            />
          </div>
        </div>
      </div>

      {/* Today's Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        {/* Todos */}
        <div>
          <h2 className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 mb-4 flex items-center">
            <CheckSquare className="w-5 h-5 mr-2 text-vermilion" strokeWidth={1.5} />
            今日待办
          </h2>

          <div className="space-y-3">
            {todayTodos.length === 0 ? (
              <div className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-8 text-center">
                <p className="text-ink-400 dark:text-ink-300">今日无待办事项</p>
              </div>
            ) : (
              todayTodos.map((todo, index) => (
                <div
                  key={todo.id}
                  className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-4 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <div className="flex items-start space-x-3">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={todo.completed}
                      aria-label={`标记「${todo.title}」为${todo.completed ? '未完成' : '已完成'}`}
                      onClick={() => toggleTodo(todo.id)}
                      className={`w-5 h-5 rounded border-2 mt-0.5 flex-shrink-0 transition-colors duration-200 ${
                        todo.completed
                          ? 'bg-success border-success'
                          : todo.priority === 'high'
                          ? 'border-vermilion'
                          : todo.priority === 'medium'
                          ? 'border-rattan'
                          : 'border-ink-300 dark:border-ink-500'
                      }`}
                    >
                      {todo.completed && (
                        <CheckSquare className="w-3 h-3 text-white m-auto" strokeWidth={3} />
                      )}
                    </button>

                    <div className="flex-1">
                      <h4 className={`font-medium ${todo.completed ? 'text-ink-300 line-through' : 'text-ink-900 dark:text-ink-100'}`}>
                        {todo.title}
                      </h4>
                      {todo.description && (
                        <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">{todo.description}</p>
                      )}
                      <div className="flex items-center mt-2 space-x-2">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            todo.priority === 'high'
                              ? 'bg-vermilion/10 text-vermilion'
                              : todo.priority === 'medium'
                              ? 'bg-rattan/10 text-rattan'
                              : 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300'
                          }`}
                        >
                          {todo.priority === 'high' ? '高优先级' : todo.priority === 'medium' ? '中优先级' : '低优先级'}
                        </span>
                        <button
                          onClick={() => toggleExpand(todo.id)}
                          className="flex items-center gap-1 text-xs text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-300 transition-colors"
                        >
                          {expandedTodos.has(todo.id) ? (
                            <><ChevronUp className="w-3 h-3" strokeWidth={1.5} />收起</>
                          ) : (
                            <><ChevronDown className="w-3 h-3" strokeWidth={1.5} />查看详情</>
                          )}
                        </button>
                      </div>
                      {/* 展开详情 */}
                      {expandedTodos.has(todo.id) && (
                        <div className="mt-3 pt-3 border-t border-paper-dark dark:border-ink-600 animate-fade-in">
                          {todo.description ? (
                            <div>
                              <p className="text-xs text-ink-400 dark:text-ink-300 mb-1">描述</p>
                              <p className="text-sm text-ink-600 dark:text-ink-300 whitespace-pre-wrap">{todo.description}</p>
                            </div>
                          ) : (
                            <p className="text-xs text-ink-400 dark:text-ink-300">暂无详细描述</p>
                          )}
                          <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-ink-400 dark:text-ink-300">创建时间</span>
                              <p className="text-ink-600 dark:text-ink-300 mt-0.5">{format(new Date(todo.createdAt), 'yyyy-MM-dd HH:mm')}</p>
                            </div>
                            <div>
                              <span className="text-ink-400 dark:text-ink-300">截止日期</span>
                              <p className="text-ink-600 dark:text-ink-300 mt-0.5">{todo.dueDate ?? '无'}</p>
                            </div>
                            {todo.completedAt && (
                              <div className="col-span-2">
                                <span className="text-ink-400 dark:text-ink-300">完成时间</span>
                                <p className="text-success mt-0.5">{format(new Date(todo.completedAt), 'yyyy-MM-dd HH:mm')}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Events */}
        <div>
          <h2 className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 mb-4 flex items-center">
            <CalendarIcon className="w-5 h-5 mr-2 text-rattan" strokeWidth={1.5} />
            今日日程
          </h2>

          <div className="space-y-3">
            {todayEvents.length === 0 ? (
              <div className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-8 text-center">
                <p className="text-ink-400 dark:text-ink-300">今日无日程</p>
              </div>
            ) : (
              todayEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-ink-800 rounded-xl shadow-paper dark:shadow-none border border-black/[0.03] dark:border-white/[0.03] p-4 lift-on-hover hover:shadow-paper-lg dark:hover:border-white/[0.07] animate-fade-in"
                  style={{ animationDelay: `${index * 60}ms` }}
                >
                  <h4 className="font-medium text-ink-900 dark:text-ink-100">{event.title}</h4>
                  {event.description && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">{event.description}</p>
                  )}
                  {event.location && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1 flex items-center">
                      <span className="mr-1">&#x1F4CD;</span> {event.location}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm text-ink-500 dark:text-ink-300">
                      {event.isAllDay ? '全天' : formatTime(event.startDate)}
                      {event.endDate && !event.isAllDay && ` - ${formatTime(event.endDate)}`}
                    </span>
                    <button
                      type="button"
                      onClick={() => navigate(`/calendar?date=${toDayKey(event.startDate)}`)}
                      className="flex items-center gap-1 text-xs text-rattan hover:text-rattan/80 transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" strokeWidth={1.5} />
                      在日历中查看
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
