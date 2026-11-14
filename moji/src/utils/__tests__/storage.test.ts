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
  serializeState,
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
    expect(parsed.version).toBe(2);
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
    expect(todo.priority).toBe('none');
    expect(todo.status).toBe('active');
    expect(state.events).toEqual([]);
    expect(state.tags.map((t) => t.id)).toEqual(['tag2']);
    expect(state.tags[0].color).toBe('#8a8a8a');
  });
});

describe('v1 → v2 迁移（completed 布尔 → status）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  function v1Payload(todos: Record<string, unknown>[]): string {
    return JSON.stringify({
      version: 1,
      data: { notes: [], memos: [], todos, events: [], tags: [] },
    });
  }

  it('completed:true → status:"completed" 且 completedAt 原值保留', () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1Payload([
        {
          id: 't1',
          title: '已完成',
          priority: 'low',
          completed: true,
          completedAt: '2025-06-03T10:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ])
    );
    const state = loadState();
    expect(state.todos[0].status).toBe('completed');
    expect(state.todos[0].completedAt).toBe('2025-06-03T10:00:00.000Z');
  });

  it('completed:false → status:"active"，completedAt 不保留', () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1Payload([
        {
          id: 't1',
          title: '未完成',
          priority: 'high',
          completed: false,
          completedAt: '2025-06-03T10:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ])
    );
    const state = loadState();
    expect(state.todos[0].status).toBe('active');
    expect(state.todos[0].completedAt).toBeUndefined();
    expect('completedAt' in state.todos[0]).toBe(false);
  });

  it('priority 原值保留，任务总数不变', () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1Payload([
        { id: 't1', title: '高', priority: 'high', completed: true, completedAt: '2025-06-03T10:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 't2', title: '中', priority: 'medium', completed: false, createdAt: '2025-01-01T00:00:00.000Z' },
        { id: 't3', title: '低', priority: 'low', completed: false, createdAt: '2025-01-01T00:00:00.000Z' },
      ])
    );
    const state = loadState();
    expect(state.todos).toHaveLength(3);
    expect(state.todos.map((t) => t.priority)).toEqual(['high', 'medium', 'low']);
    expect(state.todos.map((t) => t.status)).toEqual(['completed', 'active', 'active']);
  });

  it('缺少 completed 字段的旧条目按 active 处理', () => {
    localStorage.setItem(
      STORAGE_KEY,
      v1Payload([{ id: 't1', title: '无 completed', createdAt: '2025-01-01T00:00:00.000Z' }])
    );
    const state = loadState();
    expect(state.todos[0].status).toBe('active');
  });
});

describe('v2 载荷直读', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('status / abandonedAt / listId / parentId 正确读入', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        data: {
          notes: [],
          memos: [],
          todos: [
            {
              id: 't1',
              title: '已放弃',
              priority: 'none',
              status: 'abandoned',
              abandonedAt: '2025-06-04T08:00:00.000Z',
              listId: 'list-1',
              parentId: 'p1',
              createdAt: '2025-01-01T00:00:00.000Z',
            },
          ],
          events: [],
          tags: [],
          lists: [{ id: 'list-1', name: '工作', color: '#c94043', createdAt: '2025-01-01T00:00:00.000Z' }],
        },
      })
    );
    const state = loadState();
    const todo = state.todos[0];
    expect(todo.status).toBe('abandoned');
    expect(todo.abandonedAt).toBe('2025-06-04T08:00:00.000Z');
    expect(todo.listId).toBe('list-1');
    expect(todo.parentId).toBe('p1');
    expect(todo.priority).toBe('none');
    expect(state.lists[0]).toEqual({
      id: 'list-1',
      name: '工作',
      color: '#c94043',
      createdAt: '2025-01-01T00:00:00.000Z',
    });
  });

  it('非法 status 回落 active；非 abandoned 状态不保留 abandonedAt', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        data: {
          notes: [],
          memos: [],
          todos: [
            { id: 't1', title: '坏状态', status: 'bogus', abandonedAt: '2025-06-04T08:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z' },
            { id: 't2', title: ' active 带放弃时间', status: 'active', abandonedAt: '2025-06-04T08:00:00.000Z', createdAt: '2025-01-01T00:00:00.000Z' },
          ],
          events: [],
          tags: [],
          lists: [],
        },
      })
    );
    const state = loadState();
    expect(state.todos[0].status).toBe('active');
    expect(state.todos[0].abandonedAt).toBeUndefined();
    expect(state.todos[1].abandonedAt).toBeUndefined();
  });

  it('listId / parentId 仅接受非空字符串，否则删除', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 2,
        data: {
          notes: [],
          memos: [],
          todos: [
            { id: 't1', title: 'T', status: 'active', listId: '  ', parentId: 42, createdAt: '2025-01-01T00:00:00.000Z' },
          ],
          events: [],
          tags: [],
          lists: [],
        },
      })
    );
    const state = loadState();
    expect(state.todos[0].listId).toBeUndefined();
    expect(state.todos[0].parentId).toBeUndefined();
  });
});

