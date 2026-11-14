import { describe, it, expect, beforeEach } from 'vitest';
import { screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useLocation } from 'react-router-dom';
import { addDays, format } from 'date-fns';
import Todos from '@/pages/Todos';
import { useAppStore } from '@/store';
import {
  renderWithProviders,
  resetStore,
  seedStore,
  makeTodo,
  setMediaQuery,
} from '@/test/render';
import { makeList } from '@/test/fixtures';

const todayKey = format(new Date(), 'yyyy-MM-dd');
const overdueKey = format(addDays(new Date(), -1), 'yyyy-MM-dd');
const tomorrowKey = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const futureKey = format(addDays(new Date(), 3), 'yyyy-MM-dd');

function LocationProbe() {
  const location = useLocation();
  return (
    <div data-testid="location-probe">
      {location.pathname}
      {location.search}
    </div>
  );
}

function renderTodos(route = '/todos') {
  return renderWithProviders(
    <>
      <Todos />
      <LocationProbe />
    </>,
    { route }
  );
}

beforeEach(() => {
  resetStore();
});

describe('Todos 页 · 三栏重构（B2-T1）', () => {
  describe('视图与路由同步（D9）', () => {
    it('默认收集箱视图：空状态 + 内联添加框常驻', () => {
      renderTodos();
      expect(screen.getByRole('heading', { name: '收集箱' })).toBeInTheDocument();
      expect(screen.getByText('暂无待办事项')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: '新建待办' })).toBeInTheDocument();
    });

    it('?list=today 初始化今天视图（无内联添加），非法参数回落收集箱并写回 URL', async () => {
      const first = renderTodos('/todos?list=today');
      expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: '新建待办' })).not.toBeInTheDocument();
      first.unmount();

      renderTodos('/todos?list=bogus');
      expect(screen.getByRole('heading', { name: '收集箱' })).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent('list=inbox');
      });
    });

    it('点击清单栏切换视图并 replace 更新参数（智能清单与用户清单）', async () => {
      seedStore({ lists: [makeList({ id: 'l1', name: '工作' })] });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '今天（0 项待办）' }));
      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent('list=today');
      });
      expect(screen.getByRole('heading', { name: '今天' })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '工作（0 项待办）' }));
      await waitFor(() => {
        expect(screen.getByTestId('location-probe')).toHaveTextContent('list=l1');
      });
      expect(screen.getByRole('heading', { name: '工作' })).toBeInTheDocument();
    });

    it('?new=1 聚焦内联添加框并清除参数（QuickCreate 落点契约）', async () => {
      renderTodos('/todos?new=1');
      const input = screen.getByRole('textbox', { name: '新建待办' });
      await waitFor(() => expect(input).toHaveFocus());
      await waitFor(() => {
        const probe = screen.getByTestId('location-probe');
        expect(probe).toHaveTextContent('/todos?list=inbox');
        expect(probe).not.toHaveTextContent('new=1');
      });
    });
  });

  describe('内联添加（旧新建弹窗移除）', () => {
    it('回车创建待办（收集箱无 listId），清空并保持焦点连续创建', async () => {
      const user = userEvent.setup();
      renderTodos();
      const input = screen.getByRole('textbox', { name: '新建待办' });

      await user.type(input, '整理会议纪要{Enter}');
      await waitFor(() => {
        const todos = useAppStore.getState().todos;
        expect(todos).toHaveLength(1);
        expect(todos[0].title).toBe('整理会议纪要');
        expect(todos[0].listId).toBeUndefined();
        expect(todos[0].priority).toBe('none');
        expect(todos[0].status).toBe('active');
      });
      expect(input).toHaveValue('');
      expect(input).toHaveFocus();
      expect(await screen.findByText('待办已创建')).toBeInTheDocument();

      await user.type(input, '第二件事{Enter}');
      await waitFor(() => {
        expect(useAppStore.getState().todos).toHaveLength(2);
      });
    });

    it('空标题回车不落库', async () => {
      const user = userEvent.setup();
      renderTodos();
      await user.type(screen.getByRole('textbox', { name: '新建待办' }), '   {Enter}');
      expect(useAppStore.getState().todos).toHaveLength(0);
    });

    it('清单视图创建归属当前清单', async () => {
      seedStore({ lists: [makeList({ id: 'l1', name: '工作' })] });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '工作（0 项待办）' }));
      const input = screen.getByRole('textbox', { name: '新建待办' });
      expect(input).toHaveAttribute('placeholder', '添加到「工作」，回车创建');
      await user.type(input, '写方案{Enter}');

      await waitFor(() => {
        expect(useAppStore.getState().todos[0].listId).toBe('l1');
      });
    });

    it('最近7天视图不提供内联添加（归属不明）', () => {
      renderTodos('/todos?list=next7');
      expect(screen.queryByRole('textbox', { name: '新建待办' })).not.toBeInTheDocument();
    });
  });

  describe('智能清单与分组（D7）', () => {
    it('清单栏角标只统计进行中的顶层任务', () => {
      seedStore({
        lists: [makeList({ id: 'l1', name: '工作' })],
        todos: [
          makeTodo({ id: 'a', title: '今天到期', dueDate: todayKey, listId: 'l1' }),
          makeTodo({ id: 'b', title: '已逾期', dueDate: overdueKey, listId: 'l1' }),
          makeTodo({ id: 'c', title: '无日期' }),
          makeTodo({ id: 'd', title: '今天已完成', dueDate: todayKey, status: 'completed' }),
          makeTodo({ id: 'e', title: '子任务', parentId: 'a' }),
        ],
      });
      renderTodos();

      // 收集箱：c（d 已完成不计）；今天：a（d completed 有成员资格但不计角标，e 子任务不进）
      expect(screen.getByRole('button', { name: '收集箱（1 项待办）' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '今天（1 项待办）' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '最近7天（2 项待办）' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: '工作（2 项待办）' })).toBeInTheDocument();
    });

    it('逾期任务独立红色分组置顶（收集箱内同样生效）', () => {
      seedStore({
        todos: [
          makeTodo({ id: 't-normal', title: '普通任务' }),
          makeTodo({ id: 't-overdue', title: '逾期任务', dueDate: overdueKey }),
          makeTodo({ id: 't-future', title: '未来任务', dueDate: futureKey }),
        ],
      });
      renderTodos();

      const header = screen.getByTestId('overdue-group-header');
      expect(header).toHaveTextContent('已逾期 (1)');
      expect(header).toHaveClass('text-vermilion');

      const overdueRow = screen.getByTestId('todo-t-overdue');
      const normalRow = screen.getByTestId('todo-t-normal');
      expect(
        overdueRow.compareDocumentPosition(normalRow) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      expect(within(overdueRow).getByText(`截止 ${overdueKey}`)).toHaveClass('text-vermilion');
    });
  });

  describe('任务交互', () => {
    it('勾选完成并进入已完成折叠分组（默认收起，D11）', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 't1', title: '写周报' }),
          makeTodo({ id: 't2', title: '买牛奶' }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      const checkbox = screen.getByRole('checkbox', { name: '标记「写周报」为已完成' });
      expect(checkbox).toHaveAttribute('aria-checked', 'false');
      await user.click(checkbox);
      expect(useAppStore.getState().todos.find((t) => t.id === 't1')!.status).toBe('completed');

      const fold = screen.getByRole('button', { name: '已完成 (1)' });
      expect(fold).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('写周报')).not.toBeInTheDocument();

      await user.click(fold);
      expect(screen.getByText('写周报')).toBeInTheDocument();

      // 已完成任务可勾回进行中，分组随之消失
      await user.click(screen.getByRole('checkbox', { name: '标记「写周报」为未完成' }));
      expect(useAppStore.getState().todos.find((t) => t.id === 't1')!.status).toBe('active');
      expect(screen.queryByRole('button', { name: '已完成 (1)' })).not.toBeInTheDocument();
    });

    it('已放弃任务独立折叠分组，可恢复', async () => {
      seedStore({ todos: [makeTodo({ id: 't1', title: '已放弃任务', status: 'abandoned' })] });
      const user = userEvent.setup();
      renderTodos();

      const fold = screen.getByRole('button', { name: '已放弃 (1)' });
      expect(fold).toHaveAttribute('aria-expanded', 'false');
      await user.click(fold);
      await user.click(screen.getByRole('button', { name: '恢复「已放弃任务」' }));
      expect(useAppStore.getState().todos[0].status).toBe('active');
    });

    it('优先级筛选收进列表头部（D20，含无优先级档）', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 't1', title: '高优任务', priority: 'high' }),
          makeTodo({ id: 't2', title: '中优任务', priority: 'medium' }),
          makeTodo({ id: 't3', title: '无优任务', priority: 'none' }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      const select = screen.getByRole('combobox', { name: '按优先级筛选' });
      await user.selectOptions(select, 'high');
      expect(screen.getByText('高优任务')).toBeInTheDocument();
      expect(screen.queryByText('中优任务')).not.toBeInTheDocument();
      expect(screen.queryByText('无优任务')).not.toBeInTheDocument();

      await user.selectOptions(select, 'none');
      expect(screen.getByText('无优任务')).toBeInTheDocument();
      expect(screen.queryByText('高优任务')).not.toBeInTheDocument();

      await user.selectOptions(select, 'all');
      expect(screen.getByText('中优任务')).toBeInTheDocument();
    });

    it('排序控件保留创建/截止/优先三种（D10），无截止日期沉底', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 'a', title: '无日期' }),
          makeTodo({ id: 'b', title: '后天', dueDate: futureKey }),
          makeTodo({ id: 'c', title: '明天', dueDate: tomorrowKey }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      const select = screen.getByRole('combobox', { name: '排序方式' });
      expect(within(select).getAllByRole('option')).toHaveLength(3);
      await user.selectOptions(select, 'dueDate');

      const rowA = screen.getByTestId('todo-a');
      const rowB = screen.getByTestId('todo-b');
      const rowC = screen.getByTestId('todo-c');
      expect(rowC.compareDocumentPosition(rowB) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(rowB.compareDocumentPosition(rowA) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('子任务：计数展开、勾选、hover 删除', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 'p1', title: '父任务' }),
          makeTodo({ id: 's1', title: '子任务甲', parentId: 'p1' }),
          makeTodo({ id: 's2', title: '子任务乙', parentId: 'p1' }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: /子任务 0\/2/ }));
      expect(screen.getByText('子任务甲')).toBeInTheDocument();

      await user.click(screen.getByRole('checkbox', { name: '标记「子任务甲」为已完成' }));
      expect(useAppStore.getState().todos.find((t) => t.id === 's1')!.status).toBe('completed');
      expect(screen.getByRole('button', { name: /子任务 1\/2/ })).toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '删除子任务乙' }));
      const dialog = screen.getByRole('dialog', { name: '删除待办' });
      await user.click(within(dialog).getByRole('button', { name: '删除' }));
      await waitFor(() => {
        expect(useAppStore.getState().todos.find((t) => t.id === 's2')).toBeUndefined();
      });
      // 父任务仍在
      expect(useAppStore.getState().todos.find((t) => t.id === 'p1')).toBeDefined();
    });

    it('删除待办需二次确认并 toast', async () => {
      seedStore({ todos: [makeTodo({ id: 't1', title: '要删除的任务' })] });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '删除要删除的任务' }));
      const dialog = screen.getByRole('dialog', { name: '删除待办' });
      await user.click(within(dialog).getByRole('button', { name: '删除' }));

      await waitFor(() => {
        expect(useAppStore.getState().todos).toHaveLength(0);
      });
      expect(await screen.findByText('待办已删除')).toBeInTheDocument();
    });

    it('删除父任务确认文案说明级联删除子任务（D4）', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 'p1', title: '父任务' }),
          makeTodo({ id: 's1', title: '子任务甲', parentId: 'p1' }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '删除父任务' }));
      const dialog = screen.getByRole('dialog', { name: '删除待办' });
      expect(dialog).toHaveTextContent('1 个子任务将一并删除');
      await user.click(within(dialog).getByRole('button', { name: '删除' }));

      await waitFor(() => {
        expect(useAppStore.getState().todos).toHaveLength(0);
      });
    });
  });

  describe('清单栏（ListRail）', () => {
    it('新建清单：内联输入回车创建（默认墨灰），Esc 取消', async () => {
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '新建清单' }));
      const input = screen.getByRole('textbox', { name: '新清单名称' });
      await user.type(input, '工作{Enter}');

      const lists = useAppStore.getState().lists;
      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('工作');
      expect(lists[0].color).toBe('#8a8a8a');
      expect(await screen.findByText('清单已创建')).toBeInTheDocument();
      expect(screen.queryByRole('textbox', { name: '新清单名称' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '新建清单' }));
      await user.type(screen.getByRole('textbox', { name: '新清单名称' }), '取消的{Escape}');
      expect(useAppStore.getState().lists).toHaveLength(1);
      expect(screen.queryByRole('textbox', { name: '新清单名称' })).not.toBeInTheDocument();
    });

    it('「+」菜单：模板入口为禁用态', async () => {
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '新建清单菜单' }));
      const menu = screen.getByRole('menu', { name: '新建清单选项' });
      expect(within(menu).getByRole('menuitem', { name: '新建清单' })).toBeEnabled();
      const templateItem = within(menu).getByRole('menuitem', { name: /从模板新建/ });
      expect(templateItem).toBeDisabled();
      expect(templateItem).toHaveTextContent('即将上线');
    });

    it('清单改名：行内编辑回车保存', async () => {
      seedStore({ lists: [makeList({ id: 'l1', name: '旧名' })] });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '重命名清单「旧名」' }));
      const input = screen.getByRole('textbox', { name: '清单名称' });
      expect(input).toHaveValue('旧名');
      await user.clear(input);
      await user.type(input, '新名{Enter}');

      expect(useAppStore.getState().lists[0].name).toBe('新名');
      expect(await screen.findByText('清单已重命名')).toBeInTheDocument();
    });

    it('删除清单：确认文案说明任务移入收集箱，任务本身不删（C1）', async () => {
      seedStore({
        lists: [makeList({ id: 'l1', name: '工作' })],
        todos: [makeTodo({ id: 't1', title: '清单内任务', listId: 'l1' })],
      });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '删除清单「工作」' }));
      const dialog = screen.getByRole('dialog', { name: '删除清单' });
      expect(dialog).toHaveTextContent('任务不会删除');
      expect(dialog).toHaveTextContent('移入收集箱');
      await user.click(within(dialog).getByRole('button', { name: '删除' }));

      await waitFor(() => {
        const state = useAppStore.getState();
        expect(state.lists).toHaveLength(0);
        expect(state.todos).toHaveLength(1);
        expect(state.todos[0].listId).toBeUndefined();
      });
      expect(await screen.findByText('清单已删除')).toBeInTheDocument();
    });
  });

  describe('响应式与视图偏好（D8/D19）', () => {
    it('窄屏：清单栏为抽屉，点遮罩关闭', async () => {
      setMediaQuery('(min-width: 1024px)', false);
      seedStore({ lists: [makeList({ id: 'l1', name: '工作' })] });
      const user = userEvent.setup();
      renderTodos();

      expect(screen.queryByRole('complementary', { name: '清单栏' })).not.toBeInTheDocument();

      await user.click(screen.getByRole('button', { name: '打开清单栏' }));
      const drawer = screen.getByRole('dialog', { name: '清单栏' });
      expect(
        within(drawer).getByRole('button', { name: '收集箱（0 项待办）' })
      ).toBeInTheDocument();
      expect(within(drawer).getByRole('button', { name: '工作（0 项待办）' })).toBeInTheDocument();

      await user.click(drawer);
      expect(screen.queryByRole('dialog', { name: '清单栏' })).not.toBeInTheDocument();
    });

    it('宽屏：点击任务标题选中并渲染详情占位（B2-T2 填内容）', async () => {
      seedStore({ todos: [makeTodo({ id: 't1', title: '写周报' })] });
      const user = userEvent.setup();
      renderTodos();

      expect(screen.queryByRole('complementary', { name: '任务详情' })).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '写周报' }));

      const detail = screen.getByRole('complementary', { name: '任务详情' });
      expect(within(detail).getByText('选中任务查看详情')).toBeInTheDocument();
      expect(within(detail).getByText(/写周报/)).toBeInTheDocument();

      // 再次点击取消选中，详情栏收起
      await user.click(screen.getByRole('button', { name: '写周报' }));
      expect(screen.queryByRole('complementary', { name: '任务详情' })).not.toBeInTheDocument();
    });

    it('窄屏：点击任务弹出详情抽屉，可关闭', async () => {
      setMediaQuery('(min-width: 1024px)', false);
      seedStore({ todos: [makeTodo({ id: 't1', title: '写周报' })] });
      const user = userEvent.setup();
      renderTodos();

      await user.click(screen.getByRole('button', { name: '写周报' }));
      const drawer = screen.getByRole('dialog', { name: '任务详情' });
      expect(within(drawer).getByText('选中任务查看详情')).toBeInTheDocument();

      await user.click(within(drawer).getByRole('button', { name: '关闭详情' }));
      expect(screen.queryByRole('dialog', { name: '任务详情' })).not.toBeInTheDocument();
    });

    it('隐藏已完成开关立即生效并持久化到 moji-ui-prefs（D8）', async () => {
      seedStore({
        todos: [
          makeTodo({ id: 't1', title: '已完任务', status: 'completed' }),
          makeTodo({ id: 't2', title: '进行中' }),
        ],
      });
      const user = userEvent.setup();
      renderTodos();

      expect(screen.getByRole('button', { name: '已完成 (1)' })).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: '隐藏已完成分组' }));
      expect(screen.queryByRole('button', { name: '已完成 (1)' })).not.toBeInTheDocument();
      expect(screen.getByText('进行中')).toBeInTheDocument();
      expect(JSON.parse(localStorage.getItem('moji-ui-prefs') ?? '')).toEqual({
        hiddenCompleted: true,
      });

      await user.click(screen.getByRole('button', { name: '显示已完成分组' }));
      expect(screen.getByRole('button', { name: '已完成 (1)' })).toBeInTheDocument();
    });
  });
});
