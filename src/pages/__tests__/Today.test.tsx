import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import Today from '@/pages/Today';
import { combineDateTime, toDayKey } from '@/utils/date';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
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

function renderToday() {
  return renderWithProviders(
    <>
      <Today />
      <LocationProbe />
    </>,
  );
}

const now = new Date();
const todayKey = toDayKey(now);
const yesterdayKey = toDayKey(new Date(now.getTime() - 24 * 60 * 60 * 1000));

describe('Today 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('渲染今日概览与今日事项', () => {
    seedStore({
      todos: [
        makeTodo({ id: 't1', title: '写今日总结', dueDate: todayKey, completed: true }),
        makeTodo({ id: 't2', title: '明日再说', dueDate: yesterdayKey }),
      ],
      events: [
        makeEvent({
          id: 'e1',
          title: '晨会',
          startDate: combineDateTime(todayKey, '09:00'),
        }),
      ],
    });
    renderToday();

    expect(screen.getAllByText('今日待办').length).toBeGreaterThan(0);
    expect(screen.getAllByText('今日日程').length).toBeGreaterThan(0);
    expect(screen.getByText('写今日总结')).toBeInTheDocument();
    expect(screen.queryByText('明日再说')).not.toBeInTheDocument();
    expect(screen.getByText('晨会')).toBeInTheDocument();
    // 统计卡：今日 1 条待办、1 条日程；全部待办 2 条、完成 1 条 → 50%
    expect(screen.getByText('1 已完成')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('无今日事项时展示空状态', () => {
    seedStore({
      todos: [makeTodo({ id: 't1', title: '明天的任务', dueDate: yesterdayKey })],
      events: [],
    });
    renderToday();

    expect(screen.getByText('今日无待办事项')).toBeInTheDocument();
    expect(screen.getByText('今日无日程')).toBeInTheDocument();
  });

  it('勾选待办会更新 store', async () => {
    seedStore({ todos: [makeTodo({ id: 't1', title: '写今日总结', dueDate: todayKey })] });
    const user = userEvent.setup();
    renderToday();

    const checkbox = screen.getByRole('checkbox', { name: '标记「写今日总结」为已完成' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await user.click(checkbox);

    expect(useAppStore.getState().todos[0].completed).toBe(true);
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: '标记「写今日总结」为未完成' })).toHaveAttribute(
        'aria-checked',
        'true',
      );
    });
  });

  it('循环日程（每天重复）会出现在今日', () => {
    seedStore({
      events: [
        makeEvent({
          id: 'daily-1',
          title: '每日站会',
          startDate: combineDateTime(yesterdayKey, '10:00'),
          repeat: 'daily',
        }),
      ],
    });
    renderToday();
    expect(screen.getByText('每日站会')).toBeInTheDocument();
  });

  it('「在日历中查看」跳转到 /calendar?date=今天', async () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e1',
          title: '晨会',
          startDate: combineDateTime(todayKey, '09:00'),
        }),
      ],
    });
    const user = userEvent.setup();
    renderToday();

    await user.click(screen.getByRole('button', { name: /在日历中查看/ }));
    await waitFor(() => {
      expect(screen.getByTestId('location-probe')).toHaveTextContent(
        `/calendar?date=${todayKey}`,
      );
    });
  });
});
