import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateWeeklyReport,
  reportToMarkdown,
  getCurrentWeekRange,
  getWeekRange,
  MEMO_SUMMARY_LENGTH,
} from '@/utils/report';
import type { Todo, Note, Memo, Event } from '@/types';

// 固定一个"当前时间"为周三，方便测试本周范围
const NOW = new Date('2025-07-09T12:00:00.000Z'); // 周三

function createInWeek(dayOffset: number, hour = 12): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

function createOutOfWeek(daysAgo: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

describe('getCurrentWeekRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('返回的本周范围包含当前日期', () => {
    const range = getCurrentWeekRange();
    expect(range.monday.getTime()).toBeLessThanOrEqual(NOW.getTime());
    expect(range.sunday.getTime()).toBeGreaterThanOrEqual(NOW.getTime());
  });

  it('周一应当早于或等于周日', () => {
    const range = getCurrentWeekRange();
    expect(range.monday.getTime()).toBeLessThanOrEqual(range.sunday.getTime());
  });

  it('周一是当天 00:00:00.000', () => {
    const range = getCurrentWeekRange();
    expect(range.monday.getHours()).toBe(0);
    expect(range.monday.getMinutes()).toBe(0);
    expect(range.monday.getSeconds()).toBe(0);
    expect(range.monday.getMilliseconds()).toBe(0);
  });

  it('周日精确到当天 23:59:59.999 附近', () => {
    const range = getCurrentWeekRange();
    // endOfWeek 返回当天结束时间
    expect(range.sunday.getHours()).toBe(23);
    expect(range.sunday.getMinutes()).toBe(59);
    expect(range.sunday.getSeconds()).toBe(59);
  });
});

describe('generateWeeklyReport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('对空数据返回零统计的周报', () => {
    const report = generateWeeklyReport([], [], [], []);
    expect(report.stats.completedTodos).toBe(0);
    expect(report.stats.newNotes).toBe(0);
    expect(report.stats.newMemos).toBe(0);
    expect(report.stats.eventsCount).toBe(0);
    expect(report.modules.length).toBe(4);
  });

  it('正确统计本周完成的待办', () => {
    const todos: Todo[] = [
      { id: '1', title: 'Done this week', priority: 'high', completed: true, completedAt: createInWeek(0), createdAt: createOutOfWeek(5) },
      { id: '2', title: 'Done last week', priority: 'medium', completed: true, completedAt: createOutOfWeek(10), createdAt: createOutOfWeek(10) },
      { id: '3', title: 'Not done', priority: 'low', completed: false, createdAt: createInWeek(0) },
    ];
    const report = generateWeeklyReport(todos, [], [], []);
    expect(report.stats.completedTodos).toBe(1);
    expect(report.completedTodos[0].id).toBe('1');
  });

  it('正确统计本周新增笔记', () => {
    const notes: Note[] = [
      { id: 'n1', title: 'This week', content: '', tags: [], isFavorite: false, createdAt: createInWeek(1), updatedAt: createInWeek(1) },
      { id: 'n2', title: 'Old', content: '', tags: [], isFavorite: false, createdAt: createOutOfWeek(20), updatedAt: createOutOfWeek(20) },
    ];
    const report = generateWeeklyReport([], notes, [], []);
    expect(report.stats.newNotes).toBe(1);
  });

  it('正确统计本周新增备忘', () => {
    const memos: Memo[] = [
      { id: 'm1', content: 'Quick memo', createdAt: createInWeek(-1) },
      { id: 'm2', content: 'Old memo', createdAt: createOutOfWeek(30) },
    ];
    const report = generateWeeklyReport([], [], memos, []);
    expect(report.stats.newMemos).toBe(1);
  });

  it('正确统计本周日程', () => {
    const events: Event[] = [
      { id: 'e1', title: 'Meeting', startDate: createInWeek(2), isAllDay: false, repeat: 'none', createdAt: createOutOfWeek(5) },
      { id: 'e2', title: 'Old event', startDate: createOutOfWeek(14), isAllDay: true, repeat: 'none', createdAt: createOutOfWeek(14) },
    ];
    const report = generateWeeklyReport([], [], [], events);
    expect(report.stats.eventsCount).toBe(1);
    expect(report.events[0].title).toBe('Meeting');
  });

  it('模块统计中包含正确的 items 内容', () => {
    const todos: Todo[] = [
      { id: 't1', title: 'Task A', priority: 'high', completed: true, completedAt: createInWeek(0), createdAt: createOutOfWeek(5) },
    ];
    const report = generateWeeklyReport(todos, [], [], []);
    const todoModule = report.modules.find((m) => m.module === 'todo')!;
    expect(todoModule.total).toBe(1);
    expect(todoModule.items).toContain('Task A');
  });

  it('备忘内容超过 60 字符时截断', () => {
    const longContent = 'A'.repeat(100);
    const memos: Memo[] = [
      { id: 'm1', content: longContent, createdAt: createInWeek(0) },
    ];
    const report = generateWeeklyReport([], [], memos, []);
    const memoModule = report.modules.find((m) => m.module === 'memo')!;
    expect(memoModule.items[0].endsWith('...')).toBe(true);
    expect(memoModule.items[0].length).toBeLessThan(longContent.length);
  });

  it('备忘内容正好 60 字符时不截断', () => {
    const exactContent = 'A'.repeat(60);
    const memos: Memo[] = [
      { id: 'm1', content: exactContent, createdAt: createInWeek(0) },
    ];
    const report = generateWeeklyReport([], [], memos, []);
    const memoModule = report.modules.find((m) => m.module === 'memo')!;
    expect(memoModule.items[0]).toBe(exactContent);
    expect(memoModule.items[0].endsWith('...')).toBe(false);
  });

  it('备忘内容 61 字符时截断', () => {
    const overContent = 'A'.repeat(61);
    const memos: Memo[] = [
      { id: 'm1', content: overContent, createdAt: createInWeek(0) },
    ];
    const report = generateWeeklyReport([], [], memos, []);
    const memoModule = report.modules.find((m) => m.module === 'memo')!;
    expect(memoModule.items[0].endsWith('...')).toBe(true);
    expect(memoModule.items[0].length).toBe(63); // 60 chars + '...'
  });

  it('weekLabel 包含正确的中文日期格式', () => {
    const report = generateWeeklyReport([], [], [], []);
    expect(report.weekLabel).toMatch(/\d{4}年\d{1,2}月\d{1,2}日 - \d{1,2}月\d{1,2}日/);
  });
});

