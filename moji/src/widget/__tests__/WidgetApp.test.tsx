import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WidgetApp } from '@/widget/WidgetApp';
import { renderWithProviders, seedStore, makeTodo } from '@/test/render';
import { useAppStore } from '@/store';
import { toDayKey } from '@/utils/date';
import type { MojiBridge } from '@/platform/bridge';

function makeBridge(overrides: Partial<MojiBridge> = {}): MojiBridge {
  return {
    shell: 'electron',
    load: async () => null,
    save: async () => {},
    onChange: () => () => {},
    closeWindow: vi.fn(),
    toggleWidget: vi.fn(),
    ...overrides,
  } as MojiBridge;
}

function tomorrow(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return toDayKey(date);
}

describe('WidgetApp', () => {
  it('只展示今天到期且未完成的待办', () => {
    seedStore({
      todos: [
        makeTodo({ id: 'today', title: '今天到期', dueDate: toDayKey(new Date()) }),
        makeTodo({ id: 'tomorrow', title: '明天到期', dueDate: tomorrow() }),
        makeTodo({ id: 'done', title: '已完成', dueDate: toDayKey(new Date()), completed: true }),
        makeTodo({ id: 'no-date', title: '没有截止日期' }),
      ],
    });

    renderWithProviders(<WidgetApp bridge={null} />);

    expect(screen.getByText('今天到期')).toBeInTheDocument();
    expect(screen.queryByText('明天到期')).not.toBeInTheDocument();
    expect(screen.queryByText('已完成')).not.toBeInTheDocument();
    expect(screen.queryByText('没有截止日期')).not.toBeInTheDocument();
    expect(screen.getByText('今日 1 项')).toBeInTheDocument();
    expect(screen.getByText('未完成 3 项')).toBeInTheDocument();
  });

  it('今天没有到期待办时显示空状态', () => {
    seedStore({ todos: [makeTodo({ title: '以后再说', dueDate: tomorrow() })] });
    renderWithProviders(<WidgetApp bridge={null} />);

    expect(screen.getByText('今天没有到期待办')).toBeInTheDocument();
    expect(screen.getByText('今日 0 项')).toBeInTheDocument();
  });

  it('点击待办直接切换完成状态（与主窗口同一份 store）', async () => {
    const user = userEvent.setup();
    seedStore({
      todos: [
        makeTodo({ id: 'todo-open', title: '勾掉我', dueDate: toDayKey(new Date()) }),
        makeTodo({ id: 'todo-other', title: '别的待办' }),
      ],
    });

    renderWithProviders(<WidgetApp bridge={null} />);
    await user.click(screen.getByRole('button', { name: /勾掉我/ }));

    const todos = useAppStore.getState().todos;
    expect(todos.find((todo) => todo.id === 'todo-open')?.completed).toBe(true);
    // 不影响其他待办
    expect(todos.find((todo) => todo.id === 'todo-other')?.completed).toBe(false);
  });

  it('Web 预览下没有关闭按钮', () => {
    renderWithProviders(<WidgetApp bridge={null} />);
    expect(screen.queryByLabelText('关闭小组件')).not.toBeInTheDocument();
  });

  it('桌面壳下点击关闭按钮调用 bridge.closeWindow', async () => {
    const user = userEvent.setup();
    const bridge = makeBridge();
    renderWithProviders(<WidgetApp bridge={bridge} />);

    await user.click(screen.getByLabelText('关闭小组件'));
    expect(bridge.closeWindow).toHaveBeenCalledTimes(1);
  });
});
