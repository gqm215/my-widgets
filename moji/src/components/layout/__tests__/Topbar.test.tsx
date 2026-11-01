import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import Topbar from '@/components/layout/Topbar';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
  makeMemo,
  makeNote,
  makeTodo,
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

function renderTopbar() {
  return renderWithProviders(
    <>
      <Topbar />
      <LocationProbe />
    </>,
  );
}

function seedSearchData() {
  seedStore({
    notes: [makeNote({ id: 'note-1', title: 'React 学习', content: 'hooks 与状态管理' })],
    memos: [makeMemo({ id: 'memo-1', content: '买牛奶和面包' })],
    todos: [makeTodo({ id: 'todo-1', title: '写周报', description: '整理本周产出' })],
    events: [makeEvent({ id: 'event-1', title: '团队会议', startDate: '2025-06-02T01:00:00.000Z' })],
  });
}

describe('Topbar', () => {
  beforeEach(() => {
    resetStore();
  });

  it('渲染搜索框与新建按钮', () => {
    renderTopbar();
    expect(screen.getByRole('searchbox', { name: '全局搜索' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建' })).toBeInTheDocument();
  });

  it('点击新建按钮触发 onAddClick', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithProviders(<Topbar onAddClick={onAdd} />);
    await user.click(screen.getByRole('button', { name: '新建' }));
    expect(onAdd).toHaveBeenCalledTimes(1);
  });

  it('输入关键词后（150ms 防抖）按模块分组展示结果', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    await user.type(screen.getByRole('searchbox', { name: '全局搜索' }), 'React');
    expect(await screen.findByText('React 学习')).toBeInTheDocument();
    expect(screen.getByText(/笔记\s*\(1\)/)).toBeInTheDocument();
    expect(screen.getByText(/匹配: 标题/)).toBeInTheDocument();
  });

  it('按 Enter 打开完整搜索结果页', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    const input = screen.getByRole('searchbox', { name: '全局搜索' });
    await user.type(input, '牛奶');
    expect((await screen.findAllByText(/买牛奶和面包/)).length).toBeGreaterThan(0);

    await user.keyboard('{Enter}');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        `/search?q=${encodeURIComponent('牛奶')}`,
      );
    });
  });

  it('方向键选择结果后回车跳转到对应条目', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    const input = screen.getByRole('searchbox', { name: '全局搜索' });
    await user.type(input, 'React');
    await screen.findByText('React 学习');

    await user.keyboard('{ArrowDown}{Enter}');
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/notes/note-1');
    });
  });

  it('点击下拉结果跳转到对应条目', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    await user.type(screen.getByRole('searchbox', { name: '全局搜索' }), '团队');
    await user.click(await screen.findByText('团队会议'));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/events');
    });
  });

  it('无匹配结果时展示空提示', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    await user.type(screen.getByRole('searchbox', { name: '全局搜索' }), '不存在的关键词zzz');
    expect(await screen.findByText('无搜索结果')).toBeInTheDocument();
  });

  it('按 Escape 清空搜索', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderTopbar();

    const input = screen.getByRole('searchbox', { name: '全局搜索' });
    await user.type(input, 'React');
    expect(input).toHaveValue('React');

    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
    expect(screen.queryByText('React 学习')).not.toBeInTheDocument();
  });
});
