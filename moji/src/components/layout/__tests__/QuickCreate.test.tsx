import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import QuickCreate from '@/components/layout/QuickCreate';
import { renderWithProviders, resetStore } from '@/test/render';

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderQuickCreate(open: boolean, onClose = vi.fn()) {
  return renderWithProviders(
    <>
      <QuickCreate open={open} onClose={onClose} />
      <LocationProbe />
    </>,
  );
}

describe('QuickCreate', () => {
  beforeEach(() => {
    resetStore();
  });

  it('open=false 时不渲染', () => {
    renderQuickCreate(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('open=true 时展示四类新建入口', () => {
    renderQuickCreate(true);
    expect(screen.getByRole('dialog', { name: '新建' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建笔记' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建备忘' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建待办' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建日程' })).toBeInTheDocument();
  });

  it.each([
    ['新建笔记', '/notes?new=1'],
    ['新建备忘', '/memos?new=1'],
    ['新建待办', '/todos?new=1'],
    ['新建日程', '/events?new=1'],
  ])('点击「%s」跳转到 %s 并关闭菜单', async (label, expectedPath) => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderQuickCreate(true, onClose);

    await user.click(screen.getByRole('button', { name: label }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(expectedPath);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('按 Escape 关闭菜单', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderQuickCreate(true, onClose);

    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('键盘可达：Tab 在菜单内循环聚焦', async () => {
    const user = userEvent.setup();
    renderQuickCreate(true);

    const first = screen.getByRole('button', { name: '新建笔记' });
    await waitFor(() => expect(first).toHaveFocus());

    await user.tab();
    expect(screen.getByRole('button', { name: '新建备忘' })).toHaveFocus();
  });
});
