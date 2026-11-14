import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TaskDetail } from '../TaskDetail';
import { useAppStore } from '@/store';
import { renderWithProviders, resetStore, seedStore, makeTodo } from '@/test/render';
import type { Todo } from '@/types';

// B3-T1a：MarkdownView 懒加载 react-markdown + katex 链路，首次按需编译可能超过
// waitFor 默认 1s，先在文件内预热动态模块（不改变被测的异步渲染路径）
beforeAll(async () => {
  await import('@/components/markdown/MarkdownViewImpl');
});

/**
 * 镜像页面接线（Todos.tsx 契约）：从 store 取最新 todo / 子任务传给 TaskDetail，
 * 使 store 动作后组件像真实页面一样收到新 props 重渲染。
 */
function DetailHarness({ todoId, onDelete }: { todoId: string; onDelete: (t: Todo) => void }) {
  const todos = useAppStore((s) => s.todos);
  const todo = todos.find((t) => t.id === todoId);
  if (!todo) return null;
  const subtasks = todos
    .filter((t) => t.parentId === todoId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return <TaskDetail todo={todo} subtasks={subtasks} onDelete={onDelete} />;
}

function renderDetail(
  todoSeed: Partial<Todo> = {},
  opts: { subtasks?: Partial<Todo>[] } = {}
) {
  const todo = makeTodo({ id: 't1', title: '写周报', ...todoSeed });
  const subtasks = (opts.subtasks ?? []).map((st) => makeTodo({ ...st, parentId: todo.id }));
  seedStore({ todos: [todo, ...subtasks] });
  const onDelete = vi.fn();
  renderWithProviders(<DetailHarness todoId={todo.id} onDelete={onDelete} />);
  return { todo, onDelete };
}

const todoInStore = (id: string) => useAppStore.getState().todos.find((t) => t.id === id)!;

beforeEach(() => {
  resetStore();
});

describe('TaskDetail · 标题编辑（blur/Enter 提交，Notes 先例）', () => {
  it('常驻 input 展示当前标题，Enter 提交 updateTodo', async () => {
    renderDetail();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '任务标题' });
    expect(input).toHaveValue('写周报');

    await user.type(input, '（改）{Enter}');
    expect(todoInStore('t1').title).toBe('写周报（改）');
    expect(input).toHaveValue('写周报（改）');
  });

  it('blur 提交（Notes.tsx 同款先例）', async () => {
    renderDetail();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '任务标题' });
    await user.clear(input);
    await user.type(input, '改后标题');
    await user.tab();
    expect(todoInStore('t1').title).toBe('改后标题');
  });

  it('Esc 还原草稿且 blur 不提交', async () => {
    renderDetail();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '任务标题' });
    await user.type(input, '（改）');
    await user.type(input, '{Escape}');
    expect(input).toHaveValue('写周报');
    await user.tab();
    expect(todoInStore('t1').title).toBe('写周报');
  });

  it('空标题 blur 不提交并还原原标题', async () => {
    renderDetail();
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '任务标题' });
    await user.clear(input);
    await user.tab();
    expect(todoInStore('t1').title).toBe('写周报');
    expect(input).toHaveValue('写周报');
  });
});

describe('TaskDetail · 截止日期', () => {
  it('无日期显示占位，选择日期写入 dueDate', async () => {
    renderDetail();
    expect(screen.getByText('设置截止日期')).toBeInTheDocument();

    const input = screen.getByLabelText('截止日期');
    fireEvent.change(input, { target: { value: '2026-01-15' } });
    expect(todoInStore('t1').dueDate).toBe('2026-01-15');
    expect(screen.getByText('截止 2026-01-15')).toBeInTheDocument();
  });

  it('清空日期移除字段', () => {
    renderDetail({ dueDate: '2026-01-15' });
    fireEvent.change(screen.getByLabelText('截止日期'), { target: { value: '' } });
    expect(todoInStore('t1').dueDate).toBeUndefined();
    expect(screen.getByText('设置截止日期')).toBeInTheDocument();
  });
});

