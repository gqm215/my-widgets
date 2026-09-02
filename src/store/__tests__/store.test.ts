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
          completed: false,
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
    })),
    saveState: vi.fn(),
  };
});

import { useAppStore } from '@/store';
import { saveState } from '@/utils/storage';

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
        expect(todo?.priority).toBe('medium');
        expect(todo?.completed).toBe(false);
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
      expect(todos.find((t) => t.id === id)?.completed).toBe(false);
      expect(saveState).toHaveBeenCalled();
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
        expect(todo?.completed).toBe(true);
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
        expect(todo?.completed).toBe(false);
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
});