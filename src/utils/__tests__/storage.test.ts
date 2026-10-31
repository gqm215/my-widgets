import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateId,
  loadState,
  saveState,
  importState,
  resetState,
  flushState,
  sanitize,
  normalizeState,
} from '@/utils/storage';
import { toDayKey } from '@/utils/date';

const STORAGE_KEY = 'moji-app-data';

/** 构造一条最小可用旧版 Todo（dueDate 为 ISO） */
function legacyTodoRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'legacy-todo',
    title: '旧版待办',
    priority: 'high',
    dueDate: '2025-06-01T10:00:00.000Z',
    completed: false,
    createdAt: '2025-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('generateId', () => {
  it('应该返回一个非空字符串', () => {
    const id = generateId();
    expect(id).toBeTruthy();
    expect(typeof id).toBe('string');
  });

  it('应该生成不同的 ID', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe('saveState / loadState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState 在 localStorage 为空时返回初始数据', () => {
    const state = loadState();
    expect(state.notes.length).toBeGreaterThan(0);
    expect(state.todos.length).toBeGreaterThan(0);
    expect(state.memos.length).toBeGreaterThan(0);
    expect(state.events.length).toBeGreaterThan(0);
    expect(state.tags.length).toBeGreaterThan(0);
  });

  it('初始数据的 dueDate 为本地日键', () => {
    const state = loadState();
    const todo = state.todos.find((t) => t.id === 'welcome-todo-1')!;
    expect(todo.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('loadState 应该在首次加载时将初始数据写入 localStorage', () => {
    vi.useFakeTimers();
    localStorage.clear();
    loadState();
    // saveState 使用防抖，需要推进定时器
    vi.advanceTimersByTime(300);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.data.notes.length).toBeGreaterThan(0);
    vi.useRealTimers();
  });

  it('saveState 立即保存数据到 localStorage', () => {
    const state = loadState();
    localStorage.clear();
    saveState(state, true);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
  });

  it('loadState 能正确读取已保存的数据', () => {
    const state = loadState();
    const updatedState = { ...state, notes: [...state.notes, { id: 'test', title: 'Test', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }] };
    saveState(updatedState, true);

    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, data: updatedState }));

    const loaded = loadState();
    expect(loaded.notes.some((n) => n.id === 'test')).toBe(true);
  });

  it('loadState 兼容旧版本直接存储 AppState 的格式', () => {
    localStorage.clear();
    const oldFormat = {
      notes: [{ id: 'old', title: 'Old', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
      memos: [],
      todos: [],
      events: [],
      tags: [],
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(oldFormat));
    const state = loadState();
    expect(state.notes[0].id).toBe('old');
  });

  it('loadState 在 localStorage 数据损坏时返回初始数据', () => {
    localStorage.setItem(STORAGE_KEY, 'not-valid-json');
    const state = loadState();
    expect(state.notes.length).toBeGreaterThan(0);
  });

  it('saveState 支持防抖写入', () => {
    vi.useFakeTimers();
    const state = loadState();
    saveState(state);
    // 防抖期间不应立即写入
    let raw = localStorage.getItem(STORAGE_KEY);
    // 初始数据可能已经在 loadState 时写入，清除后再测
    localStorage.clear();
    saveState(state);
    raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeNull();

    vi.advanceTimersByTime(300);
    raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    vi.useRealTimers();
  });

  it('连续 saveState 只写最后一次状态', () => {
    vi.useFakeTimers();
    const state = loadState();
    const first = { ...state, memos: [] };
    const second = { ...state, memos: [{ id: 'latest', content: '最新', createdAt: '2025-01-01T00:00:00.000Z' }] };
    saveState(first);
    saveState(second);
    vi.advanceTimersByTime(300);

    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.data.memos).toHaveLength(1);
    expect(parsed.data.memos[0].id).toBe('latest');
    vi.useRealTimers();
  });
});

