import type { AppState, Event, Memo, Note, Tag, Todo } from '@/types';

const BASE_ISO = '2025-06-02T09:00:00.000Z';

let seq = 0;
const nextId = (prefix: string): string => `${prefix}-${++seq}`;

export function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: nextId('note'),
    title: '测试笔记',
    content: '这是一条测试笔记内容',
    tags: [],
    isFavorite: false,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
    ...overrides,
  };
}

export function makeMemo(overrides: Partial<Memo> = {}): Memo {
  return {
    id: nextId('memo'),
    content: '测试备忘',
    createdAt: BASE_ISO,
    ...overrides,
  };
}

export function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: nextId('todo'),
    title: '测试待办',
    priority: 'medium',
    completed: false,
    createdAt: BASE_ISO,
    ...overrides,
  };
}

export function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: nextId('event'),
    title: '测试日程',
    startDate: BASE_ISO,
    isAllDay: false,
    repeat: 'none',
    createdAt: BASE_ISO,
    ...overrides,
  };
}

export function makeTag(overrides: Partial<Tag> = {}): Tag {
  return {
    id: nextId('tag'),
    name: '测试标签',
    color: '#c94043',
    ...overrides,
  };
}

/** 空的 AppState（页面测试默认从空数据开始） */
export function emptyState(): AppState {
  return { notes: [], memos: [], todos: [], events: [], tags: [] };
}

/** 构造一份完整的 AppState，未提供的集合为空 */
export function seedState(partial: Partial<AppState> = {}): AppState {
  return { ...emptyState(), ...partial };
}