describe('TaskDetail · 优先级 4 档（D20）', () => {
  it('radiogroup 四档，点选更新 priority', async () => {
    renderDetail(); // makeTodo 默认 medium
    const user = userEvent.setup();
    const group = screen.getByRole('radiogroup', { name: '优先级' });
    expect(within(group).getByRole('radio', { name: '中' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(within(group).getByRole('radio', { name: '高' }));
    expect(todoInStore('t1').priority).toBe('high');
    expect(within(group).getByRole('radio', { name: '高' })).toHaveAttribute(
      'aria-checked',
      'true'
    );

    await user.click(within(group).getByRole('radio', { name: '无' }));
    expect(todoInStore('t1').priority).toBe('none');
    expect(within(group).getByRole('radio', { name: '低' })).toHaveAttribute(
      'aria-checked',
      'false'
    );
  });
});

describe('TaskDetail · 描述（D6 Markdown 双态）', () => {
  it('无描述默认编辑态；输入后点预览 → blur 保存并渲染 Markdown', async () => {
    renderDetail();
    const user = userEvent.setup();
    const textarea = screen.getByRole('textbox', { name: '任务描述' });
    expect(screen.getByRole('button', { name: '编辑' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await user.type(textarea, '**加粗**正文');
    await user.click(screen.getByRole('button', { name: '预览' }));

    expect(todoInStore('t1').description).toBe('**加粗**正文');
    // B3-T1a：MarkdownView 懒加载，预览内容异步出现
    const preview = screen.getByLabelText('描述预览');
    await waitFor(() => {
      expect(preview.querySelector('strong')?.textContent).toBe('加粗');
    });
    expect(within(preview).getByText(/正文/)).toBeInTheDocument();
  });

  it('GFM 任务列表渲染生效（remark-gfm）', async () => {
    renderDetail({ description: '- [x] 完成\n- [ ] 未完' });
    const preview = screen.getByLabelText('描述预览');
    await waitFor(() => {
      expect(preview.querySelectorAll('input[type="checkbox"]')).toHaveLength(2);
    });
    const checkboxes = preview.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes[0]).toHaveAttribute('checked');
    expect(checkboxes[1]).not.toHaveAttribute('checked');
  });

  it('预览渲染全要素 Markdown（标题/段落/行内码/链接/引用/代码块/列表）', async () => {
    const doc = [
      '# 一级',
      '## 二级',
      '### 三级',
      '',
      '段落与 `行内代码` 以及 [链接](https://example.com)',
      '',
      '> 引用一句',
      '',
      '- 列表项',
      '',
      '```',
      'const x = 1',
      '```',
    ].join('\n');
    renderDetail({ description: doc });
    const preview = screen.getByLabelText('描述预览');
    await waitFor(() => {
      expect(preview.querySelector('h1')?.textContent).toBe('一级');
    });
    expect(preview.querySelector('h2')?.textContent).toBe('二级');
    expect(preview.querySelector('h3')?.textContent).toBe('三级');
    expect(preview.querySelector('code')?.textContent).toBe('行内代码');
    expect(preview.querySelector('a')?.getAttribute('href')).toBe('https://example.com');
    expect(preview.querySelector('blockquote')).toBeInTheDocument();
    expect(preview.querySelector('pre')?.textContent).toContain('const x = 1');
    expect(preview.querySelector('li')?.textContent).toBe('列表项');
  });

  it('编辑回显 Markdown 原文；清空保存移除字段', async () => {
    renderDetail({ description: '**原文**' });
    const user = userEvent.setup();
    // 有描述默认预览态
    expect(screen.getByLabelText('描述预览')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '编辑' }));
    const textarea = screen.getByRole('textbox', { name: '任务描述' });
    expect(textarea).toHaveValue('**原文**');

    await user.clear(textarea);
    await user.tab();
    expect(todoInStore('t1').description).toBeUndefined();
    expect(screen.getByRole('textbox', { name: '任务描述' })).toHaveValue('');
  });

  it('失焦即保存（点其他控件触发 blur）', async () => {
    renderDetail();
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: '任务描述' }), '先存一段');
    await user.click(screen.getByRole('radio', { name: '高' }));
    expect(todoInStore('t1').description).toBe('先存一段');
    expect(todoInStore('t1').priority).toBe('high');
  });

  it('未修改描述失焦不写库；空描述预览显示占位', async () => {
    renderDetail();
    const user = userEvent.setup();
    const before = todoInStore('t1');

    // 未键入内容，聚焦后失焦 → 无写库（对象引用不变）
    await user.click(screen.getByRole('textbox', { name: '任务描述' }));
    await user.tab();
    expect(todoInStore('t1')).toBe(before);

    // 空描述切预览 → 占位文案（MarkdownView 懒加载，异步出现）
    await user.click(screen.getByRole('button', { name: '预览' }));
    await waitFor(() => {
      expect(screen.getByText('暂无描述')).toBeInTheDocument();
    });
  });
});