describe('loadState 数据迁移', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('旧版 ISO dueDate 迁移为本地日键', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          notes: [],
          memos: [],
          todos: [legacyTodoRaw()],
          events: [],
          tags: [],
        },
      })
    );
    const state = loadState();
    expect(state.todos[0].dueDate).toBe(toDayKey('2025-06-01T10:00:00.000Z'));
    expect(state.todos[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('非法 startDate 的日程在加载时丢弃并 warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          notes: [],
          memos: [],
          todos: [],
          events: [
            { id: 'bad-event', title: '坏日程', startDate: 'not-a-date', isAllDay: false, repeat: 'none', createdAt: '2025-01-01T00:00:00.000Z' },
            { id: 'good-event', title: '好日程', startDate: '2025-06-01T10:00:00.000Z', isAllDay: false, repeat: 'none', createdAt: '2025-01-01T00:00:00.000Z' },
          ],
          tags: [],
        },
      })
    );
    const state = loadState();
    expect(state.events.map((e) => e.id)).toEqual(['good-event']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('条目级脏数据在加载时被丢弃', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        data: {
          notes: [{ id: 'no-title' }, { title: 'no-id' }, { id: 'ok', title: '正常' }],
          memos: [{ content: 'no-id' }, { id: 'm1', content: '正常' }],
          todos: [{ id: 't1' }, { id: 't2', title: '正常' }],
          events: [{ id: 'e1' }],
          tags: [{ id: 'tag1' }, { id: 'tag2', name: '正常' }],
        },
      })
    );
    const state = loadState();
    expect(state.notes.map((n) => n.id)).toEqual(['ok']);
    expect(state.memos.map((m) => m.id)).toEqual(['m1']);
    const todo = state.todos.find((t) => t.id === 't2')!;
    expect(todo.priority).toBe('medium');
    expect(todo.completed).toBe(false);
    expect(state.events).toEqual([]);
    expect(state.tags.map((t) => t.id)).toEqual(['tag2']);
    expect(state.tags[0].color).toBe('#8a8a8a');
  });
});

