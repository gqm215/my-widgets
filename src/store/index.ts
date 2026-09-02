
import { create } from 'zustand';
import { AppState, Note, Memo, Todo, Event, Tag } from '@/types';
import { loadState, saveState, generateId, nowISO } from '@/utils/storage';

export interface AppStore extends AppState {
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateNote: (id: string, note: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  addMemo: (memo: Omit<Memo, 'id' | 'createdAt'>) => string;
  updateMemo: (id: string, content: string) => void;
  deleteMemo: (id: string) => void;
  memoToTodo: (id: string) => string | null;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => string;
  updateTodo: (id: string, todo: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => string;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, tag: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  /** 用给定数据整体替换当前状态（用于数据导入） */
  replaceAll: (state: AppState) => void;
}

export const useAppStore = create<AppStore>((set, get) => {
  const initialState = loadState();

  const commit = (next: Partial<AppStore>) => {
    const merged = { ...get(), ...next } as AppStore;
    const persistData: AppState = {
      notes: merged.notes,
      memos: merged.memos,
      todos: merged.todos,
      events: merged.events,
      tags: merged.tags,
    };
    saveState(persistData);
    set(next);
  };

  return {
    ...initialState,

    addNote: (note) => {
      const id = generateId();
      commit({
        notes: [
          { ...note, id, createdAt: nowISO(), updatedAt: nowISO() },
          ...get().notes,
        ],
      });
      return id;
    },

    updateNote: (id, note) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id ? { ...n, ...note, updatedAt: nowISO() } : n
        ),
      }),

    deleteNote: (id) => commit({ notes: get().notes.filter((n) => n.id !== id) }),

    toggleFavoriteNote: (id) =>
      commit({
        notes: get().notes.map((n) =>
          n.id === id
            ? { ...n, isFavorite: !n.isFavorite, updatedAt: nowISO() }
            : n
        ),
      }),

    addMemo: (memo) => {
      const id = generateId();
      commit({ memos: [{ ...memo, id, createdAt: nowISO() }, ...get().memos] });
      return id;
    },

    updateMemo: (id, content) =>
      commit({
        memos: get().memos.map((m) => (m.id === id ? { ...m, content } : m)),
      }),

    deleteMemo: (id) => commit({ memos: get().memos.filter((m) => m.id !== id) }),

    memoToTodo: (id) => {
      const memo = get().memos.find((m) => m.id === id);
      if (!memo) return null;
      const newTodo: Todo = {
        id: generateId(),
        title:
          memo.content.substring(0, 50) +
          (memo.content.length > 50 ? '...' : ''),
        description: memo.content,
        priority: 'medium',
        completed: false,
        createdAt: nowISO(),
      };
      commit({
        memos: get().memos.filter((m) => m.id !== id),
        todos: [newTodo, ...get().todos],
      });
      return newTodo.id;
    },

    addTodo: (todo) => {
      const id = generateId();
      commit({
        todos: [
          { ...todo, id, completed: false, createdAt: nowISO() },
          ...get().todos,
        ],
      });
      return id;
    },

    updateTodo: (id, todo) =>
      commit({
        todos: get().todos.map((t) => (t.id === id ? { ...t, ...todo } : t)),
      }),

    deleteTodo: (id) => commit({ todos: get().todos.filter((t) => t.id !== id) }),

    toggleTodo: (id) =>
      commit({
        todos: get().todos.map((t) => {
          if (t.id !== id) return t;
          const nowCompleted = !t.completed;
          return {
            ...t,
            completed: nowCompleted,
            completedAt: nowCompleted ? nowISO() : undefined,
          };
        }),
      }),

    addEvent: (event) => {
      const id = generateId();
      commit({ events: [{ ...event, id, createdAt: nowISO() }, ...get().events] });
      return id;
    },

    updateEvent: (id, event) =>
      commit({
        events: get().events.map((e) => (e.id === id ? { ...e, ...event } : e)),
      }),

    deleteEvent: (id) =>
      commit({ events: get().events.filter((e) => e.id !== id) }),

    addTag: (tag) =>
      commit({ tags: [...get().tags, { ...tag, id: generateId() }] }),

    updateTag: (id, tag) =>
      commit({
        tags: get().tags.map((t) => (t.id === id ? { ...t, ...tag } : t)),
      }),

    deleteTag: (id) => commit({ tags: get().tags.filter((t) => t.id !== id) }),

    replaceAll: (next) => {
      saveState(next, true);
      set({
        notes: next.notes,
        memos: next.memos,
        todos: next.todos,
        events: next.events,
        tags: next.tags,
      });
    },
  };
});
