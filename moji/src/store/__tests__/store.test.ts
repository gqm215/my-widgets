import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage module before store imports
vi.mock('@/utils/storage', () => {
  let idCounter = 0;
  return {
    generateId: vi.fn(() => `test-id-${++idCounter}`),
    nowISO: vi.fn(() => '2025-07-09T12:00:00.000Z'),
    loadState: vi.fn(() => ({
      notes: [
        {
          id: 'n1',
          title: 'Test Note',
          content: 'Content',
          tags: [],
          isFavorite: false,
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      memos: [
        {
          id: 'm1',
          content: 'Test Memo',
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      todos: [
        {
          id: 't1',
          title: 'Test Todo',
          priority: 'medium' as const,
          status: 'active' as const,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      events: [
        {
          id: 'e1',
          title: 'Test Event',
          startDate: '2025-01-01T00:00:00.000Z',
          isAllDay: false,
          repeat: 'none' as const,
          createdAt: '2025-01-01T00:00:00.000Z',
        },
      ],
      tags: [{ id: 'tag1', name: 'test', color: '#000' }],
      lists: [],
    })),
    saveState: vi.fn(),
  };
});

import { useAppStore } from '@/store';
import { saveState } from '@/utils/storage';
import { makeEvent, makeList, makeMemo, makeNote, makeTodo } from '@/test/fixtures';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState(useAppStore.getInitialState());
    vi.clearAllMocks();
  });

  describe('笔记操作', () => {
    it('addNote 添加笔记并返回 ID', () => {
      const id = useAppStore.getState().addNote({
        title: 'New Note',
        content: 'New Content',
        tags: [],
        isFavorite: false,
      });
      expect(id).toBeTruthy();
      const notes = useAppStore.getState().notes;
      expect(notes.some((n) => n.id === id)).toBe(true);
      expect(notes.find((n) => n.id === id)?.title).toBe('New Note');
      expect(saveState).toHaveBeenCalled();
    });

    it('updateNote 更新笔记内容', () => {
      useAppStore.getState().updateNote('n1', { title: 'Updated Title' });
      const note = useAppStore.getState().notes.find((n) => n.id === 'n1');
      expect(note?.title).toBe('Updated Title');
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteNote 删除笔记', () => {
      useAppStore.getState().deleteNote('n1');
      const notes = useAppStore.getState().notes;
      expect(notes.some((n) => n.id === 'n1')).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('toggleFavoriteNote 切换收藏状态', () => {
      const initial = useAppStore.getState().notes.find((n) => n.id === 'n1')!.isFavorite;
      useAppStore.getState().toggleFavoriteNote('n1');
      const toggled = useAppStore.getState().notes.find((n) => n.id === 'n1')!.isFavorite;
      expect(toggled).toBe(!initial);
      expect(saveState).toHaveBeenCalled();
    });

    it('toggleFavoriteNote 多笔记时只切换目标笔记', () => {
      useAppStore.setState({
        notes: [...useAppStore.getState().notes, makeNote({ id: 'n2' })],
      });
      useAppStore.getState().toggleFavoriteNote('n1');
      const notes = useAppStore.getState().notes;
      expect(notes.find((n) => n.id === 'n1')!.isFavorite).toBe(true);
      expect(notes.find((n) => n.id === 'n2')!.isFavorite).toBe(false);
    });
  });

  describe('备忘操作', () => {
    it('addMemo 添加备忘并返回 ID', () => {
      const id = useAppStore.getState().addMemo({ content: 'New Memo' });
      expect(id).toBeTruthy();
      const memos = useAppStore.getState().memos;
      expect(memos.some((m) => m.id === id)).toBe(true);
      expect(saveState).toHaveBeenCalled();
    });

    it('updateMemo 更新备忘内容', () => {
      useAppStore.getState().updateMemo('m1', 'Updated Memo Content');
      const memo = useAppStore.getState().memos.find((m) => m.id === 'm1');
      expect(memo?.content).toBe('Updated Memo Content');
      expect(saveState).toHaveBeenCalled();
    });

    it('updateMemo 多备忘时只更新目标备忘', () => {
      useAppStore.setState({
        memos: [...useAppStore.getState().memos, makeMemo({ id: 'm2' })],
      });
      useAppStore.getState().updateMemo('m1', '更新内容');
      const memos = useAppStore.getState().memos;
      expect(memos.find((m) => m.id === 'm1')?.content).toBe('更新内容');
      expect(memos.find((m) => m.id === 'm2')?.content).toBe('测试备忘');
    });

    it('deleteMemo 删除备忘', () => {
      useAppStore.getState().deleteMemo('m1');
      const memos = useAppStore.getState().memos;
      expect(memos.some((m) => m.id === 'm1')).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    describe('memoToTodo', () => {
      it('备忘转待办，标题不超过 50 字符时不截断', () => {
        const id = useAppStore.getState().memoToTodo('m1');
        expect(id).toBeTruthy();
        const todo = useAppStore.getState().todos.find((t) => t.id === id);
        expect(todo?.title).toBe('Test Memo');
        expect(todo?.description).toBe('Test Memo');
        expect(todo?.priority).toBe('none');
        expect(todo?.status).toBe('active');
        // 备忘应该被删除
        const memos = useAppStore.getState().memos;
        expect(memos.some((m) => m.id === 'm1')).toBe(false);
        expect(saveState).toHaveBeenCalled();
      });

      it('备忘转待办，标题超过 50 字符时截断并加 ...', () => {
        // 先添加一条长备忘
        const longContent = 'A'.repeat(60);
        const memoId = useAppStore.getState().addMemo({ content: longContent });
        vi.clearAllMocks(); // 清除 addMemo 产生的 saveState 调用

        const todoId = useAppStore.getState().memoToTodo(memoId);
        const todo = useAppStore.getState().todos.find((t) => t.id === todoId);
        expect(todo?.title).toBe('A'.repeat(50) + '...');
        expect(todo?.description).toBe(longContent);
        expect(saveState).toHaveBeenCalled();
      });

      it('备忘不存在时返回 null', () => {
        const id = useAppStore.getState().memoToTodo('nonexistent');
        expect(id).toBeNull();
      });
    });
  });

  describe('待办操作', () => {
    it('addTodo 添加待办并返回 ID', () => {
      const id = useAppStore.getState().addTodo({
        title: 'New Todo',
        priority: 'high',
      });
      expect(id).toBeTruthy();
      const todos = useAppStore.getState().todos;
      expect(todos.some((t) => t.id === id)).toBe(true);
      expect(todos.find((t) => t.id === id)?.status).toBe('active');
      expect(saveState).toHaveBeenCalled();
    });

    it('addTodo 未传 priority 时缺省为 none', () => {
      const id = useAppStore.getState().addTodo({ title: '无优先级待办' });
      const todo = useAppStore.getState().todos.find((t) => t.id === id);
      expect(todo?.priority).toBe('none');
    });

    it('updateTodo 更新待办', () => {
      useAppStore.getState().updateTodo('t1', { title: 'Updated Todo' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1');
      expect(todo?.title).toBe('Updated Todo');
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteTodo 删除待办', () => {
      useAppStore.getState().deleteTodo('t1');
      const todos = useAppStore.getState().todos;
      expect(todos.some((t) => t.id === 't1')).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    describe('toggleTodo', () => {
      it('toggleTodo 将未完成待办切换为完成，并设置 completedAt', () => {
        useAppStore.getState().toggleTodo('t1');
        const todo = useAppStore.getState().todos.find((t) => t.id === 't1');
        expect(todo?.status).toBe('completed');
        expect(todo?.completedAt).toBe('2025-07-09T12:00:00.000Z');
        expect(saveState).toHaveBeenCalled();
      });

      it('toggleTodo 将已完成待办切换为未完成，并清除 completedAt', () => {
        // 先切换为完成
        useAppStore.getState().toggleTodo('t1');
        vi.clearAllMocks();

        // 再切换回未完成
        useAppStore.getState().toggleTodo('t1');
        const todo = useAppStore.getState().todos.find((t) => t.id === 't1');
        expect(todo?.status).toBe('active');
        expect(todo?.completedAt).toBeUndefined();
        expect(saveState).toHaveBeenCalled();
      });
    });
  });

  describe('日程操作', () => {
    it('addEvent 添加日程并返回 ID', () => {
      const id = useAppStore.getState().addEvent({
        title: 'New Event',
        startDate: '2025-07-09T12:00:00.000Z',
        isAllDay: false,
        repeat: 'none',
      });
      expect(id).toBeTruthy();
      const events = useAppStore.getState().events;
      expect(events.some((e) => e.id === id)).toBe(true);
      expect(saveState).toHaveBeenCalled();
    });

    it('updateEvent 更新日程', () => {
      useAppStore.getState().updateEvent('e1', { title: 'Updated Event' });
      const event = useAppStore.getState().events.find((e) => e.id === 'e1');
      expect(event?.title).toBe('Updated Event');
      expect(saveState).toHaveBeenCalled();
    });

    it('updateEvent 多日程时只更新目标日程', () => {
      useAppStore.setState({
        events: [...useAppStore.getState().events, makeEvent({ id: 'e2' })],
      });
      useAppStore.getState().updateEvent('e1', { title: '更新日程' });
      const events = useAppStore.getState().events;
      expect(events.find((e) => e.id === 'e1')?.title).toBe('更新日程');
      expect(events.find((e) => e.id === 'e2')?.title).toBe('测试日程');
    });

    it('deleteEvent 删除日程', () => {
      useAppStore.getState().deleteEvent('e1');
      const events = useAppStore.getState().events;
      expect(events.some((e) => e.id === 'e1')).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('标签操作', () => {
    it('addTag 添加标签', () => {
      useAppStore.getState().addTag({ name: 'new-tag', color: '#fff' });
      const tags = useAppStore.getState().tags;
      expect(tags.some((t) => t.name === 'new-tag')).toBe(true);
      expect(tags.find((t) => t.name === 'new-tag')?.color).toBe('#fff');
      expect(saveState).toHaveBeenCalled();
    });

    it('updateTag 更新标签', () => {
      useAppStore.getState().updateTag('tag1', { name: 'updated-tag', color: '#ff0' });
      const tag = useAppStore.getState().tags.find((t) => t.id === 'tag1');
      expect(tag?.name).toBe('updated-tag');
      expect(tag?.color).toBe('#ff0');
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteTag 删除标签', () => {
      useAppStore.getState().deleteTag('tag1');
      const tags = useAppStore.getState().tags;
      expect(tags.some((t) => t.id === 'tag1')).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('replaceAll', () => {
    it('replaceAll 替换全部数据', () => {
      const newState = {
        notes: [{ id: 'r1', title: 'Replaced', content: '', tags: [], isFavorite: false, createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-01T00:00:00.000Z' }],
        memos: [],
        todos: [],
        events: [],
        tags: [],
        lists: [],
      };
      useAppStore.getState().replaceAll(newState);
      const state = useAppStore.getState();
      expect(state.notes.length).toBe(1);
      expect(state.notes[0].title).toBe('Replaced');
      expect(state.memos.length).toBe(0);
      expect(state.todos.length).toBe(0);
      expect(state.events.length).toBe(0);
      expect(state.tags.length).toBe(0);
      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('updateNote 对不存在的 ID 不抛错', () => {
      expect(() => {
        useAppStore.getState().updateNote('nonexistent', { title: 'Noop' });
      }).not.toThrow();
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteNote 对不存在的 ID 静默成功', () => {
      expect(() => {
        useAppStore.getState().deleteNote('nonexistent');
      }).not.toThrow();
      const notes = useAppStore.getState().notes;
      expect(notes.length).toBe(1); // 初始笔记数量不变
      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('并发提交', () => {
    it('同一 tick 内连续新增不会丢失彼此的数据', () => {
      vi.clearAllMocks();
      const noteId = useAppStore.getState().addNote({
        title: '并发笔记',
        content: '',
        tags: [],
        isFavorite: false,
      });
      const todoId = useAppStore.getState().addTodo({ title: '并发待办', priority: 'low' });
      const memoId = useAppStore.getState().addMemo({ content: '并发备忘' });

      const state = useAppStore.getState();
      expect(state.notes.some((n) => n.id === noteId)).toBe(true);
      expect(state.todos.some((t) => t.id === todoId)).toBe(true);
      expect(state.memos.some((m) => m.id === memoId)).toBe(true);

      // 最后一次持久化的数据包含全部连续变更
      const calls = vi.mocked(saveState).mock.calls;
      const lastPersisted = calls[calls.length - 1][0];
      expect(lastPersisted.notes.some((n) => n.id === noteId)).toBe(true);
      expect(lastPersisted.todos.some((t) => t.id === todoId)).toBe(true);
      expect(lastPersisted.memos.some((m) => m.id === memoId)).toBe(true);
    });
  });

  describe('snapshot', () => {
    it('返回全部五个集合的浅拷贝', () => {
      const state = useAppStore.getState();
      const snapshot = state.snapshot();
      expect(snapshot.notes).not.toBe(state.notes);
      expect(snapshot.memos).not.toBe(state.memos);
      expect(snapshot.todos).not.toBe(state.todos);
      expect(snapshot.events).not.toBe(state.events);
      expect(snapshot.tags).not.toBe(state.tags);
      expect(snapshot.notes).toEqual(state.notes);
      expect(snapshot.memos).toEqual(state.memos);
      expect(snapshot.todos).toEqual(state.todos);
      expect(snapshot.events).toEqual(state.events);
      expect(snapshot.tags).toEqual(state.tags);
    });

    it('不触发持久化', () => {
      vi.clearAllMocks();
      useAppStore.getState().snapshot();
      expect(saveState).not.toHaveBeenCalled();
    });

    it('修改快照数组不影响 store', () => {
      const snapshot = useAppStore.getState().snapshot();
      snapshot.notes.push({
        id: 'snap-note',
        title: '快照',
        content: '',
        tags: [],
        isFavorite: false,
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedAt: '2025-01-01T00:00:00.000Z',
      });
      expect(useAppStore.getState().notes.some((n) => n.id === 'snap-note')).toBe(false);
    });
  });

  describe('标签级联', () => {
    function seedTaggedNotes() {
      useAppStore.setState({
        notes: [
          {
            id: 'n1',
            title: '带标签笔记',
            content: '',
            tags: ['test', '其他'],
            isFavorite: false,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
          {
            id: 'n2',
            title: '无标签笔记',
            content: '',
            tags: ['无关'],
            isFavorite: false,
            createdAt: '2025-01-01T00:00:00.000Z',
            updatedAt: '2025-01-01T00:00:00.000Z',
          },
        ],
      });
    }

    it('updateTag 改名时级联重写笔记 tags', () => {
      seedTaggedNotes();
      useAppStore.getState().updateTag('tag1', { name: 'renamed' });

      const note = useAppStore.getState().notes.find((n) => n.id === 'n1')!;
      expect(note.tags).toEqual(['renamed', '其他']);
      const untouched = useAppStore.getState().notes.find((n) => n.id === 'n2')!;
      expect(untouched.tags).toEqual(['无关']);
      expect(saveState).toHaveBeenCalled();
    });

    it('updateTag 只改颜色时不改动笔记 tags', () => {
      seedTaggedNotes();
      useAppStore.getState().updateTag('tag1', { color: '#123456' });

      const note = useAppStore.getState().notes.find((n) => n.id === 'n1')!;
      expect(note.tags).toEqual(['test', '其他']);
    });

    it('updateTag 名称不变时不重复重写', () => {
      seedTaggedNotes();
      useAppStore.getState().updateTag('tag1', { name: 'test' });
      const note = useAppStore.getState().notes.find((n) => n.id === 'n1')!;
      expect(note.tags).toEqual(['test', '其他']);
    });

    it('updateTag 对不存在的标签不抛错', () => {
      seedTaggedNotes();
      expect(() => useAppStore.getState().updateTag('missing', { name: 'x' })).not.toThrow();
      expect(useAppStore.getState().notes).toHaveLength(2);
    });

    it('deleteTag 级联从笔记 tags 中移除', () => {
      seedTaggedNotes();
      useAppStore.getState().deleteTag('tag1');

      expect(useAppStore.getState().tags.some((t) => t.id === 'tag1')).toBe(false);
      const note = useAppStore.getState().notes.find((n) => n.id === 'n1')!;
      expect(note.tags).toEqual(['其他']);
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteTag 对不存在的标签静默成功', () => {
      seedTaggedNotes();
      expect(() => useAppStore.getState().deleteTag('missing')).not.toThrow();
      expect(useAppStore.getState().notes).toHaveLength(2);
      expect(saveState).toHaveBeenCalled();
    });
  });

  describe('updateTodo completedAt 不变量', () => {
    function seedTodo(overrides: Record<string, unknown> = {}) {
      useAppStore.setState({
        todos: [
          {
            id: 't1',
            title: '待办',
            priority: 'medium',
            status: 'active',
            createdAt: '2025-01-01T00:00:00.000Z',
            ...overrides,
          },
        ],
      });
    }

    it('status 由 active 变 completed 时补 completedAt', () => {
      seedTodo();
      useAppStore.getState().updateTodo('t1', { status: 'completed' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('completed');
      expect(todo.completedAt).toBe('2025-07-09T12:00:00.000Z');
    });

    it('status 由 completed 变 active 时清除 completedAt', () => {
      seedTodo({ status: 'completed', completedAt: '2025-01-02T00:00:00.000Z' });
      useAppStore.getState().updateTodo('t1', { status: 'active' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('active');
      expect(todo.completedAt).toBeUndefined();
      expect('completedAt' in todo).toBe(false);
    });

    it('仅更新标题时保留已有 completedAt', () => {
      seedTodo({ status: 'completed', completedAt: '2025-01-02T00:00:00.000Z' });
      useAppStore.getState().updateTodo('t1', { title: '新标题' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.title).toBe('新标题');
      expect(todo.completedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('显式传入 completedAt 时尊重传入值', () => {
      seedTodo();
      useAppStore.getState().updateTodo('t1', {
        status: 'completed',
        completedAt: '2025-03-03T03:03:03.000Z',
      });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.completedAt).toBe('2025-03-03T03:03:03.000Z');
    });

    it('显式传入 abandonedAt 时尊重传入值', () => {
      seedTodo();
      useAppStore.getState().updateTodo('t1', {
        status: 'abandoned',
        abandonedAt: '2025-04-04T04:04:04.000Z',
      });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('abandoned');
      expect(todo.abandonedAt).toBe('2025-04-04T04:04:04.000Z');
    });

    it('status 已为 completed 但缺 completedAt 时补齐', () => {
      seedTodo({ status: 'completed' });
      useAppStore.getState().updateTodo('t1', { title: '补时间' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.completedAt).toBe('2025-07-09T12:00:00.000Z');
    });

    it('status 变为 abandoned 时补 abandonedAt 并清除 completedAt', () => {
      seedTodo({ status: 'completed', completedAt: '2025-01-02T00:00:00.000Z' });
      useAppStore.getState().updateTodo('t1', { status: 'abandoned' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('abandoned');
      expect(todo.abandonedAt).toBe('2025-07-09T12:00:00.000Z');
      expect(todo.completedAt).toBeUndefined();
      expect('completedAt' in todo).toBe(false);
    });

    it('status 由 abandoned 变 active 时清除 abandonedAt', () => {
      seedTodo({ status: 'abandoned', abandonedAt: '2025-01-02T00:00:00.000Z' });
      useAppStore.getState().updateTodo('t1', { status: 'active' });
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('active');
      expect(todo.abandonedAt).toBeUndefined();
      expect('abandonedAt' in todo).toBe(false);
    });

    it('对不存在的 ID 不抛错也不改变数据', () => {
      seedTodo();
      expect(() => useAppStore.getState().updateTodo('missing', { status: 'completed' })).not.toThrow();
      const todo = useAppStore.getState().todos.find((t) => t.id === 't1')!;
      expect(todo.status).toBe('active');
      expect(todo.completedAt).toBeUndefined();
    });
  });

  describe('清单操作', () => {
    it('addList 缺省 color 为 #8a8a8a 且不设置 icon', () => {
      const id = useAppStore.getState().addList('工作');
      const list = useAppStore.getState().lists.find((l) => l.id === id)!;
      expect(list.name).toBe('工作');
      expect(list.color).toBe('#8a8a8a');
      expect(list.createdAt).toBe('2025-07-09T12:00:00.000Z');
      expect('icon' in list).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('addList 支持自定义 color 与 icon', () => {
      const id = useAppStore.getState().addList('生活', '#123456', 'home');
      const list = useAppStore.getState().lists.find((l) => l.id === id)!;
      expect(list.color).toBe('#123456');
      expect(list.icon).toBe('home');
    });

    it('updateList 更新 name/color/icon 三字段', () => {
      const id = useAppStore.getState().addList('工作');
      useAppStore.getState().updateList(id, {
        name: '改名',
        color: '#ffffff',
        icon: 'fire',
      });
      const list = useAppStore.getState().lists.find((l) => l.id === id)!;
      expect(list.name).toBe('改名');
      expect(list.color).toBe('#ffffff');
      expect(list.icon).toBe('fire');
      expect(saveState).toHaveBeenCalled();
    });

    it('updateList 只传部分字段时其余字段保持不变', () => {
      const id = useAppStore.getState().addList('工作', '#000000', 'work');
      useAppStore.getState().updateList(id, { name: '改名' });
      const list = useAppStore.getState().lists.find((l) => l.id === id)!;
      expect(list.name).toBe('改名');
      expect(list.color).toBe('#000000');
      expect(list.icon).toBe('work');
    });

    it('updateList 忽略 name/color/icon 之外的字段（folderId 一期不开放）', () => {
      useAppStore.setState({
        lists: [makeList({ id: 'L1' }), makeList({ id: 'L2', color: '#00ff00' })],
      });
      useAppStore.getState().updateList('L1', {
        folderId: 'folder-1',
      } as unknown as { name?: string; color?: string; icon?: string });
      const lists = useAppStore.getState().lists;
      expect('folderId' in lists.find((l) => l.id === 'L1')!).toBe(false);
      // 其他清单不受影响
      expect(lists.find((l) => l.id === 'L2')!.color).toBe('#00ff00');
    });

    it('updateList 显式传 icon: undefined 时清空 icon（D18：支持移除图标）', () => {
      const id = useAppStore.getState().addList('工作', '#000000', 'work');
      useAppStore.getState().updateList(id, { icon: undefined });
      const list = useAppStore.getState().lists.find((l) => l.id === id)!;
      expect('icon' in list).toBe(false);
      // 未传入的字段保持不变
      expect(list.name).toBe('工作');
      expect(list.color).toBe('#000000');
    });

    it('updateList 对不存在的 id 不抛错', () => {
      expect(() =>
        useAppStore.getState().updateList('missing', { name: 'x' })
      ).not.toThrow();
      expect(useAppStore.getState().lists).toHaveLength(0);
    });

    it('deleteList 移除清单并将清单下待办的 listId 清空，任务保留', () => {
      useAppStore.setState({
        lists: [makeList({ id: 'L1' }), makeList({ id: 'L2' })],
        todos: [
          makeTodo({ id: 't1', listId: 'L1' }),
          makeTodo({ id: 't2', listId: 'L2' }),
          makeTodo({ id: 't3' }),
        ],
      });
      useAppStore.getState().deleteList('L1');

      const lists = useAppStore.getState().lists;
      expect(lists.some((l) => l.id === 'L1')).toBe(false);
      expect(lists.some((l) => l.id === 'L2')).toBe(true);

      const todos = useAppStore.getState().todos;
      // 任务保留，落收集箱
      const t1 = todos.find((t) => t.id === 't1')!;
      expect(t1).toBeTruthy();
      expect('listId' in t1).toBe(false);
      // 其他清单的任务与收集箱任务不受影响
      expect(todos.find((t) => t.id === 't2')!.listId).toBe('L2');
      expect('listId' in todos.find((t) => t.id === 't3')!).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteList 对不存在的 id 静默成功', () => {
      useAppStore.setState({ lists: [makeList({ id: 'L1' })] });
      expect(() => useAppStore.getState().deleteList('missing')).not.toThrow();
      expect(useAppStore.getState().lists).toHaveLength(1);
    });
  });

  describe('放弃与恢复', () => {
    it('abandonTodo 将顶层任务置为 abandoned 并清空 completedAt（互斥）', () => {
      useAppStore.setState({
        todos: [
          makeTodo({
            id: 'p1',
            status: 'completed',
            completedAt: '2025-01-02T00:00:00.000Z',
          }),
        ],
      });
      useAppStore.getState().abandonTodo('p1');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect(todo.status).toBe('abandoned');
      expect(todo.abandonedAt).toBe('2025-07-09T12:00:00.000Z');
      expect('completedAt' in todo).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('abandonTodo 对已 abandoned 的任务不刷新 abandonedAt', () => {
      useAppStore.setState({
        todos: [
          makeTodo({
            id: 'p1',
            status: 'abandoned',
            abandonedAt: '2025-01-02T00:00:00.000Z',
          }),
        ],
      });
      useAppStore.getState().abandonTodo('p1');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect(todo.status).toBe('abandoned');
      expect(todo.abandonedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('abandonTodo 对子任务 no-op', () => {
      useAppStore.setState({
        todos: [makeTodo({ id: 'p1' }), makeTodo({ id: 'c1', parentId: 'p1' })],
      });
      useAppStore.getState().abandonTodo('c1');
      expect(
        useAppStore.getState().todos.find((t) => t.id === 'c1')!.status
      ).toBe('active');
    });

    it('abandonTodo 对不存在的 id no-op 且不抛错', () => {
      useAppStore.setState({ todos: [makeTodo({ id: 'p1' })] });
      expect(() =>
        useAppStore.getState().abandonTodo('missing')
      ).not.toThrow();
      expect(
        useAppStore.getState().todos.find((t) => t.id === 'p1')!.status
      ).toBe('active');
    });

    it('restoreTodo 将 abandoned 顶层任务恢复为 active 并清空 abandonedAt', () => {
      useAppStore.setState({
        todos: [
          makeTodo({
            id: 'p1',
            status: 'abandoned',
            abandonedAt: '2025-01-02T00:00:00.000Z',
          }),
        ],
      });
      useAppStore.getState().restoreTodo('p1');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect(todo.status).toBe('active');
      expect('abandonedAt' in todo).toBe(false);
      expect('completedAt' in todo).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('restoreTodo 对 completed 任务 no-op（completedAt 保留）', () => {
      useAppStore.setState({
        todos: [
          makeTodo({
            id: 'p1',
            status: 'completed',
            completedAt: '2025-01-02T00:00:00.000Z',
          }),
        ],
      });
      useAppStore.getState().restoreTodo('p1');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect(todo.status).toBe('completed');
      expect(todo.completedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('restoreTodo 对 active 任务 no-op', () => {
      useAppStore.setState({ todos: [makeTodo({ id: 'p1' })] });
      useAppStore.getState().restoreTodo('p1');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect(todo.status).toBe('active');
      expect('abandonedAt' in todo).toBe(false);
    });

    it('restoreTodo 对子任务 no-op', () => {
      useAppStore.setState({
        todos: [
          makeTodo({ id: 'p1' }),
          makeTodo({
            id: 'c1',
            parentId: 'p1',
            status: 'abandoned',
            abandonedAt: '2025-01-02T00:00:00.000Z',
          }),
        ],
      });
      useAppStore.getState().restoreTodo('c1');
      const child = useAppStore.getState().todos.find((t) => t.id === 'c1')!;
      expect(child.status).toBe('abandoned');
      expect(child.abandonedAt).toBe('2025-01-02T00:00:00.000Z');
    });

    it('restoreTodo 对不存在的 id no-op 且不抛错', () => {
      expect(() =>
        useAppStore.getState().restoreTodo('missing')
      ).not.toThrow();
    });
  });

  describe('子任务', () => {
    it('addSubtask 为顶层父任务创建子任务（仅 title+status，无独立字段）', () => {
      useAppStore.setState({ todos: [makeTodo({ id: 'p1' })] });
      const id = useAppStore.getState().addSubtask('p1', '子任务');
      expect(id).toBeTruthy();
      const child = useAppStore.getState().todos.find((t) => t.id === id)!;
      expect(child.title).toBe('子任务');
      expect(child.status).toBe('active');
      expect(child.parentId).toBe('p1');
      expect(child.priority).toBe('none');
      expect('listId' in child).toBe(false);
      expect('dueDate' in child).toBe(false);
      expect('description' in child).toBe(false);
      expect(saveState).toHaveBeenCalled();
    });

    it('addSubtask 父任务不存在时返回 null', () => {
      expect(
        useAppStore.getState().addSubtask('missing', '子任务')
      ).toBeNull();
    });

    it('addSubtask 父任务本身是子任务时返回 null（仅一层）', () => {
      useAppStore.setState({
        todos: [makeTodo({ id: 'p1' }), makeTodo({ id: 'c1', parentId: 'p1' })],
      });
      expect(useAppStore.getState().addSubtask('c1', '孙任务')).toBeNull();
    });

    it('deleteTodo 删除父任务时级联删除全部子任务', () => {
      useAppStore.setState({
        todos: [
          makeTodo({ id: 'p1' }),
          makeTodo({ id: 'c1', parentId: 'p1' }),
          makeTodo({ id: 'c2', parentId: 'p1' }),
          makeTodo({ id: 'p2' }),
        ],
      });
      useAppStore.getState().deleteTodo('p1');
      const todos = useAppStore.getState().todos;
      expect(todos.some((t) => t.id === 'p1')).toBe(false);
      expect(todos.some((t) => t.id === 'c1')).toBe(false);
      expect(todos.some((t) => t.id === 'c2')).toBe(false);
      expect(todos.some((t) => t.id === 'p2')).toBe(true);
      expect(saveState).toHaveBeenCalled();
    });

    it('deleteTodo 删除子任务时仅单删，不影响父任务', () => {
      useAppStore.setState({
        todos: [makeTodo({ id: 'p1' }), makeTodo({ id: 'c1', parentId: 'p1' })],
      });
      useAppStore.getState().deleteTodo('c1');
      const todos = useAppStore.getState().todos;
      expect(todos.some((t) => t.id === 'c1')).toBe(false);
      expect(todos.some((t) => t.id === 'p1')).toBe(true);
    });
  });

  describe('moveTodoToList', () => {
    function seedMoveState() {
      useAppStore.setState({
        lists: [makeList({ id: 'L1' }), makeList({ id: 'L2' })],
        todos: [
          makeTodo({ id: 'p1', listId: 'L1' }),
          // c1 模拟历史数据：子任务携带独立 listId
          makeTodo({ id: 'c1', parentId: 'p1', listId: 'L1' }),
          makeTodo({ id: 'c2', parentId: 'p1' }),
        ],
      });
    }

    it('移动顶层任务到目标清单', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('p1', 'L2');
      expect(
        useAppStore.getState().todos.find((t) => t.id === 'p1')!.listId
      ).toBe('L2');
      expect(saveState).toHaveBeenCalled();
    });

    it('listId 为 null 时清空落收集箱', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('p1', null);
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect('listId' in todo).toBe(false);
    });

    it('listId 为空串时清空落收集箱', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('p1', '');
      const todo = useAppStore.getState().todos.find((t) => t.id === 'p1')!;
      expect('listId' in todo).toBe(false);
    });

    it('目标清单不存在时 no-op', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('p1', 'ghost');
      expect(
        useAppStore.getState().todos.find((t) => t.id === 'p1')!.listId
      ).toBe('L1');
    });

    it('对子任务 no-op', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('c1', 'L2');
      const child = useAppStore.getState().todos.find((t) => t.id === 'c1')!;
      expect(child.listId).toBe('L1');
    });

    it('移动父任务时同步清空子任务携带的独立 listId（防御历史数据）', () => {
      seedMoveState();
      useAppStore.getState().moveTodoToList('p1', 'L2');
      const todos = useAppStore.getState().todos;
      const c1 = todos.find((t) => t.id === 'c1')!;
      const c2 = todos.find((t) => t.id === 'c2')!;
      expect('listId' in c1).toBe(false);
      expect('listId' in c2).toBe(false);
    });

    it('对不存在的 id no-op 且不抛错', () => {
      seedMoveState();
      expect(() =>
        useAppStore.getState().moveTodoToList('missing', 'L2')
      ).not.toThrow();
      expect(useAppStore.getState().todos).toHaveLength(3);
    });
  });
});