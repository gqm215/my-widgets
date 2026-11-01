import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { addMonths, format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import CalendarPage from '@/pages/Calendar';
import { combineDateTime, toDayKey } from '@/utils/date';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
  makeTodo,
  setMediaQuery,
} from '@/test/render';

const now = new Date();
const todayKey = toDayKey(now);
const currentMonthHeader = format(now, 'yyyy年 MM月');
const todayLabel = format(now, 'yyyy年M月d日', { locale: zhCN });
const daysAgoKey = toDayKey(new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000));

describe('Calendar 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('默认渲染月视图与导航按钮', () => {
    renderWithProviders(<CalendarPage />);
    expect(screen.getByText(currentMonthHeader)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '上一月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一月' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '今天' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '月视图' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '周视图' })).toBeInTheDocument();
  });

  it('上一月 / 下一月 / 今天 导航正确', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: '下一月' }));
    expect(screen.getByText(format(addMonths(now, 1), 'yyyy年 MM月'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '上一月' }));
    expect(screen.getByText(currentMonthHeader)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '下一月' }));
    await user.click(screen.getByRole('button', { name: '今天' }));
    expect(screen.getByText(currentMonthHeader)).toBeInTheDocument();
  });

  it('月视图展示当日日程与待办', () => {
    seedStore({
      events: [
        makeEvent({ id: 'e1', title: '月度复盘', startDate: combineDateTime(todayKey, '14:00') }),
      ],
      todos: [makeTodo({ id: 't1', title: '提交周报', dueDate: todayKey })],
    });
    renderWithProviders(<CalendarPage />);

    expect(screen.getByText('月度复盘')).toBeInTheDocument();
    expect(screen.getByText('提交周报')).toBeInTheDocument();
  });

  it('选中日期在桌面端展示侧栏，并展示重复标记', async () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e1',
          title: '每日站会',
          startDate: combineDateTime(todayKey, '09:30'),
          endDate: combineDateTime(todayKey, '10:00'),
          repeat: 'daily',
        }),
      ],
      todos: [makeTodo({ id: 't1', title: '当天待办', dueDate: todayKey })],
    });
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: todayLabel }));
    const panel = screen.getByTestId('day-detail-panel');
    expect(panel).toBeInTheDocument();
    expect(within(panel).getByText('每日站会')).toBeInTheDocument();
    expect(within(panel).getByText('每天')).toBeInTheDocument();
    expect(within(panel).getByText('当天待办')).toBeInTheDocument();
    expect(within(panel).getByText(/09:30/)).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: '关闭日期详情' }));
    expect(screen.queryByTestId('day-detail-panel')).not.toBeInTheDocument();
  });

  it('选中无事项日期显示空状态', async () => {
    seedStore({});
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: todayLabel }));
    expect(screen.getByText('当天无事项')).toBeInTheDocument();
  });

  it('移动端日期详情以抽屉形式展示', async () => {
    setMediaQuery('(min-width: 1024px)', false);
    seedStore({
      todos: [makeTodo({ id: 't1', title: '移动端待办', dueDate: todayKey })],
    });
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: todayLabel }));
    const drawer = screen.getByRole('dialog', { name: '日期详情' });
    expect(within(drawer).getByText('移动端待办')).toBeInTheDocument();

    await user.click(within(drawer).getByRole('button', { name: '关闭日期详情' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: '日期详情' })).not.toBeInTheDocument();
    });
  });

  it('周视图按时长渲染重复事件块', async () => {
    seedStore({
      events: [
        makeEvent({
          id: 'daily-1',
          title: '每日站会',
          startDate: combineDateTime(daysAgoKey, '09:00'),
          endDate: combineDateTime(daysAgoKey, '10:00'),
          repeat: 'daily',
        }),
      ],
      todos: [makeTodo({ id: 't1', title: '今天要做', dueDate: todayKey })],
    });
    const user = userEvent.setup();
    renderWithProviders(<CalendarPage />);

    await user.click(screen.getByRole('button', { name: '周视图' }));
    expect(screen.getByRole('button', { name: '上一周' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '下一周' })).toBeInTheDocument();
    expect(screen.getByText('全天')).toBeInTheDocument();
    expect(screen.getByText('今天要做')).toBeInTheDocument();

    const blocks = screen.getAllByTestId('timed-event-daily-1');
    expect(blocks).toHaveLength(7);
    expect(blocks[0].style.top).toBe('432px');
    expect(blocks[0].style.height).toBe('48px');
  });

  it('?date= 参数消费一次并跳转到对应月份', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar?date=2025-06-15' });

    expect(screen.getByText('2025年 06月')).toBeInTheDocument();
    const panel = screen.getByTestId('day-detail-panel');
    expect(within(panel).getByText(/06月15日/)).toBeInTheDocument();
  });

  it('非法 ?date= 参数被忽略，保持当前月', async () => {
    renderWithProviders(<CalendarPage />, { route: '/calendar?date=not-a-date' });
    expect(screen.getByText(currentMonthHeader)).toBeInTheDocument();
  });
});
