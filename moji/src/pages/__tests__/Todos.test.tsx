import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Todos from '@/pages/Todos';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeTodo,
} from '@/test/render';

describe('Todos 页面', () => {
  beforeEach(() => {
    resetStore();
  });

  it('空状态展示', () => {
    renderWithProviders(<Todos />);
    expect(screen.getByText('暂无待办事项')).toBeInTheDocument();
    expect(screen.getByText('共 0 项 · 已完成 0 项')).toBeInTheDocument();
  });

  it('渲染待办列表与统计', () => {
    seedStore({
      todos: [
        makeTodo({ id: 't1', title: '写周报', priority: 'high', completed: true }),
        makeTodo({ id: 't2', title: '买牛奶', priority: 'low' }),
      ],
    });
    renderWithProviders(<Todos />);

    expect(screen.getByText('写周报')).toBeInTheDocument();
    expect(screen.getByText('买牛奶')).toBeInTheDocument();
    expect(screen.getByText('共 2 项 · 已完成 1 项')).toBeInTheDocument();
  });

  it('新建待办：Modal 表单创建并 toast', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Todos />);

    await user.click(screen.getByRole('button', { name: '新建' }));
    const dialog = screen.getByRole('dialog', { name: '新建待办' });
    await user.type(within(dialog).getByLabelText('标题'), '整理会议纪要');
    await user.type(within(dialog).getByLabelText('描述'), '会后 30 分钟内完成');
    await user.selectOptions(within(dialog).getByLabelText('优先级'), 'high');
    await user.click(within(dialog).getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(useAppStore.getState().todos).toHaveLength(1);
    });
    const todo = useAppStore.getState().todos[0];
    expect(todo.title).toBe('整理会议纪要');
    expect(todo.description).toBe('会后 30 分钟内完成');
    expect(todo.priority).toBe('high');
    expect(await screen.findByText('待办已创建')).toBeInTheDocument();
    expect(screen.getByText('整理会议纪要')).toBeInTheDocument();
  });

  it('新建校验：标题为空时不落库并内联报错', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Todos />);

    await user.click(screen.getByRole('button', { name: '新建' }));
    const dialog = screen.getByRole('dialog', { name: '新建待办' });
    await user.click(within(dialog).getByRole('button', { name: '创建' }));

    expect(within(dialog).getByRole('alert')).toHaveTextContent('请输入待办标题');
    expect(useAppStore.getState().todos).toHaveLength(0);
  });

  it('复选框带 role=checkbox 与 aria-checked，可切换完成状态', async () => {
    seedStore({ todos: [makeTodo({ id: 't1', title: '写周报' })] });
    const user = userEvent.setup();
    renderWithProviders(<Todos />);

    const checkbox = screen.getByRole('checkbox', { name: '标记「写周报」为已完成' });
    expect(checkbox).toHaveAttribute('aria-checked', 'false');
    await user.click(checkbox);

    expect(useAppStore.getState().todos[0].completed).toBe(true);
    expect(screen.getByRole('checkbox', { name: '标记「写周报」为未完成' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  it('按状态与优先级筛选', async () => {
    seedStore({
      todos: [
        makeTodo({ id: 't1', title: '已完成的高优任务', priority: 'high', completed: true }),
        makeTodo({ id: 't2', title: '未完成的中优任务', priority: 'medium' }),
      ],
    });
    const user = userEvent.setup();
    renderWithProviders(<Todos />);

    await user.click(screen.getByRole('button', { name: '已完成' }));
    expect(screen.getByText('已完成的高优任务')).toBeInTheDocument();
    expect(screen.queryByText('未完成的中优任务')).not.toBeInTheDocument();

    await user.click(screen.getAllByRole('button', { name: '全部' })[0]);
    await user.click(screen.getByRole('button', { name: '高' }));
    expect(screen.getByText('已完成的高优任务')).toBeInTheDocument();
    expect(screen.queryByText('未完成的中优任务')).not.toBeInTheDocument();
  });

  it('删除待办需二次确认并 toast', async () => {
    seedStore({ todos: [makeTodo({ id: 't1', title: '要删除的任务' })] });
    const user = userEvent.setup();
    renderWithProviders(<Todos />);

    await user.click(screen.getByRole('button', { name: '删除要删除的任务' }));
    const dialog = screen.getByRole('dialog', { name: '删除待办' });
    await user.click(within(dialog).getByRole('button', { name: '删除' }));

    await waitFor(() => {
      expect(useAppStore.getState().todos).toHaveLength(0);
    });
    expect(await screen.findByText('待办已删除')).toBeInTheDocument();
  });

  it('?new=1 自动打开新建弹窗', async () => {
    renderWithProviders(<Todos />, { route: '/todos?new=1' });
    expect(await screen.findByRole('dialog', { name: '新建待办' })).toBeInTheDocument();
  });
});
