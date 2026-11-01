import { useMemo, useState } from 'react';
import { useAppStore } from '@/store';
import {
  generateWeeklyReport,
  getWeekRange,
  reportToMarkdown,
} from '@/utils/report';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  CheckSquare,
  FileText,
  Lightbulb,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui';

/** 导出文件名：与当前展示周对应 */
function getReportFileName(range: { monday: Date; sunday: Date }): string {
  return `周报-${format(range.monday, 'yyyy-MM-dd')}_${format(range.sunday, 'yyyy-MM-dd')}.md`;
}

export default function Report() {
  const todos = useAppStore((s) => s.todos);
  const notes = useAppStore((s) => s.notes);
  const memos = useAppStore((s) => s.memos);
  const events = useAppStore((s) => s.events);

  // 0 = 本周；-1 = 上一周；未来周禁用
  const [weekOffset, setWeekOffset] = useState(0);

  const range = useMemo(() => getWeekRange(weekOffset), [weekOffset]);

  const report = useMemo(
    () => generateWeeklyReport(todos, notes, memos, events, range),
    [todos, notes, memos, events, range]
  );

  const handleExport = () => {
    const md = reportToMarkdown(report);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = getReportFileName(range);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isCurrentWeek = weekOffset === 0;
  const weekScope = isCurrentWeek ? '本周' : '该周';

  const statCards = [
    {
      label: '完成待办',
      value: report.stats.completedTodos,
      icon: CheckSquare,
      color: 'text-vermilion',
      bg: 'bg-vermilion/10',
    },
    {
      label: '新增笔记',
      value: report.stats.newNotes,
      icon: FileText,
      color: 'text-rattan',
      bg: 'bg-rattan/10',
    },
    {
      label: '新增备忘',
      value: report.stats.newMemos,
      icon: Lightbulb,
      color: 'text-success',
      bg: 'bg-success/10',
    },
    {
      label: '日程事件',
      value: report.stats.eventsCount,
      icon: CalendarIcon,
      color: 'text-ink-500 dark:text-ink-300',
      bg: 'bg-ink-100 dark:bg-ink-700',
    },
  ];

  const totalActivity = report.stats.completedTodos + report.stats.newNotes + report.stats.newMemos + report.stats.eventsCount;
  const hasActivity = totalActivity > 0;

  return (
    <div className="p-4 md:p-8 animate-fade-in">
      {/* 头部：标题 + 翻周 + 导出按钮 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-serif font-bold text-ink-900 dark:text-ink-100">
            周报
          </h1>
          <div className="flex items-center gap-2 mt-1">
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev - 1)}
              aria-label="上一周"
              className="p-1 hover:bg-paper-dark dark:hover:bg-ink-700 rounded transition-colors text-ink-500 dark:text-ink-300"
            >
              <ChevronLeft className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <p className="text-ink-500 dark:text-ink-300 text-sm min-w-[190px] text-center">
              {report.weekLabel}
            </p>
            <button
              type="button"
              onClick={() => setWeekOffset((prev) => prev + 1)}
              aria-label="下一周"
              disabled={weekOffset >= 0}
              className="p-1 hover:bg-paper-dark dark:hover:bg-ink-700 rounded transition-colors text-ink-500 dark:text-ink-300 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <ChevronRight className="w-4 h-4" strokeWidth={1.5} />
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              aria-label="回到本周"
              disabled={isCurrentWeek}
              className="ml-1 px-2 py-0.5 text-xs border border-paper-dark dark:border-ink-600 rounded text-ink-500 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              回到本周
            </button>
          </div>
        </div>
        <Button
          onClick={handleExport}
          variant="outline"
          size="md"
          className="self-start sm:self-auto"
        >
          <Download className="w-4 h-4 mr-2" strokeWidth={1.5} />
          导出 Markdown
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 md:p-5 animate-fade-in"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-md ${card.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${card.color}`} strokeWidth={1.5} />
                </div>
                <span className="text-ink-500 dark:text-ink-300 text-xs font-medium">
                  {card.label}
                </span>
              </div>
              <p className="text-2xl md:text-3xl font-serif font-bold text-ink-900 dark:text-ink-100">
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* 活动趋势条 */}
      {hasActivity && (
        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 md:p-5 mb-6 md:mb-8 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-success" strokeWidth={1.5} />
            <span className="text-sm font-medium text-ink-700 dark:text-ink-200">
              {weekScope}活动分布
            </span>
            <span className="text-xs text-ink-400 dark:text-ink-300 ml-auto">
              共 {totalActivity} 项
            </span>
          </div>
          <div className="w-full bg-paper-dark dark:bg-ink-700 rounded-full h-2.5 overflow-hidden flex">
            {report.stats.completedTodos > 0 && (
              <div
                className="bg-vermilion h-full transition-all duration-500"
                style={{ width: `${(report.stats.completedTodos / totalActivity) * 100}%` }}
                title={`待办: ${report.stats.completedTodos}`}
              />
            )}
            {report.stats.newNotes > 0 && (
              <div
                className="bg-rattan h-full transition-all duration-500"
                style={{ width: `${(report.stats.newNotes / totalActivity) * 100}%` }}
                title={`笔记: ${report.stats.newNotes}`}
              />
            )}
            {report.stats.newMemos > 0 && (
              <div
                className="bg-success h-full transition-all duration-500"
                style={{ width: `${(report.stats.newMemos / totalActivity) * 100}%` }}
                title={`备忘: ${report.stats.newMemos}`}
              />
            )}
            {report.stats.eventsCount > 0 && (
              <div
                className="bg-ink-400 dark:bg-ink-500 h-full transition-all duration-500"
                style={{ width: `${(report.stats.eventsCount / totalActivity) * 100}%` }}
                title={`日程: ${report.stats.eventsCount}`}
              />
            )}
          </div>
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-ink-400 dark:text-ink-300">
            {report.stats.completedTodos > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-vermilion" />
                待办 {report.stats.completedTodos}
              </span>
            )}
            {report.stats.newNotes > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-rattan" />
                笔记 {report.stats.newNotes}
              </span>
            )}
            {report.stats.newMemos > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-success" />
                备忘 {report.stats.newMemos}
              </span>
            )}
            {report.stats.eventsCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-ink-400 dark:bg-ink-500" />
                日程 {report.stats.eventsCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 模块活动详情 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
        {report.modules.map((mod, i) => {
          const iconMap: Record<string, React.ElementType> = {
            todo: CheckSquare,
            note: FileText,
            memo: Lightbulb,
            event: CalendarIcon,
          };
          const colorMap: Record<string, string> = {
            todo: 'text-vermilion',
            note: 'text-rattan',
            memo: 'text-success',
            event: 'text-ink-500 dark:text-ink-300',
          };
          const Icon = iconMap[mod.module] || FileText;

          return (
            <div
              key={mod.module}
              className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 md:p-5 animate-fade-in"
              style={{ animationDelay: `${(i + 4) * 60}ms` }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Icon className={`w-4 h-4 ${colorMap[mod.module]}`} strokeWidth={1.5} />
                <h3 className="font-serif font-semibold text-ink-900 dark:text-ink-100">
                  {mod.label}
                </h3>
                <span className="text-xs text-ink-400 dark:text-ink-300 ml-auto">
                  {mod.total} 项
                </span>
              </div>
              {mod.total === 0 ? (
                <p className="text-ink-400 dark:text-ink-300 text-sm py-3 text-center">
                  {weekScope}暂无{mod.label}活动
                </p>
              ) : (
                <ul className="space-y-2">
                  {mod.items.map((item, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 text-sm text-ink-700 dark:text-ink-200"
                    >
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-paper-dark dark:bg-ink-600 flex-shrink-0" />
                      <span className="leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      {/* 日程概览 */}
      {report.events.length > 0 && (
        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 md:p-5 animate-fade-in">
          <h3 className="font-serif font-semibold text-ink-900 dark:text-ink-100 mb-3 flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-ink-500 dark:text-ink-300" strokeWidth={1.5} />
            {weekScope}日程概览
          </h3>
          <div className="space-y-2">
            {report.events.map((evt, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 py-2 px-3 rounded-md bg-paper-accent dark:bg-ink-900/50"
              >
                <span className="text-sm font-medium text-ink-800 dark:text-ink-200 min-w-[80px]">
                  {format(new Date(evt.date), 'M月d日', { locale: zhCN })}
                </span>
                <span className="text-xs text-ink-400 dark:text-ink-300 min-w-[40px]">
                  {format(new Date(evt.date), 'EEEE', { locale: zhCN })}
                </span>
                {evt.isAllDay && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300">
                    全天
                  </span>
                )}
                <span className="text-sm text-ink-700 dark:text-ink-200">{evt.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 空状态 */}
      {!hasActivity && (
        <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-paper-dark dark:bg-ink-700 flex items-center justify-center">
            <FileText className="w-8 h-8 text-ink-300 dark:text-ink-400" strokeWidth={1} />
          </div>
          <p className="text-ink-500 dark:text-ink-300 text-lg font-serif mb-1">
            {weekScope}暂无活动
          </p>
          <p className="text-ink-400 dark:text-ink-400 text-sm">
            {isCurrentWeek ? '开始使用墨集记录你的日常，下周就能看到周报啦' : '可切换回本周查看最新活动'}
          </p>
        </div>
      )}
    </div>
  );
}