import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import SearchResults from '@/pages/SearchResults';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
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

function renderSearch(route = '/search') {
  return renderWithProviders(
    <>
      <SearchResults />
      <LocationProbe />
    </>,
    { route },
  );
}

function seedSearchData() {
  seedStore({
    notes: [
      makeNote({ id: 'note-1', title: 'React 入门', content: 'hooks 与状态管理实践' }),
    ],
    todos: [makeTodo({ id: 'todo-1', title: '整理会议纪要', description: '复盘会议行动项' })],
    events: [
      makeEvent({
        id: 'event-1',
        title: '产品会议',
        startDate: '2025-06-02T01:00:00.000Z',
        description: '讨论下一版计划',
      }),
    ],
  });
}

describe('SearchResults 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('无关键词时展示引导空状态', () => {
    renderSearch();
    expect(screen.getByText('输入关键词开始搜索')).toBeInTheDocument();
  });

  it('按模块分组展示结果并高亮命中词', () => {
    seedSearchData();
    renderSearch('/search?q=React');

    expect(screen.getByText('共 1 条结果')).toBeInTheDocument();
    const noteSection = document.querySelector('section[data-group="note"]');
    expect(noteSection?.textContent).toContain('笔记(1)');
    expect(screen.getByRole('button', { name: /React 入门/ })).toBeInTheDocument();
    const mark = document.querySelector('mark');
    expect(mark?.textContent).toBe('React');
  });

  it('多模块命中时分别分组', () => {
    seedSearchData();
    renderSearch('/search?q=会议');

    const todoSection = document.querySelector('section[data-group="todo"]');
    const eventSection = document.querySelector('section[data-group="event"]');
    expect(todoSection?.textContent).toContain('待办(1)');
    expect(eventSection?.textContent).toContain('日程(1)');
    expect(screen.getByRole('button', { name: /整理会议纪要/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /产品会议/ })).toBeInTheDocument();
  });

  it('无匹配结果时展示空状态', () => {
    seedSearchData();
    renderSearch('/search?q=完全不存在的关键词');
    expect(screen.getByText(/未找到与「完全不存在的关键词」相关的结果/)).toBeInTheDocument();
  });

  it('回车更新 URL 并刷新结果', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderSearch('/search?q=React');

    const input = screen.getByRole('searchbox', { name: '搜索笔记、备忘、待办、日程' });
    await user.clear(input);
    await user.type(input, '会议{Enter}');

    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        `/search?q=${encodeURIComponent('会议')}`,
      );
    });
    expect(await screen.findByRole('button', { name: /产品会议/ })).toBeInTheDocument();
  });

  it('点击结果跳转到对应路由', async () => {
    seedSearchData();
    const user = userEvent.setup();
    renderSearch('/search?q=React');

    await user.click(screen.getByRole('button', { name: /React 入门/ }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/notes/note-1');
    });
  });
});