describe('迁移往返（v1 → normalizeState → serializeState → 再读入）', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('往返后数据等价（任务数、字段一致）', () => {
    const v1Data = {
      notes: [],
      memos: [],
      todos: [
        {
          id: 't1',
          title: '已完成',
          priority: 'low',
          completed: true,
          completedAt: '2025-06-03T10:00:00.000Z',
          dueDate: '2025-06-01T10:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
        {
          id: 't2',
          title: '未完成',
          priority: 'high',
          completed: false,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      events: [],
      tags: [],
    };

    const first = normalizeState(v1Data)!;
    // 迁移本身正确：completed 布尔 → status，dueDate → 日键
    expect(first.todos).toHaveLength(2);
    expect(first.todos[0].status).toBe('completed');
    expect(first.todos[0].completedAt).toBe('2025-06-03T10:00:00.000Z');
    expect(first.todos[0].dueDate).toBe(toDayKey('2025-06-01T10:00:00.000Z'));
    expect(first.todos[1].status).toBe('active');

    // 序列化为 v2 载荷后再读入，应完全等价
    localStorage.setItem(STORAGE_KEY, serializeState(first, 1234));
    const second = loadState();
    expect(second).toEqual(first);
  });
});

describe('initialData 含 lists', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('loadState 空存储时返回含示例清单的初始数据', () => {
    const state = loadState();
    expect(state.lists.length).toBeGreaterThan(0);
    expect(state.lists[0].name).toBeTruthy();
    expect(state.lists[0].color).toMatch(/^#/);
    expect(state.lists[0].createdAt).toBeTruthy();
  });

  it('初始示例任务挂在示例清单下', () => {
    const state = loadState();
    const list = state.lists[0];
    expect(state.todos.some((t) => t.listId === list.id)).toBe(true);
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
    expect(parsed.version).toBe(2);
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
    expect(result.todos[0]).toMatchObject({ priority: 'none', status: 'active' });
    expect(result.events[0]).toMatchObject({ repeat: 'none', isAllDay: false });
    expect(result.tags[0].color).toBe('#8a8a8a');
  });

  it('非法 priority / repeat 回落到默认值（priority 默认 none）', () => {
    const result = sanitize({
      notes: [],
      todos: [{ id: 't1', title: 'T', priority: 'urgent' }],
      events: [{ id: 'e1', title: 'E', startDate: '2025-06-01T10:00:00.000Z', repeat: 'yearly' }],
    })!;
    expect(result.todos[0].priority).toBe('none');
    expect(result.events[0].repeat).toBe('none');
  });
});

describe('List sanitize', () => {
  it('缺 id / name 的清单被拒绝，非法条目剔除', () => {
    const result = sanitize({
      notes: [],
      todos: [],
      lists: [{ id: 'l1' }, { name: '无 id' }, null, 42, []],
    })!;
    expect(result.lists).toEqual([]);
  });

  it('合法清单保留，icon / folderId 可选字段保留', () => {
    const result = sanitize({
      notes: [],
      todos: [],
      lists: [
        {
          id: 'l1',
          name: '工作',
          color: '#c94043',
          icon: 'briefcase',
          folderId: 'folder-1',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
    })!;
    expect(result.lists).toEqual([
      {
        id: 'l1',
        name: '工作',
        color: '#c94043',
        icon: 'briefcase',
        folderId: 'folder-1',
        createdAt: '2025-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('color 缺省补默认值，createdAt 非法时容错补当前时间', () => {
    const result = sanitize({
      notes: [],
      todos: [],
      lists: [{ id: 'l1', name: '清单', createdAt: 'not-a-date' }],
    })!;
    expect(result.lists[0].color).toBe('#8a8a8a');
    expect(result.lists[0].createdAt).toBeTruthy();
    expect(result.lists[0].icon).toBeUndefined();
    expect(result.lists[0].folderId).toBeUndefined();
  });

  it('lists 缺失或非数组时补空数组', () => {
    const result = sanitize({ notes: [], todos: [], lists: 'x' } as unknown)!;
    expect(result.lists).toEqual([]);
    const result2 = sanitize({ notes: [], todos: [] })!;
    expect(result2.lists).toEqual([]);
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
