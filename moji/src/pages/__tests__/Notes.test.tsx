import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes, useLocation } from 'react-router-dom';
import Notes, { buildFlatItems, findIndex } from '@/pages/Notes';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeNote,
  makeTag,
} from '@/test/render';

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderNotes(route = '/notes') {
  return renderWithProviders(
    <>
      <Routes>
        <Route path="/notes" element={<Notes />} />
        <Route path="/notes/:id" element={<Notes />} />
      </Routes>
      <LocationProbe />
    </>,
    { route },
  );
}

describe('Notes 虚拟列表纯函数', () => {
  it('buildFlatItems：收藏分组在前并维护 globalIndex', () => {
    const fav = makeNote({ id: 'fav', title: '收藏笔记' });
    const other = makeNote({ id: 'other', title: '普通笔记' });
    const items = buildFlatItems([fav], [other]);

    expect(items).toHaveLength(3);
    expect(items[0]).toEqual({ type: 'section' });
    expect(items[1]).toMatchObject({ type: 'note', note: { id: 'fav' }, globalIndex: 0 });
    expect(items[2]).toMatchObject({ type: 'note', note: { id: 'other' }, globalIndex: 1 });
  });

  it('buildFlatItems：无收藏时不含分组标题', () => {
    const items = buildFlatItems([], [makeNote({ id: 'n1' })]);
    expect(items).toHaveLength(1);
    expect(items[0].type).toBe('note');
  });

  it('findIndex：二分查找第一个 offset >= target', () => {
    const offsets = [0, 96, 192, 288];
    expect(findIndex(offsets, 0)).toBe(0);
    expect(findIndex(offsets, 100)).toBe(2);
    expect(findIndex(offsets, 192)).toBe(2);
    expect(findIndex(offsets, 999)).toBe(4);
    expect(findIndex([], 10)).toBe(0);
  });
});

describe('Notes 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('空状态展示', () => {
    renderNotes();
    expect(screen.getByText('暂无笔记')).toBeInTheDocument();
    expect(screen.getByText('选择或创建一条笔记')).toBeInTheDocument();
  });

  it('渲染笔记列表，点击后同步 /notes/:id 并进入编辑器', async () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '项目笔记', content: '正文内容' })],
    });
    const user = userEvent.setup();
    renderNotes();

    expect(screen.getByText('项目笔记')).toBeInTheDocument();
    await user.click(screen.getByText('项目笔记'));

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/notes/n1');
    });
    expect(screen.getByLabelText('笔记标题')).toHaveValue('项目笔记');
    expect(screen.getByLabelText('笔记内容')).toHaveValue('正文内容');
  });

  it('从 URL 进入时自动选中笔记', () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: 'URL 笔记', content: '从链接打开' })],
    });
    renderNotes('/notes/n1');

    expect(screen.getByLabelText('笔记标题')).toHaveValue('URL 笔记');
    expect(screen.getByLabelText('笔记内容')).toHaveValue('从链接打开');
  });

  it('新建笔记：创建空笔记并进入编辑器（URL 同步）', async () => {
    const user = userEvent.setup();
    renderNotes();

    await user.click(screen.getByRole('button', { name: '新建笔记' }));

    await waitFor(() => {
      expect(useAppStore.getState().notes).toHaveLength(1);
    });
    const note = useAppStore.getState().notes[0];
    expect(note.title).toBe('新笔记');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(`/notes/${note.id}`);
    });
    expect(screen.getByLabelText('笔记标题')).toHaveValue('新笔记');
  });

  it('?new=1 直接创建空笔记并进入编辑器', async () => {
    renderNotes('/notes?new=1');
    await waitFor(() => {
      expect(useAppStore.getState().notes).toHaveLength(1);
    });
    const note = useAppStore.getState().notes[0];
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(`/notes/${note.id}`);
    });
  });

  it('标签芯片：从 store 标签添加、移除并写回笔记', async () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '带标签的笔记', tags: [] })],
      tags: [makeTag({ id: 'tag1', name: '工作' }), makeTag({ id: 'tag2', name: '生活' })],
    });
    const user = userEvent.setup();
    renderNotes('/notes/n1');

    await user.selectOptions(screen.getByLabelText('添加标签'), '工作');
    await waitFor(() => {
      expect(useAppStore.getState().notes[0].tags).toEqual(['工作']);
    });
    expect(screen.getByRole('button', { name: '移除标签工作' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '移除标签工作' }));
    await waitFor(() => {
      expect(useAppStore.getState().notes[0].tags).toEqual([]);
    });
  });

  it('编辑标题 400ms 防抖保存', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '旧标题', content: '' })] });
    const user = userEvent.setup();
    renderNotes('/notes/n1');

    const titleInput = screen.getByLabelText('笔记标题');
    await user.clear(titleInput);
    await user.type(titleInput, '防抖后的标题');

    await waitFor(
      () => {
        expect(useAppStore.getState().notes[0].title).toBe('防抖后的标题');
      },
      { timeout: 3000 },
    );
  });

  it('失焦立即保存', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '旧标题', content: '' })] });
    const user = userEvent.setup();
    renderNotes('/notes/n1');

    const titleInput = screen.getByLabelText('笔记标题');
    await user.clear(titleInput);
    await user.type(titleInput, '失焦保存标题');
    // 点击内容区让标题失焦
    await user.click(screen.getByLabelText('笔记内容'));

    await waitFor(() => {
      expect(useAppStore.getState().notes[0].title).toBe('失焦保存标题');
    });
  });

  it('内容未变更时不做任何写入（updatedAt 不变）', async () => {
    const baseUpdatedAt = '2025-06-02T09:00:00.000Z';
    seedStore({
      notes: [makeNote({ id: 'n1', title: '未改动', content: '内容', updatedAt: baseUpdatedAt })],
    });
    renderNotes('/notes/n1');

    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(useAppStore.getState().notes[0].updatedAt).toBe(baseUpdatedAt);
  });

  it('删除笔记：确认后从 store 移除并回到列表', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '要删除的笔记' })] });
    const user = userEvent.setup();
    renderNotes('/notes/n1');

    await user.click(screen.getByRole('button', { name: '删除笔记' }));
    const dialog = screen.getByRole('dialog', { name: '删除笔记' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(useAppStore.getState().notes).toHaveLength(0);
    });
    expect(screen.getByTestId('location-probe')).toHaveTextContent('/notes');
  });

  it('返回列表按钮回到 /notes', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '某笔记' })] });
    const user = userEvent.setup();
    renderNotes('/notes/n1');

    await user.click(screen.getByRole('button', { name: '返回列表' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/notes');
    });
  });

  it('标签筛选只展示对应笔记', async () => {
    seedStore({
      notes: [
        makeNote({ id: 'n1', title: '工作笔记', tags: ['工作'] }),
        makeNote({ id: 'n2', title: '生活笔记', tags: ['生活'] }),
      ],
      tags: [makeTag({ id: 'tag1', name: '工作' }), makeTag({ id: 'tag2', name: '生活' })],
    });
    const user = userEvent.setup();
    renderNotes();

    await user.click(screen.getByRole('button', { name: '工作' }));
    expect(screen.getByText('工作笔记')).toBeInTheDocument();
    expect(screen.queryByText('生活笔记')).not.toBeInTheDocument();
  });
});