describe('reportToMarkdown', () => {
  it('生成包含周报标题的 Markdown', () => {
    const report = generateWeeklyReport([], [], [], []);
    const md = reportToMarkdown(report);
    expect(md).toContain('# 📊 周报');
    expect(md).toContain('## 📈 本周概览');
    expect(md).toContain('## 📋 本周活动详情');
  });

  it('生成的 Markdown 包含正确的统计数字', () => {
    const report = generateWeeklyReport([], [], [], []);
    const md = reportToMarkdown(report);
    expect(md).toContain('| ✅ 完成待办 | 0 |');
    expect(md).toContain('| 📝 新增笔记 | 0 |');
    expect(md).toContain('| 💡 新增备忘 | 0 |');
    expect(md).toContain('| 📅 日程事件 | 0 |');
  });

  it('有日程时包含日程部分', () => {
    const report = {
      ...generateWeeklyReport([], [], [], []),
      events: [{ title: 'Team Standup', date: new Date(NOW).toISOString(), isAllDay: false }],
    };
    const md = reportToMarkdown(report);
    expect(md).toContain('## 📅 本周日程');
    expect(md).toContain('Team Standup');
  });

  it('以"由墨集自动生成"结尾', () => {
    const report = generateWeeklyReport([], [], [], []);
    const md = reportToMarkdown(report);
    expect(md).toContain('由墨集自动生成');
  });

  it('零模块项在 Markdown 中被跳过', () => {
    const report = generateWeeklyReport([], [], [], []);
    const md = reportToMarkdown(report);
    // 所有模块 total 都是 0，应全部跳过
    expect(md).not.toContain('### 待办事项');
    expect(md).not.toContain('### 笔记');
    expect(md).not.toContain('### 备忘');
    expect(md).not.toContain('### 日程');
  });
});
describe('getWeekRange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('offsetWeeks=0 与 getCurrentWeekRange 结果一致', () => {
    expect(getWeekRange(0).monday.getTime()).toBe(getCurrentWeekRange().monday.getTime());
    expect(getWeekRange(0).sunday.getTime()).toBe(getCurrentWeekRange().sunday.getTime());
  });

  it('offsetWeeks=-1 表示上一周（提前 7 天）', () => {
    const current = getWeekRange(0);
    const previous = getWeekRange(-1);
    expect(current.monday.getTime() - previous.monday.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(current.sunday.getTime() - previous.sunday.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('offsetWeeks=1 表示下一周（延后 7 天）', () => {
    const current = getWeekRange(0);
    const next = getWeekRange(1);
    expect(next.monday.getTime() - current.monday.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
    expect(next.sunday.getTime() - current.sunday.getTime()).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it('周一是本地周一 00:00，周日是本地周日 23:59:59.999', () => {
    const range = getWeekRange(3);
    expect(range.monday.getDay()).toBe(1);
    expect(range.sunday.getDay()).toBe(0);
    expect(range.monday.getHours()).toBe(0);
    expect(range.sunday.getHours()).toBe(23);
    expect(range.sunday.getMinutes()).toBe(59);
    expect(range.sunday.getSeconds()).toBe(59);
    expect(range.sunday.getMilliseconds()).toBe(999);
  });

  it('非法 offset 回退到本周', () => {
    expect(getWeekRange(Number.NaN).monday.getTime()).toBe(getWeekRange(0).monday.getTime());
  });
});

describe('generateWeeklyReport 指定周范围', () => {
  const monday = new Date(2025, 5, 2, 0, 0, 0, 0); // 2025-06-02 周一
  const sunday = new Date(2025, 5, 8, 23, 59, 59, 999); // 2025-06-08 周日
  const range = { monday, sunday };

  function inRangeISO(day: number, hour = 12): string {
    return new Date(2025, 5, day, hour).toISOString();
  }

  it('按传入范围统计并生成 weekLabel', () => {
    const notes: Note[] = [
      { id: 'n1', title: '范围内', content: '', tags: [], isFavorite: false, createdAt: inRangeISO(3), updatedAt: inRangeISO(3) },
      { id: 'n2', title: '范围外', content: '', tags: [], isFavorite: false, createdAt: inRangeISO(20), updatedAt: inRangeISO(20) },
    ];
    const memos: Memo[] = [
      { id: 'm1', content: '范围内备忘', createdAt: inRangeISO(2, 1) },
      { id: 'm2', content: '范围外备忘', createdAt: inRangeISO(9) },
    ];
    const events: Event[] = [
      { id: 'e1', title: '范围内日程', startDate: inRangeISO(5), isAllDay: false, repeat: 'none', createdAt: inRangeISO(1) },
      { id: 'e2', title: '范围外日程', startDate: inRangeISO(9, 0), isAllDay: false, repeat: 'none', createdAt: inRangeISO(1) },
    ];
    const todos: Todo[] = [
      { id: 't1', title: '范围内完成', priority: 'high', completed: true, completedAt: inRangeISO(4), createdAt: inRangeISO(1) },
    ];

    const report = generateWeeklyReport(todos, notes, memos, events, range);
    expect(report.stats).toEqual({ completedTodos: 1, newNotes: 1, newMemos: 1, eventsCount: 1 });
    expect(report.weekLabel).toContain('2025年6月2日');
    expect(report.weekLabel).toContain('6月8日');
  });

  it('非法日期字段被忽略', () => {
    const report = generateWeeklyReport(
      [{ id: 't1', title: 'x', priority: 'high', completed: true, completedAt: 'bad', createdAt: 'bad' }],
      [{ id: 'n1', title: 'x', content: '', tags: [], isFavorite: false, createdAt: 'bad', updatedAt: 'bad' }],
      [{ id: 'm1', content: 'x', createdAt: 'bad' }],
      [{ id: 'e1', title: 'x', startDate: 'bad', isAllDay: false, repeat: 'none', createdAt: 'bad' }],
      range
    );
    expect(report.stats).toEqual({ completedTodos: 0, newNotes: 0, newMemos: 0, eventsCount: 0 });
  });
});

describe('备忘截断边界', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('摘要长度常量为 60', () => {
    expect(MEMO_SUMMARY_LENGTH).toBe(60);
  });

  it('emoji 按码点截断，不会切断代理对', () => {
    const content = '😀'.repeat(61);
    const memos: Memo[] = [{ id: 'm1', content, createdAt: createInWeek(0) }];
    const report = generateWeeklyReport([], [], memos, []);
    const item = report.modules.find((m) => m.module === 'memo')!.items[0];
    expect(item.endsWith('...')).toBe(true);
    expect(Array.from(item)).toHaveLength(63);
    expect(item.length).toBe(60 * 2 + 3);
    const head = item.slice(0, item.length - 3);
    expect(Array.from(head)).toHaveLength(60);
    expect(Array.from(head).every((char) => char === '😀')).toBe(true);
  });

  it('正好 60 个 emoji 不截断', () => {
    const content = '😀'.repeat(60);
    const memos: Memo[] = [{ id: 'm1', content, createdAt: createInWeek(0) }];
    const report = generateWeeklyReport([], [], memos, []);
    const item = report.modules.find((m) => m.module === 'memo')!.items[0];
    expect(item).toBe(content);
    expect(item.endsWith('...')).toBe(false);
  });
});