describe('TaskDetail · 子任务（D4）', () => {
  it('列表渲染 + 勾选切换状态', async () => {
    renderDetail(
      { id: 'p1', title: '父任务' },
      { subtasks: [{ id: 's1', title: '子任务甲' }, { id: 's2', title: '子任务乙' }] }
    );
    const user = userEvent.setup();
    expect(screen.getByText('子任务（2）')).toBeInTheDocument();

    await user.click(screen.getByRole('checkbox', { name: '标记「子任务甲」为已完成' }));
    expect(todoInStore('s1').status).toBe('completed');
    expect(
      screen.getByRole('checkbox', { name: '标记「子任务甲」为未完成' })
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('内联添加：回车创建并清空，可连续添加', async () => {
    renderDetail({ id: 'p1', title: '父任务' });
    const user = userEvent.setup();
    const input = screen.getByRole('textbox', { name: '添加子任务' });

    await user.type(input, '子任务丙{Enter}');
    const first = useAppStore
      .getState()
      .todos.find((t) => t.title === '子任务丙')!;
    expect(first.parentId).toBe('p1');
    expect(first.status).toBe('active');
    expect(input).toHaveValue('');
    expect(input).toHaveFocus();

    await user.type(input, '子任务丁{Enter}');
    expect(
      useAppStore.getState().todos.find((t) => t.title === '子任务丁')
    ).toBeDefined();
  });

  it('空标题回车不创建', async () => {
    renderDetail({ id: 'p1', title: '父任务' });
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: '添加子任务' }), '   {Enter}');
    expect(
      useAppStore.getState().todos.filter((t) => t.parentId === 'p1')
    ).toHaveLength(0);
  });

  it('hover 删除按钮触发页面级删除确认回调（单删子任务）', async () => {
    const { onDelete } = renderDetail(
      { id: 'p1', title: '父任务' },
      { subtasks: [{ id: 's2', title: '子任务乙' }] }
    );
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '删除子任务乙' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toMatchObject({ id: 's2', title: '子任务乙' });
    // 回调只触发确认流，父任务不受影响（删除落库由页面级 ConfirmDialog 完成）
    expect(todoInStore('p1')).toBeDefined();
  });

  it('已完成子任务可勾回未完成', async () => {
    renderDetail(
      { id: 'p1', title: '父任务' },
      { subtasks: [{ id: 's1', title: '子任务甲', status: 'completed' }] }
    );
    const user = userEvent.setup();
    expect(
      screen.getByRole('checkbox', { name: '标记「子任务甲」为未完成' })
    ).toHaveAttribute('aria-checked', 'true');
    await user.click(screen.getByRole('checkbox', { name: '标记「子任务甲」为未完成' }));
    expect(todoInStore('s1').status).toBe('active');
  });
});

describe('TaskDetail · 状态操作', () => {
  it('active 顶层任务：放弃 → abandoned → 恢复 → active', async () => {
    renderDetail();
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: '放弃「写周报」' }));
    expect(todoInStore('t1').status).toBe('abandoned');
    expect(screen.queryByRole('button', { name: '放弃「写周报」' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '恢复「写周报」' }));
    expect(todoInStore('t1').status).toBe('active');
    expect(screen.getByRole('button', { name: '放弃「写周报」' })).toBeInTheDocument();
  });

  it('completed 任务提供「标记为进行中」（toggleTodo 路径）', async () => {
    renderDetail({ status: 'completed' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '标记「写周报」为进行中' }));
    expect(todoInStore('t1').status).toBe('active');
  });

  it('删除按钮触发页面级删除确认回调', async () => {
    const { onDelete } = renderDetail();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '删除写周报' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onDelete.mock.calls[0][0]).toMatchObject({ id: 't1', title: '写周报' });
  });
});

describe('TaskDetail · 子任务受限展示（D4 防御：子任务不进详情选中集，组件仍正确降级）', () => {
  it('子任务详情无放弃/恢复、无添加子任务入口，删除可用', async () => {
    const { onDelete } = renderDetail({ id: 's1', title: '子任务甲', parentId: 'p1' });
    expect(screen.queryByRole('button', { name: /放弃/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /恢复/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('添加子任务')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '删除子任务甲' })).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '删除子任务甲' }));
    expect(onDelete.mock.calls[0][0]).toMatchObject({ id: 's1' });
  });

  it('已完成子任务提供「标记为进行中」', async () => {
    renderDetail({ id: 's1', title: '子任务甲', parentId: 'p1', status: 'completed' });
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: '标记「子任务甲」为进行中' }));
    expect(todoInStore('s1').status).toBe('active');
  });
});

describe('TaskDetail · 提醒占位行（B5 前占位）', () => {
  it('禁用态展示，title 提示 B5 接入', () => {
    renderDetail();
    const row = screen.getByLabelText('提醒');
    expect(row).toHaveAttribute('aria-disabled', 'true');
    expect(row).toHaveAttribute('title', '提醒调度将在 B5 接入');
    expect(row).toHaveTextContent('提醒：未设置');
    expect(row).toHaveTextContent('提醒调度将在 B5 接入');
  });
});
