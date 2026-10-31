import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import Report from '@/pages/Report';
import { getWeekRange } from '@/utils/report';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeEvent,
  makeNote,
  makeTodo,
} from '@/test/render';

const currentRange = getWeekRange(0);
const lastRange = getWeekRange(-1);

function withinLastWeekIso(): string {
  return new Date(lastRange.monday.getTime() + 60 * 60 * 1000).toISOString();
}

describe('Report 周报页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('渲染周报标题、周范围与统计卡片', () => {
    seedStore({
      notes: [makeNote({ id: 'n1', title: '本周笔记', createdAt: new Date().toISOString() })],
      todos: [makeTodo({ id: 't1', title: '本周完成', completed: true, completedAt: new Date().toISOString() })],
    });
    renderWithProviders(<Report />);

    expect(screen.getByText('周报')).toBeInTheDocument();
    expect(screen.getByText(/年.*月.*日 - .*月.*日/)).toBeInTheDocument();
    expect(screen.getByText('完成待办')).toBeInTheDocument();
    expect(screen.getByText('新增笔记')).toBeInTheDocument();
    expect(screen.getByText('新增备忘')).toBeInTheDocument();
    expect(screen.getByText('日程事件')).toBeInTheDocument();
    expect(screen.getByText('本周笔记')).toBeInTheDocument();
  });

  it('上一周 / 下一周 / 回到本周 翻周逻辑与禁用状态', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Report />);

    const nextButton = screen.getByRole('button', { name: '下一周' });
    const prevButton = screen.getByRole('button', { name: '上一周' });
    const backButton = screen.getByRole('button', { name: '回到本周' });
    expect(nextButton).toBeDisabled();
    expect(backButton).toBeDisabled();

    await user.click(prevButton);
    expect(nextButton).toBeEnabled();
    expect(backButton).toBeEnabled();

    await user.click(backButton);
    expect(nextButton).toBeDisabled();
    expect(backButton).toBeDisabled();
  });

  it('翻到上一周后展示上周完成的待办', async () => {
    seedStore({
      todos: [
        makeTodo({
          id: 't-last',
          title: '上周完成的任务',
          completed: true,
          completedAt: withinLastWeekIso(),
        }),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<Report />);

    expect(screen.queryByText('上周完成的任务')).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '上一周' }));
    expect(screen.getByText('上周完成的任务')).toBeInTheDocument();
  });

  it('导出文件名对应当前周', async () => {
    seedStore({
      events: [
        makeEvent({
          id: 'e1',
          title: '本周会议',
          startDate: new Date().toISOString(),
        }),
      ],
    });
    let downloaded = '';
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloaded = this.download;
    });
    const user = userEvent.setup();
    renderWithProviders(<Report />);

    await user.click(screen.getByRole('button', { name: /导出 Markdown/ }));
    const expected = `周报-${format(currentRange.monday, 'yyyy-MM-dd')}_${format(
      currentRange.sunday,
      'yyyy-MM-dd',
    )}.md`;
    await waitFor(() => expect(downloaded).toBe(expected));
  });

  it('无活动时展示空状态', () => {
    renderWithProviders(<Report />);
    expect(screen.getByText('本周暂无活动')).toBeInTheDocument();
  });
});
