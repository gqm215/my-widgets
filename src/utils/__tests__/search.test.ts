import { describe, it, expect } from 'vitest';
import { searchAll, type SearchResultItem } from '@/utils/search';
import { makeEvent, makeMemo, makeNote, makeTodo, seedState } from '@/test/fixtures';

function find(results: SearchResultItem[], type: SearchResultItem['type'], id: string) {
  return results.find((item) => item.type === type && item.id === id);
}

describe('searchAll', () => {
  const state = seedState({
    notes: [
      makeNote({
        id: 'note-title',
        title: 'Meeting Notes',
        content: '讨论 #项目 计划\n第二行',
      }),
      makeNote({
        id: 'note-content',
        title: '周记',
        content: '今天的会议记录：**MVP** 范围确认',
      }),
      makeNote({ id: 'note-miss', title: '无关笔记', content: '没有关键词' }),
    ],
    memos: [
      makeMemo({ id: 'memo-hit', content: '灵感：做一个 meeting 提醒器' }),
      makeMemo({ id: 'memo-miss', content: '随便写写' }),
    ],
    todos: [
      makeTodo({ id: 'todo-title', title: 'MEETING 准备', priority: 'high' }),
      makeTodo({ id: 'todo-desc', title: '整理材料', description: '为 meeting 准备提纲' }),
      makeTodo({ id: 'todo-miss', title: '买菜' }),
    ],
    events: [
      makeEvent({ id: 'event-title', title: '团队 Meeting' }),
      makeEvent({ id: 'event-desc', title: '评审', description: '设计 meeting 复盘' }),
      makeEvent({ id: 'event-loc', title: '线下活动', location: 'Meeting Room 3' }),
      makeEvent({ id: 'event-miss', title: '健身' }),
    ],
  });

  it('空白查询返回空数组', () => {
    expect(searchAll(state, '')).toEqual([]);
    expect(searchAll(state, '   ')).toEqual([]);
    expect(searchAll(state, undefined as unknown as string)).toEqual([]);
  });

  it('大小写不敏感匹配', () => {
    const results = searchAll(state, 'MEETING');
    expect(results.length).toBeGreaterThan(0);
    expect(find(results, 'note', 'note-title')).toBeTruthy();
    expect(find(results, 'todo', 'todo-title')).toBeTruthy();
  });

  it('笔记标题命中优先并返回 title 字段', () => {
    const results = searchAll(state, 'meeting');
    const note = find(results, 'note', 'note-title')!;
    expect(note.matchedField).toBe('title');
    expect(note.title).toBe('Meeting Notes');
    expect(note.route).toBe('/notes/note-title');
  });

  it('笔记正文命中时 matchedField 为 content，且摘要围绕命中位置', () => {
    const results = searchAll(state, 'MVP');
    const note = find(results, 'note', 'note-content')!;
    expect(note.matchedField).toBe('content');
    expect(note.snippet).toContain('MVP');
    // Markdown 语法字符被清洗
    expect(note.snippet).not.toContain('#');
    expect(note.snippet).not.toContain('*');
  });

  it('笔记仅标题命中时摘要取正文前 80 字', () => {
    const longContent = '正'.repeat(200);
    const onlyTitle = seedState({
      notes: [makeNote({ id: 'n1', title: '独特关键词', content: longContent })],
    });
    const results = searchAll(onlyTitle, '独特关键词');
    expect(results).toHaveLength(1);
    expect(results[0].matchedField).toBe('title');
    expect(results[0].snippet.length).toBe(80);
    expect(results[0].snippet).toBe('正'.repeat(80));
  });

  it('备忘只匹配内容，标题为内容截断且超过 50 字加省略号', () => {
    const memoState = seedState({
      memos: [makeMemo({ id: 'long', content: `${'A'.repeat(60)} 关键词` })],
    });
    const results = searchAll(memoState, '关键词');
    expect(results).toHaveLength(1);
    expect(results[0].matchedField).toBe('content');
    expect(results[0].route).toBe('/memos');
    expect(results[0].title).toBe(`${'A'.repeat(50)}...`);
    expect(results[0].snippet).toContain('关键词');
  });

  it('备忘内容不超过 50 字时标题为完整内容', () => {
    const shortMemo = seedState({
      memos: [makeMemo({ id: 'short', content: '短备忘关键词' })],
    });
    const results = searchAll(shortMemo, '关键词');
    expect(results[0].title).toBe('短备忘关键词');
  });

  it('待办匹配标题或描述，并带对应 matchedField', () => {
    const byTitle = searchAll(state, 'MEETING');
    expect(find(byTitle, 'todo', 'todo-title')!.matchedField).toBe('title');

    const byDescription = searchAll(state, '提纲');
    const todo = find(byDescription, 'todo', 'todo-desc')!;
    expect(todo.matchedField).toBe('description');
    expect(todo.snippet).toBe('为 meeting 准备提纲');
    expect(todo.route).toBe('/todos');
  });

  it('日程匹配标题 / 描述 / 地点', () => {
    const results = searchAll(state, 'meeting');
    expect(find(results, 'event', 'event-title')!.matchedField).toBe('title');
    expect(find(results, 'event', 'event-desc')!.matchedField).toBe('description');
    const locOnly = searchAll(state, 'Room');
    expect(find(locOnly, 'event', 'event-loc')!.matchedField).toBe('location');
    expect(find(locOnly, 'event', 'event-loc')!.route).toBe('/events');
  });

  it('标题命中排在正文命中之前，同组保持类型顺序 note→memo→todo→event', () => {
    const results = searchAll(state, 'meeting');
    const titleHits = results.filter((item) => item.matchedField === 'title');

    // 所有标题命中都在正文命中之前
    const firstNonTitle = results.findIndex((item) => item.matchedField !== 'title');
    if (firstNonTitle !== -1) {
      expect(results.slice(firstNonTitle).every((item) => item.matchedField !== 'title')).toBe(true);
    }
    // 标题命中组内类型顺序
    const typeOrder = ['note', 'memo', 'todo', 'event'];
    const indices = titleHits.map((item) => typeOrder.indexOf(item.type));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
    expect(titleHits.length).toBeGreaterThan(0);
  });

  it('结果按排序后截断 limit', () => {
    const results = searchAll(state, 'meeting', 2);
    expect(results).toHaveLength(2);
    expect(results[0].matchedField).toBe('title');
  });

  it('limit 为 0 或负数返回空数组', () => {
    expect(searchAll(state, 'meeting', 0)).toEqual([]);
    expect(searchAll(state, 'meeting', -1)).toEqual([]);
  });

  it('limit 非数字时使用默认值', () => {
    const results = searchAll(state, 'meeting', Number.NaN);
    expect(results.length).toBeGreaterThan(0);
  });

  it('无匹配返回空数组', () => {
    expect(searchAll(state, '不存在的关键词xyz')).toEqual([]);
  });

  it('空状态不抛错', () => {
    expect(searchAll({ notes: [], memos: [], todos: [], events: [] }, 'x')).toEqual([]);
  });

  it('缺失集合（undefined）不抛错', () => {
    expect(
      searchAll({ notes: [] } as unknown as Parameters<typeof searchAll>[0], 'x')
    ).toEqual([]);
  });
});
