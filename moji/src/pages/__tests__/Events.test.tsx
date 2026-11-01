import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Events from '@/pages/Events';
import { useAppStore } from '@/store';
import { combineDateTime, toDayKey } from '@/utils/date';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
} from '@/test/render';

const todayKey = toDayKey(new Date());

describe('Events 日程页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('空状态展示', () => {
    renderWithProviders(<Events />);
    expect(screen.getByText('暂无日程')).toBeInTheDocument();
  });

  it('新建日程：同一表单创建并 toast', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Events />);

    await user.click(screen.getByRole('button', { name: '新建' }));
    const dialog = screen.getByRole('dialog', { name: '新建日程' });
    await user.type(within(dialog).getByLabelText('标题'), '产品评审');
    await user.type(within(dialog).getByLabelText('地点'), '三号会议室');
    await user.type(within(dialog).getByLabelText('描述'), '评审 v1 设计稿');
    await user.click(within(dialog).getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(useAppStore.getState().events).toHaveLength(1);
    });
    const event = useAppStore.getState().events[0];
    expect(event.title).toBe('产品评审');
    expect(event.location).toBe('三号会议室');
    expect(event.startDate).toBe(combineDateTime(todayKey, '09:00'));
    expect(event.endDate).toBeUndefined();
    expect(event.isAllDay).toBe(false);
    expect(await screen.findByText('日程已创建')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('结束时间早于开始时间内联报错且不落库', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Events />);

    await user.click(screen.getByRole('button', { name: '新建' }));
    const dialog = screen.getByRole('dialog', { name: '新建日程' });
    await user.type(within(dialog).getByLabelText('标题'), '倒序时间');
    // 结束日期与开始日期设为同一天
    fireEvent.change(within(dialog).getByLabelText('开始日期'), {
      target: { value: '2025-06-10' },
    });
    fireEvent.change(within(dialog).getByLabelText('结束日期（可选）'), {
      target: { value: '2025-06-10' },
    });
    fireEvent.change(within(dialog).getByLabelText('开始时间'), {
      target: { value: '15:00' },
    });
    fireEvent.change(within(dialog).getByLabelText('结束时间'), {
      target: { value: '14:00' },
    });
    await user.click(within(dialog).getByRole('button', { name: '创建' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('结束时间不能早于开始时间');
    expect(useAppStore.getState().events).toHaveLength(0);
  });

  it('重复日程展示重复标记', () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e-repeat',
          title: '每周复盘',
          startDate: combineDateTime(todayKey, '19:00'),
          repeat: 'weekly',
        }),
      ],
    });
    renderWithProviders(<Events />);

    expect(screen.getByText('每周')).toBeInTheDocument();
    expect(screen.getByText('每周复盘')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`19:00`))).toBeInTheDocument();
  });

  it('编辑日程使用同一表单并更新 store', async () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e1',
          title: '旧标题',
          startDate: combineDateTime('2025-06-10', '09:00'),
          endDate: combineDateTime('2025-06-10', '10:00'),
        }),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<Events />);

    await user.click(screen.getByRole('button', { name: '编辑旧标题' }));
    const dialog = screen.getByRole('dialog', { name: '编辑日程' });
    const titleInput = within(dialog).getByLabelText('标题');
    expect(titleInput).toHaveValue('旧标题');
    expect(within(dialog).getByLabelText('开始日期')).toHaveValue('2025-06-10');

    await user.clear(titleInput);
    await user.type(titleInput, '新标题');
    await user.click(within(dialog).getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(useAppStore.getState().events[0].title).toBe('新标题');
    });
    expect(await screen.findByText('日程已更新')).toBeInTheDocument();
  });

  it('删除日程需二次确认并 toast', async () => {
    seedStore({
      events: [makeEvent({ id: 'e1', title: '要删除的日程', startDate: combineDateTime(todayKey, '09:00') })],
    });
    const user = userEvent.setup();
    renderWithProviders(<Events />);

    await user.click(screen.getByRole('button', { name: '删除要删除的日程' }));
    const dialog = screen.getByRole('dialog', { name: '删除日程' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(useAppStore.getState().events).toHaveLength(0);
    });
    expect(await screen.findByText('日程已删除')).toBeInTheDocument();
  });

  it('列表按开始时间升序排列', () => {
    seedStore({
      events: [
        makeEvent({ id: 'late', title: '晚场', startDate: combineDateTime('2025-06-12', '15:00') }),
        makeEvent({ id: 'early', title: '早场', startDate: combineDateTime('2025-06-10', '09:00') }),
      ],
    });
    renderWithProviders(<Events />);

    const cards = screen.getAllByTestId(/^event-/);
    expect(cards[0]).toHaveTextContent('早场');
    expect(cards[1]).toHaveTextContent('晚场');
  });

  it('?new=1 自动打开新建弹窗', async () => {
    renderWithProviders(<Events />, { route: '/events?new=1' });
    expect(await screen.findByRole('dialog', { name: '新建日程' })).toBeInTheDocument();
  });

  it('编辑时展示已有时间', () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e1',
          title: '有时间的日程',
          startDate: combineDateTime('2025-06-10', '14:30'),
          endDate: combineDateTime('2025-06-10', '16:00'),
        }),
      ],
    });
    renderWithProviders(<Events />);
    expect(screen.getByText(/14:30/)).toBeInTheDocument();
  });
});
