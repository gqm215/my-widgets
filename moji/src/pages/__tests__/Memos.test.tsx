import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Memos from '@/pages/Memos';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeMemo,
} from '@/test/render';

describe('Memos 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('空状态展示', () => {
    renderWithProviders(<Memos />);
    expect(screen.getByText('暂无备忘')).toBeInTheDocument();
  });

  it('记录备忘：按钮添加并 toast', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.type(screen.getByLabelText('记录备忘'), '灵感一闪：做个小工具');
    await user.click(screen.getByRole('button', { name: '添加' }));

    await waitFor(() => {
      expect(useAppStore.getState().memos).toHaveLength(1);
    });
    expect(useAppStore.getState().memos[0].content).toBe('灵感一闪：做个小工具');
    expect(await screen.findByText('备忘已记录')).toBeInTheDocument();
    expect(screen.getByLabelText('记录备忘')).toHaveValue('');
  });

  it('回车快速添加备忘', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.type(screen.getByLabelText('记录备忘'), '回车记录{Enter}');
    await waitFor(() => {
      expect(useAppStore.getState().memos).toHaveLength(1);
    });
    expect(useAppStore.getState().memos[0].content).toBe('回车记录');
  });

  it('?new=1 聚焦输入框', async () => {
    renderWithProviders(<Memos />, { route: '/memos?new=1' });
    const textarea = screen.getByLabelText('记录备忘');
    await waitFor(() => expect(textarea).toHaveFocus());
  });

  it('转为待办：删除备忘并创建待办 + toast', async () => {
    seedStore({ memos: [makeMemo({ id: 'm1', content: '给花浇水' })] });
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.click(screen.getByRole('button', { name: '转为待办' }));

    await waitFor(() => {
      expect(useAppStore.getState().memos).toHaveLength(0);
      expect(useAppStore.getState().todos).toHaveLength(1);
    });
    expect(useAppStore.getState().todos[0].title).toBe('给花浇水');
    expect(await screen.findByText('已转为待办')).toBeInTheDocument();
  });

  it('转为日程：弹窗填写后创建日程 + toast', async () => {
    seedStore({ memos: [makeMemo({ id: 'm1', content: '周五复盘' })] });
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.click(screen.getByRole('button', { name: '转为日程' }));
    const dialog = screen.getByRole('dialog', { name: '转为日程' });
    const titleInput = within(dialog).getByLabelText('标题');
    await user.clear(titleInput);
    await user.type(titleInput, '周五复盘会');
    await user.click(within(dialog).getByRole('button', { name: '创建日程' }));

    await waitFor(() => {
      expect(useAppStore.getState().events).toHaveLength(1);
    });
    const event = useAppStore.getState().events[0];
    expect(event.title).toBe('周五复盘会');
    expect(event.isAllDay).toBe(false);
    expect(await screen.findByText('已转为日程')).toBeInTheDocument();
  });

  it('转为日程时结束时间早于开始时间会内联报错', async () => {
    seedStore({ memos: [makeMemo({ id: 'm1', content: '倒序时间' })] });
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.click(screen.getByRole('button', { name: '转为日程' }));
    const dialog = screen.getByRole('dialog', { name: '转为日程' });
    const start = within(dialog).getByLabelText('开始时间');
    const end = within(dialog).getByLabelText('结束时间');
    await user.clear(start);
    await user.type(start, '15:00');
    await user.clear(end);
    await user.type(end, '14:00');
    await user.click(within(dialog).getByRole('button', { name: '创建日程' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('结束时间不能早于开始时间');
    expect(useAppStore.getState().events).toHaveLength(0);
  });

  it('删除备忘需二次确认并 toast', async () => {
    seedStore({ memos: [makeMemo({ id: 'm1', content: '要删除的备忘' })] });
    const user = userEvent.setup();
    renderWithProviders(<Memos />);

    await user.click(screen.getByRole('button', { name: '删除' }));
    const dialog = screen.getByRole('dialog', { name: '删除备忘' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(useAppStore.getState().memos).toHaveLength(0);
    });
    expect(await screen.findByText('备忘已删除')).toBeInTheDocument();
  });
});
