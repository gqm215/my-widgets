import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateWeeklyReport, reportToMarkdown, getCurrentWeekRange } from '@/utils/report';
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
    const events: Event[] = [
      { id: 'e1', title: 'Team Standup', startDate: new Date(NOW).toISOString(), isAllDay: false, repeat: 'none', createdAt: new Date(NOW).toISOString() },
    ];
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