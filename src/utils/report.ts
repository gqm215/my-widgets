import { startOfWeek, endOfWeek, isWithinInterval, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import type { Todo, Note, Memo, Event } from '@/types';

/** 本周时间范围（周一 00:00 ~ 周日 23:59:59.999） */
export function getCurrentWeekRange() {
  const now = new Date();
  const monday = startOfWeek(now, { weekStartsOn: 1 });
  const sunday = endOfWeek(now, { weekStartsOn: 1 });
  return { monday, sunday };
}

/** 判断一个 ISO 日期字符串是否在本周范围内 */
function isInCurrentWeek(isoDate: string | undefined | null, range: { monday: Date; sunday: Date }): boolean {
  if (!isoDate) return false;
  const date = new Date(isoDate);
  return isWithinInterval(date, { start: range.monday, end: range.sunday });
}

/** 按模块分类的统计 */
export interface ModuleStats {
  module: string;
  label: string;
  total: number;
  items: string[];
}

/** 周报数据结构 */
export interface WeeklyReport {
  weekLabel: string;
  stats: {
    completedTodos: number;
    newNotes: number;
    newMemos: number;
    eventsCount: number;
  };
  modules: ModuleStats[];
  events: { title: string; date: string; isAllDay: boolean }[];
  completedTodos: Todo[];
}

/** 从应用状态生成周报数据 */
export function generateWeeklyReport(
  todos: Todo[],
  notes: Note[],
  memos: Memo[],
  events: Event[]
): WeeklyReport {
  const range = getCurrentWeekRange();

  // 本周完成的待办
  const completedTodos = todos.filter(
    (t) => t.completed && isInCurrentWeek(t.completedAt, range)
  );

  // 本周新增笔记
  const newNotes = notes.filter((n) => isInCurrentWeek(n.createdAt, range));

  // 本周新增备忘
  const newMemos = memos.filter((m) => isInCurrentWeek(m.createdAt, range));

  // 本周日程事件
  const weekEvents = events.filter((e) => isInCurrentWeek(e.startDate, range));

  // 按模块分类汇总
  const modules: ModuleStats[] = [
    {
      module: 'todo',
      label: '待办事项',
      total: completedTodos.length,
      items: completedTodos.map((t) => t.title),
    },
    {
      module: 'note',
      label: '笔记',
      total: newNotes.length,
      items: newNotes.map((n) => n.title),
    },
    {
      module: 'memo',
      label: '备忘',
      total: newMemos.length,
      items: newMemos.map((m) => m.content.length > 60 ? m.content.substring(0, 60) + '...' : m.content),
    },
    {
      module: 'event',
      label: '日程',
      total: weekEvents.length,
      items: weekEvents.map((e) => e.title),
    },
  ];

  const weekLabel = `${format(range.monday, 'yyyy年M月d日', { locale: zhCN })} - ${format(range.sunday, 'M月d日', { locale: zhCN })}`;

  return {
    weekLabel,
    stats: {
      completedTodos: completedTodos.length,
      newNotes: newNotes.length,
      newMemos: newMemos.length,
      eventsCount: weekEvents.length,
    },
    modules,
    events: weekEvents.map((e) => ({
      title: e.title,
      date: e.startDate,
      isAllDay: e.isAllDay,
    })),
    completedTodos,
  };
}

/** 将周报数据导出为 Markdown 字符串 */
export function reportToMarkdown(report: WeeklyReport): string {
  const lines: string[] = [];

  lines.push(`# 📊 周报`);
  lines.push('');
  lines.push(`**${report.weekLabel}**`);
  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('## 📈 本周概览');
  lines.push('');
  lines.push(`| 指标 | 数量 |`);
  lines.push(`|------|------|`);
  lines.push(`| ✅ 完成待办 | ${report.stats.completedTodos} |`);
  lines.push(`| 📝 新增笔记 | ${report.stats.newNotes} |`);
  lines.push(`| 💡 新增备忘 | ${report.stats.newMemos} |`);
  lines.push(`| 📅 日程事件 | ${report.stats.eventsCount} |`);
  lines.push('');

  // 模块活动
  lines.push('---');
  lines.push('');
  lines.push('## 📋 本周活动详情');
  lines.push('');

  for (const mod of report.modules) {
    if (mod.total === 0) continue;
    lines.push(`### ${mod.label}（${mod.total}）`);
    lines.push('');
    for (const item of mod.items) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // 日程概览
  if (report.events.length > 0) {
    lines.push('---');
    lines.push('');
    lines.push('## 📅 本周日程');
    lines.push('');
    for (const evt of report.events) {
      const dateStr = format(new Date(evt.date), 'M月d日 EEEE', { locale: zhCN });
      const type = evt.isAllDay ? '全天' : '';
      lines.push(`- **${dateStr}** ${type} ${evt.title}`);
    }
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push(`> 由墨集自动生成 · ${format(new Date(), 'yyyy-MM-dd HH:mm')}`);

  return lines.join('\n');
}