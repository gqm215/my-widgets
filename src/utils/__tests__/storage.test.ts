import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  generateId,
  loadState,
  saveState,
  importState,
  resetState,
  flushState,
  sanitize,
} from '@/utils/storage';

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

  it('loadState 应该在首次加载时将初始数据写入 localStorage', () => {
    vi.useFakeTimers();
    localStorage.clear();
    loadState();
    // saveState 使用防抖，需要推进定时器
    vi.advanceTimersByTime(300);
    const raw = localStorage.getItem('moji-app-data');
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
    const raw = localStorage.getItem('moji-app-data');
    expect(raw).toBeTruthy();
  });

  it('loadState 能正确读取已保存的数据', () => {
    const state = loadState();
    const updatedState = { ...state, notes: [...state.notes, { id: 'test', title: 'Test', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }] };
    saveState(updatedState, true);

    localStorage.clear();
    localStorage.setItem('moji-app-data', JSON.stringify({ version: 1, data: updatedState }));

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
    localStorage.setItem('moji-app-data', JSON.stringify(oldFormat));
    const state = loadState();
    expect(state.notes[0].id).toBe('old');
  });

  it('loadState 在 localStorage 数据损坏时返回初始数据', () => {
    localStorage.setItem('moji-app-data', 'not-valid-json');
    const state = loadState();
    expect(state.notes.length).toBeGreaterThan(0);
  });

  it('saveState 支持防抖写入', () => {
    vi.useFakeTimers();
    const state = loadState();
    saveState(state);
    // 防抖期间不应立即写入
    let raw = localStorage.getItem('moji-app-data');
    // 初始数据可能已经在 loadState 时写入，清除后再测
    localStorage.clear();
    saveState(state);
    raw = localStorage.getItem('moji-app-data');
    expect(raw).toBeNull();

    vi.advanceTimersByTime(300);
    raw = localStorage.getItem('moji-app-data');
    expect(raw).toBeTruthy();
    vi.useRealTimers();
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

  it('importState 对无效 JSON 返回失败', () => {
    const result = importState('invalid-json');
    expect(result.ok).toBe(false);
    expect((result as { ok: false; error: string }).error).toBeTruthy();
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
    const raw = localStorage.getItem('moji-app-data');
    expect(raw).toBeTruthy();
  });
});

describe('flushState', () => {
  it('flushState 清除挂起的定时器且不抛出错误', () => {
    vi.useFakeTimers();
    const state = loadState();
    saveState(state);
    expect(() => flushState()).not.toThrow();
    vi.useRealTimers();
  });

  it('flushState 无定时器时调用不抛错', () => {
    expect(() => flushState()).not.toThrow();
  });

  it('flushState 有定时器时调用后确保不再触发写入', () => {
    vi.useFakeTimers();
    const state = loadState();
    localStorage.clear();
    saveState(state);
    flushState();
    // 推进时间，应该不再写入
    vi.advanceTimersByTime(500);
    const raw = localStorage.getItem('moji-app-data');
    expect(raw).toBeNull();
    vi.useRealTimers();
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
});