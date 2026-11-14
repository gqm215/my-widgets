
import { create } from 'zustand';
import { AppState, List, Note, Memo, Todo, Event, Tag, Priority } from '@/types';
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
  addTodo: (
    todo: Omit<Todo, 'id' | 'createdAt' | 'priority' | 'status' | 'completedAt' | 'abandonedAt'> & {
      priority?: Priority;
    }
  ) => string;
  updateTodo: (id: string, todo: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;
  /** 放弃待办（仅顶层任务；对子任务或不存在的 id 一律 no-op） */
  abandonTodo: (id: string) => void;
  /** 恢复 abandoned 待办为 active（仅当前 status==='abandoned' 才生效；completed 任务恢复走 updateTodo） */
  restoreTodo: (id: string) => void;
  /** 添加子任务（仅一层；父必须存在且为顶层任务，否则返回 null） */
  addSubtask: (parentId: string, title: string) => string | null;
  /** 移动顶层待办到目标清单；listId 为 null/空串表示落收集箱；目标清单不存在时 no-op */
  moveTodoToList: (id: string, listId: string | null) => void;
  addEvent: (event: Omit<Event, 'id' | 'createdAt'>) => string;
  updateEvent: (id: string, event: Partial<Event>) => void;
  deleteEvent: (id: string) => void;
  addTag: (tag: Omit<Tag, 'id'>) => void;
  updateTag: (id: string, tag: Partial<Tag>) => void;
  deleteTag: (id: string) => void;
  addList: (name: string, color?: string, icon?: string) => string;
  /** 仅允许编辑 name/color/icon 三字段；folderId 一期不开放（D1 预留但不开放编辑） */
  updateList: (
    id: string,
    patch: { name?: string; color?: string; icon?: string }
  ) => void;
  /** 删除清单：清单下待办的 listId 清空落收集箱，不删任务（C1） */
  deleteList: (id: string) => void;
  /** 返回当前状态的纯数据快照（数组为浅拷贝，不触发持久化，用于导出） */
  snapshot: () => AppState;
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
      lists: merged.lists,
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
        priority: 'none',
        status: 'active',
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
          {
            ...todo,
            id,
            priority: todo.priority ?? 'none',
            status: 'active',
            createdAt: nowISO(),
          },
          ...get().todos,
        ],
      });
      return id;
    },

    updateTodo: (id, todo) =>
      commit({
        todos: get().todos.map((t) => {
          if (t.id !== id) return t;

          // 维护时间戳不变量：
          // status==='completed' ⇔ completedAt 存在；status==='abandoned' ⇔ abandonedAt 存在
          const hasCompletedAtPatch = Object.prototype.hasOwnProperty.call(
            todo,
            'completedAt'
          );
          const hasAbandonedAtPatch = Object.prototype.hasOwnProperty.call(
            todo,
            'abandonedAt'
          );
          const status = todo.status ?? t.status;
          let completedAt = hasCompletedAtPatch ? todo.completedAt : t.completedAt;
          let abandonedAt = hasAbandonedAtPatch ? todo.abandonedAt : t.abandonedAt;
          if (status === 'completed' && !completedAt) completedAt = nowISO();
          if (status !== 'completed') completedAt = undefined;
          if (status === 'abandoned' && !abandonedAt) abandonedAt = nowISO();
          if (status !== 'abandoned') abandonedAt = undefined;

          const next: Todo = { ...t, ...todo, status };
          if (completedAt === undefined) {
            delete next.completedAt;
          } else {
            next.completedAt = completedAt;
          }
          if (abandonedAt === undefined) {
            delete next.abandonedAt;
          } else {
            next.abandonedAt = abandonedAt;
          }
          return next;
        }),
      }),

    deleteTodo: (id) =>
      commit({
        // D4 父删子删：删除父任务时级联删除其全部子任务；删除子任务本身为单删
        todos: get().todos.filter((t) => t.id !== id && t.parentId !== id),
      }),

    toggleTodo: (id) =>
      commit({
        todos: get().todos.map((t) => {
          if (t.id !== id) return t;
          const nowCompleted = t.status !== 'completed';
          return {
            ...t,
            status: nowCompleted ? 'completed' : 'active',
            completedAt: nowCompleted ? nowISO() : undefined,
          };
        }),
      }),

    abandonTodo: (id) => {
      const todo = get().todos.find((t) => t.id === id);
      // 仅顶层任务可放弃；对子任务或不存在的 id 一律 no-op
      if (!todo || todo.parentId) return;
      // 构造 patch 走 updateTodo，由其维护 completed/abandoned 互斥不变量（D3）
      get().updateTodo(id, { status: 'abandoned' });
    },

    restoreTodo: (id) => {
      const todo = get().todos.find((t) => t.id === id);
      // 仅当前处于 abandoned 的顶层任务可恢复；
      // completed 任务的「恢复」走 updateTodo 设 status，此处 no-op
      if (!todo || todo.parentId || todo.status !== 'abandoned') return;
      get().updateTodo(id, { status: 'active' });
    },

    addSubtask: (parentId, title) => {
      const parent = get().todos.find((t) => t.id === parentId);
      // 父任务必须存在且为顶层任务（子任务仅一层，D4）
      if (!parent || parent.parentId) return null;
      const id = generateId();
      commit({
        todos: [
          {
            id,
            title,
            priority: 'none',
            status: 'active',
            parentId,
            createdAt: nowISO(),
          },
          ...get().todos,
        ],
      });
      return id;
    },

    moveTodoToList: (id, listId) => {
      const todo = get().todos.find((t) => t.id === id);
      // 仅顶层任务可移动清单；对子任务 no-op
      if (!todo || todo.parentId) return;
      // 目标清单必须存在于 lists，否则 no-op（防御）；null/空串表示落收集箱
      if (listId && !get().lists.some((l) => l.id === listId)) return;
      commit({
        todos: get().todos.map((t) => {
          if (t.id === id) {
            if (listId) return { ...t, listId };
            const next: Todo = { ...t };
            delete next.listId;
            return next;
          }
          // 子任务跟随父：移动父任务时同步清空子任务携带的独立 listId（防御历史数据）
          if (t.parentId === id && t.listId !== undefined) {
            const next: Todo = { ...t };
            delete next.listId;
            return next;
          }
          return t;
        }),
      });
    },

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

    updateTag: (id, tag) => {
      const previous = get().tags.find((t) => t.id === id);
      const tags = get().tags.map((t) => (t.id === id ? { ...t, ...tag } : t));
      const next: Partial<AppStore> = { tags };

      // 改名级联：笔记的 tags 里存的是标签名称，需要同步重写
      if (
        previous &&
        typeof tag.name === 'string' &&
        tag.name !== previous.name
      ) {
        const oldName = previous.name;
        const newName = tag.name;
        next.notes = get().notes.map((n) =>
          n.tags.includes(oldName)
            ? { ...n, tags: n.tags.map((name) => (name === oldName ? newName : name)) }
            : n
        );
      }

      commit(next);
    },

    deleteTag: (id) => {
      const previous = get().tags.find((t) => t.id === id);
      const tags = get().tags.filter((t) => t.id !== id);
      if (!previous) {
        commit({ tags });
        return;
      }
      // 级联移除：从所有笔记的 tags 中删掉该标签名
      const notes = get().notes.map((n) =>
        n.tags.includes(previous.name)
          ? { ...n, tags: n.tags.filter((name) => name !== previous.name) }
          : n
      );
      commit({ tags, notes });
    },

    addList: (name, color, icon) => {
      const id = generateId();
      const list: List = {
        id,
        name,
        color: color ?? '#8a8a8a',
        createdAt: nowISO(),
      };
      if (icon) list.icon = icon;
      commit({ lists: [...get().lists, list] });
      return id;
    },

    updateList: (id, patch) => {
      // 仅允许编辑 name/color/icon；folderId 一期不开放（D1 预留但不开放编辑）
      // patch 语义：显式传 undefined 的字段 = 清空（D18：清单一期只做空白+色点，需支持移除图标）
      const next: Partial<List> = {};
      const clear: Partial<List> = {};
      if (patch.name !== undefined) next.name = patch.name;
      if (patch.color !== undefined) next.color = patch.color;
      if (patch.icon !== undefined) next.icon = patch.icon;
      if (Object.prototype.hasOwnProperty.call(patch, 'icon') && patch.icon === undefined) {
        clear.icon = undefined;
      }
      commit({
        lists: get().lists.map((l) => {
          if (l.id !== id) return l;
          const merged: List = { ...l, ...next, ...clear };
          if (merged.icon === undefined) delete merged.icon;
          return merged;
        }),
      });
    },

    deleteList: (id) => {
      commit({
        lists: get().lists.filter((l) => l.id !== id),
        // C1：删除清单不删任务，清单下待办的 listId 清空落收集箱
        todos: get().todos.map((t) => {
          if (t.listId !== id) return t;
          const next: Todo = { ...t };
          delete next.listId;
          return next;
        }),
      });
    },

    snapshot: (): AppState => {
      const { notes, memos, todos, events, tags, lists } = get();
      return {
        notes: [...notes],
        memos: [...memos],
        todos: [...todos],
        events: [...events],
        tags: [...tags],
        lists: [...lists],
      };
    },

    replaceAll: (next) => {
      saveState(next, true);
      set({
        notes: next.notes,
        memos: next.memos,
        todos: next.todos,
        events: next.events,
        tags: next.tags,
        lists: next.lists,
      });
    },
  };
});