describe('importState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('importState 成功导入有效 JSON 数据', () => {
    const jsonData = JSON.stringify({
      notes: [{ id: 'imp', title: 'Imported', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
      memos: [],
      todos: [],
      events: [],
      tags: [],
    });
    const result = importState(jsonData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notes[0].title).toBe('Imported');
    }
  });

  it('importState 兼容带 version 字段的格式', () => {
    const jsonData = JSON.stringify({
      version: 1,
      data: {
        notes: [{ id: 'v1', title: 'V1', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
        memos: [],
        todos: [],
        events: [],
        tags: [],
      },
    });
    const result = importState(jsonData);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.notes[0].title).toBe('V1');
    }
  });

  it('importState 迁移旧 dueDate 并写盘', () => {
    const result = importState(
      JSON.stringify({ notes: [], memos: [], todos: [legacyTodoRaw()], events: [], tags: [] })
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.todos[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(parsed.data.todos[0].dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('importState 对无效 JSON 返回失败', () => {
    const result = importState('invalid-json');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBeTruthy();
  });

  it('importState 失败时不修改 localStorage', () => {
    localStorage.setItem(STORAGE_KEY, 'existing-data');
    const failCases = ['invalid-json', 'null', JSON.stringify({ notes: [] })];
    for (const text of failCases) {
      const result = importState(text);
      expect(result.ok).toBe(false);
      expect(localStorage.getItem(STORAGE_KEY)).toBe('existing-data');
    }
  });

  it('importState 对缺少必要字段的数据返回失败', () => {
    const result = importState(JSON.stringify({ notes: [] }));
    expect(result.ok).toBe(false);
  });

  it('importState 对非对象数据返回失败', () => {
    const result = importState('null');
    expect(result.ok).toBe(false);
  });
});

describe('resetState', () => {
  it('resetState 返回初始数据', () => {
    const state = resetState();
    expect(state.notes.length).toBeGreaterThan(0);
    expect(state.todos.length).toBeGreaterThan(0);
  });

  it('resetState 将初始数据写入 localStorage', () => {
    localStorage.clear();
    resetState();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
  });
});

describe('flushState', () => {
  it('flushState 立即写出挂起状态', () => {
    vi.useFakeTimers();
    localStorage.clear();
    const state = loadState();
    saveState(state);
    // 防抖未到期前不写盘
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    flushState();
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(1);
    expect(parsed.data.notes.length).toBe(state.notes.length);
    vi.useRealTimers();
  });

  it('flushState 后推进定时器不会重复写入', () => {
    vi.useFakeTimers();
    localStorage.clear();
    const setItem = vi.spyOn(localStorage, 'setItem');
    const state = loadState();
    saveState(state);
    flushState();
    expect(setItem).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(1000);
    expect(setItem).toHaveBeenCalledTimes(1);
    // 无挂起状态时再次 flush 也不写
    flushState();
    expect(setItem).toHaveBeenCalledTimes(1);
    setItem.mockRestore();
    vi.useRealTimers();
  });

  it('无挂起状态时 flush 不写盘且不抛错', () => {
    localStorage.clear();
    const setItem = vi.spyOn(localStorage, 'setItem');
    expect(() => flushState()).not.toThrow();
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it('saveState(immediate) 后 flush 不抛错', () => {
    const state = loadState();
    saveState(state, true);
    expect(() => flushState()).not.toThrow();
  });
});

describe('saveState 异常处理', () => {
  it('saveState 写入失败时不传播异常', () => {
    // 模拟 QuotaExceededError
    const originalSetItem = localStorage.setItem;
    localStorage.setItem = vi.fn(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });

    const state = loadState();
    expect(() => saveState(state, true)).not.toThrow();
    expect(() => flushState()).not.toThrow();

    localStorage.setItem = originalSetItem;
  });
});

describe('sanitize', () => {
  it('{ notes: [], todos: null } 安全处理，返回 null 而不崩溃', () => {
    expect(() => sanitize({ notes: [], todos: null })).not.toThrow();
    const result = sanitize({ notes: [], todos: null });
    expect(result).toBeNull();
  });

  it('{ notes: "string" } 返回 null', () => {
    expect(() => sanitize({ notes: 'string' as unknown as object })).not.toThrow();
    const result = sanitize({ notes: 'string' as unknown as object });
    expect(result).toBeNull();
  });

  it('数组元素含无效字段不应崩溃', () => {
    const data = {
      notes: [{ id: 'n1', title: 'Test', extraField: 'should be ignored', invalidField: undefined }],
      todos: [{ id: 't1', title: 'Todo', priority: 'high', completed: false, createdAt: '2025-01-01T00:00:00.000Z', extra: 123 }],
      memos: [],
      events: [],
      tags: [],
    };
    expect(() => sanitize(data)).not.toThrow();
    const result = sanitize(data);
    expect(result).not.toBeNull();
    expect(result!.notes.length).toBe(1);
    expect(result!.todos.length).toBe(1);
  });

  it('额外属性应被忽略', () => {
    const data = {
      notes: [],
      todos: [],
      extraProp: 'should be ignored',
      anotherExtra: { nested: true },
    };
    expect(() => sanitize(data)).not.toThrow();
    const result = sanitize(data);
    expect(result).not.toBeNull();
    // 额外属性不应出现在结果中
    expect((result as unknown as Record<string, unknown>).extraProp).toBeUndefined();
    expect((result as unknown as Record<string, unknown>).anotherExtra).toBeUndefined();
  });

  it('缺失的集合补空数组', () => {
    const result = sanitize({ notes: [], todos: [] })!;
    expect(result.memos).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it('非数组集合按缺失处理', () => {
    const result = sanitize({ notes: [], todos: [], memos: 'x', events: null, tags: {} } as unknown)!;
    expect(result.memos).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it('丢弃缺 id / title 的条目', () => {
    const result = sanitize({
      notes: [{ id: 'n1' }, { title: '无 id' }, null, 42, []],
      memos: [{ content: '无 id' }, null],
      todos: [{ id: 't1' }, { title: '无 id' }, 'x'],
      events: [{ id: 'e1' }, { title: '无 id' }],
      tags: [{ id: 'tag1' }, { name: '无 id' }],
    })!;
    expect(result.notes).toEqual([]);
    expect(result.memos).toEqual([]);
    expect(result.todos).toEqual([]);
    expect(result.events).toEqual([]);
    expect(result.tags).toEqual([]);
  });

  it('补默认值：priority / completed / isFavorite / tags / repeat / isAllDay', () => {
    const result = sanitize({
      notes: [{ id: 'n1', title: 'N' }],
      memos: [{ id: 'm1' }],
      todos: [{ id: 't1', title: 'T' }],
      events: [{ id: 'e1', title: 'E', startDate: '2025-06-01T10:00:00.000Z' }],
      tags: [{ id: 'tag1', name: '标签' }],
    })!;
    expect(result.notes[0]).toMatchObject({ content: '', tags: [], isFavorite: false });
    expect(result.memos[0].content).toBe('');
    expect(result.todos[0]).toMatchObject({ priority: 'medium', completed: false });
    expect(result.events[0]).toMatchObject({ repeat: 'none', isAllDay: false });
    expect(result.tags[0].color).toBe('#8a8a8a');
  });

  it('非法 priority / repeat 回落到默认值', () => {
    const result = sanitize({
      notes: [],
      todos: [{ id: 't1', title: 'T', priority: 'urgent' }],
      events: [{ id: 'e1', title: 'E', startDate: '2025-06-01T10:00:00.000Z', repeat: 'yearly' }],
    })!;
    expect(result.todos[0].priority).toBe('medium');
    expect(result.events[0].repeat).toBe('none');
  });
});

describe('normalizeState', () => {
  it('迁移旧版 ISO dueDate 为本地日键', () => {
    const state = normalizeState({
      notes: [],
      todos: [legacyTodoRaw()],
      memos: [],
      events: [],
      tags: [],
    })!;
    expect(state.todos[0].dueDate).toBe(toDayKey('2025-06-01T10:00:00.000Z'));
  });

  it('已是日键的 dueDate 保持不变', () => {
    const state = normalizeState({
      notes: [],
      todos: [legacyTodoRaw({ dueDate: '2025-06-01' })],
      memos: [],
      events: [],
      tags: [],
    })!;
    expect(state.todos[0].dueDate).toBe('2025-06-01');
  });

  it('非法 dueDate 被移除', () => {
    const state = normalizeState({
      notes: [],
      todos: [legacyTodoRaw({ dueDate: 'not-a-date' })],
      memos: [],
      events: [],
      tags: [],
    })!;
    expect(state.todos[0].dueDate).toBeUndefined();
    expect('dueDate' in state.todos[0]).toBe(false);
  });

  it('非法 startDate 的日程被丢弃并 console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = normalizeState({
      notes: [],
      todos: [],
      events: [
        { id: 'bad', title: '坏日程', startDate: 'not-a-date' },
        { id: 'missing', title: '缺日期' },
        { id: 'ok', title: '好日程', startDate: '2025-06-01T10:00:00.000Z' },
      ],
      memos: [],
      tags: [],
    })!;
    expect(state.events.map((e) => e.id)).toEqual(['ok']);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('非法 endDate 仅移除该字段并 warn，事件保留', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const state = normalizeState({
      notes: [],
      todos: [],
      events: [
        { id: 'e1', title: '事件', startDate: '2025-06-01T10:00:00.000Z', endDate: 'bad' },
      ],
      memos: [],
      tags: [],
    })!;
    expect(state.events).toHaveLength(1);
    expect(state.events[0].endDate).toBeUndefined();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('合法 endDate 归一化为 ISO', () => {
    const state = normalizeState({
      notes: [],
      todos: [],
      events: [
        { id: 'e1', title: '事件', startDate: '2025-06-01T10:00:00.000Z', endDate: '2025-06-01T12:00:00.000Z' },
      ],
      memos: [],
      tags: [],
    })!;
    expect(state.events[0].endDate).toBe(new Date('2025-06-01T12:00:00.000Z').toISOString());
  });

  it('结构非法返回 null', () => {
    expect(normalizeState(null)).toBeNull();
    expect(normalizeState({ notes: null, todos: [] })).toBeNull();
    expect(normalizeState({ notes: [], todos: 'x' })).toBeNull();
  });
});
