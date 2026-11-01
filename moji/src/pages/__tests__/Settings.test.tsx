import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '@/pages/Settings';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeNote,
  makeTag,
} from '@/test/render';

/** 读取导出 Blob 的文本内容 */
function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

function makeJsonFile(data: unknown, name = 'backup.json'): File {
  return new File([JSON.stringify(data)], name, { type: 'application/json' });
}

describe('Settings 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('渲染各设置分区', () => {
    renderWithProviders(<Settings />);
    expect(screen.getByText('设置')).toBeInTheDocument();
    expect(screen.getByText('外观')).toBeInTheDocument();
    expect(screen.getByText('标签管理')).toBeInTheDocument();
    expect(screen.getByText('数据管理')).toBeInTheDocument();
    expect(screen.getByText('关于')).toBeInTheDocument();
  });

  it('导出使用当前 store 快照而非 storage 历史数据', async () => {
    seedStore({
      notes: [
        makeNote({ id: 'n1', title: '当前 store 中的笔记', content: '快照内容' }),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const createdBlobs: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      createdBlobs.push(obj as Blob);
      return 'blob:mock-url';
    });

    await user.click(screen.getByRole('button', { name: '导出数据' }));
    expect(await screen.findByText('数据已导出')).toBeInTheDocument();

    const blob = createdBlobs.at(-1);
    expect(blob).toBeInstanceOf(Blob);

    const text = await readBlob(blob);
    const parsed = JSON.parse(text);
    expect(parsed.notes[0].title).toBe('当前 store 中的笔记');
    expect(parsed.notes[0].content).toBe('快照内容');
  });

  it('导入合法数据：替换 store 并 toast', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const imported = {
      notes: [
        {
          id: 'imported-1',
          title: '导入的笔记',
          content: '导入内容',
          tags: [],
          isFavorite: false,
          createdAt: '2025-06-02T09:00:00.000Z',
          updatedAt: '2025-06-02T09:00:00.000Z',
        },
      ],
      memos: [],
      todos: [],
      events: [],
      tags: [],
    };
    await user.upload(screen.getByLabelText('导入数据文件'), makeJsonFile(imported));

    expect(await screen.findByText('数据导入成功')).toBeInTheDocument();
    await waitFor(() => {
      expect(useAppStore.getState().notes[0].title).toBe('导入的笔记');
    });
  });

  it('导入失败：store 状态不变并 toast 错误', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '原始笔记' })] });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    const invalidFile = new File(['这不是 JSON'], 'broken.json', { type: 'application/json' });
    await user.upload(screen.getByLabelText('导入数据文件'), invalidFile);

    expect(await screen.findByText(/JSON 解析失败/)).toBeInTheDocument();
    expect(useAppStore.getState().notes).toHaveLength(1);
    expect(useAppStore.getState().notes[0].title).toBe('原始笔记');
  });

  it('标签改名级联更新笔记 tags（store 统一处理）', async () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '工作笔记', tags: ['工作'] })],
      tags: [makeTag({ id: 'tag1', name: '工作' })],
    });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    await user.click(screen.getByRole('button', { name: '编辑标签工作' }));
    const input = screen.getByLabelText('编辑标签名称');
    await user.clear(input);
    await user.type(input, '职场');
    await user.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(useAppStore.getState().tags[0].name).toBe('职场');
    });
    expect(useAppStore.getState().notes[0].tags).toEqual(['职场']);
    expect(await screen.findByText('标签已更新')).toBeInTheDocument();
  });

  it('删除标签级联移除笔记 tags', async () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '工作笔记', tags: ['工作'] })],
      tags: [makeTag({ id: 'tag1', name: '工作' })],
    });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    await user.click(screen.getByRole('button', { name: '删除标签工作' }));
    const dialog = screen.getByRole('dialog', { name: '删除标签' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(useAppStore.getState().tags).toHaveLength(0);
    });
    expect(useAppStore.getState().notes[0].tags).toEqual([]);
    expect(await screen.findByText('标签已删除')).toBeInTheDocument();
  });

  it('新建标签与重名校验', async () => {
    seedStore({ tags: [makeTag({ id: 'tag1', name: '工作' })] });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    // 重名被拒绝
    await user.click(screen.getByRole('button', { name: '新建标签' }));
    const nameInput = screen.getByLabelText('新标签名称');
    await user.type(nameInput, '工作');
    await user.click(screen.getByRole('button', { name: '创建' }));
    expect(await screen.findByText('标签名称「工作」已存在')).toBeInTheDocument();
    expect(useAppStore.getState().tags).toHaveLength(1);

    // 新名称创建成功
    await user.clear(nameInput);
    await user.type(nameInput, '学习');
    await user.click(screen.getByRole('button', { name: '创建' }));
    await waitFor(() => {
      expect(useAppStore.getState().tags.some((t) => t.name === '学习')).toBe(true);
    });
  });

  it('重置数据恢复初始状态并 toast', async () => {
    seedStore({ notes: [makeNote({ id: 'n1', title: '要被重置的笔记' })] });
    const user = userEvent.setup();
    renderWithProviders(<Settings />);

    await user.click(screen.getByRole('button', { name: '重置数据' }));
    const dialog = screen.getByRole('dialog', { name: '重置数据' });
    await user.click(within(dialog).getByRole('button', { name: '重置' }));

    expect(await screen.findByText('数据已重置为初始状态')).toBeInTheDocument();
    expect(useAppStore.getState().notes.length).toBeGreaterThan(0);
    expect(useAppStore.getState().notes[0].title).not.toBe('要被重置的笔记');
  });
});
