import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { AppContent } from '@/App';
import { renderWithProviders, resetStore } from '@/test/render';

/* 页面模块全部 mock，仅验证路由外壳与全局新建 */
vi.mock('@/pages/Today', () => ({ default: () => <div>今日页面</div> }));
vi.mock('@/pages/Notes', () => ({ default: () => <div>笔记页面</div> }));
vi.mock('@/pages/Memos', () => ({ default: () => <div>备忘页面</div> }));
vi.mock('@/pages/Todos', () => ({ default: () => <div>待办页面</div> }));
vi.mock('@/pages/Events', () => ({ default: () => <div>日程页面</div> }));
vi.mock('@/pages/Calendar', () => ({ default: () => <div>日历页面</div> }));
vi.mock('@/pages/Report', () => ({ default: () => <div>周报页面</div> }));
vi.mock('@/pages/Settings', () => ({ default: () => <div>设置页面</div> }));
vi.mock('@/pages/SearchResults', () => ({ default: () => <div>搜索页面</div> }));

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderApp(route = '/') {
  return renderWithProviders(
    <>
      <AppContent />
      <LocationProbe />
    </>,
    { route },
  );
}

describe('App 路由外壳', () => {
  beforeEach(() => {
    resetStore();
  });

  it('默认渲染今日页面与全局导航', async () => {
    renderApp();
    expect(await screen.findByText('今日页面')).toBeInTheDocument();
    // 侧边栏导航
    expect(screen.getByRole('link', { name: '笔记' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '待办' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '日历' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '设置' })).toBeInTheDocument();
  });

  it('桌面端 Topbar「新建」打开快速新建菜单并可跳转到模块', async () => {
    const user = userEvent.setup();
    renderApp();

    // 移动端 + 桌面端各有一个新建入口，取第一个（移动端）
    const addButtons = screen.getAllByRole('button', { name: '新建' });
    expect(addButtons.length).toBeGreaterThanOrEqual(2);
    await user.click(addButtons[0]);

    const dialog = screen.getByRole('dialog', { name: '新建' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建笔记' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建备忘' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建待办' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建日程' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '新建日程' }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/events?new=1');
    });
    expect(await screen.findByText('日程页面')).toBeInTheDocument();
  });

  it('笔记路由下隐藏桌面 Topbar', async () => {
    renderApp('/notes');
    expect(await screen.findByText('笔记页面')).toBeInTheDocument();
    expect(screen.queryByLabelText('全局搜索')).not.toBeInTheDocument();
  });

  it('搜索路由下隐藏桌面 Topbar 并渲染搜索页', async () => {
    renderApp('/search?q=墨');
    expect(await screen.findByText('搜索页面')).toBeInTheDocument();
    expect(screen.queryByLabelText('全局搜索')).not.toBeInTheDocument();
  });

  it('切换到其他路由时渲染对应页面', async () => {
    const user = userEvent.setup();
    renderApp();

    await user.click(screen.getByRole('link', { name: '待办' }));
    expect(await screen.findByText('待办页面')).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent('/todos');
    });
  });
});
