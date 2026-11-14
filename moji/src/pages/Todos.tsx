import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, PanelLeft } from 'lucide-react';
import { useAppStore } from '@/store';
import { ConfirmDialog, useToast } from '@/components/ui';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useUIPrefs } from '@/hooks/useUIPrefs';
import {
  filterByList,
  filterInbox,
  filterNext7Days,
  filterToday,
} from '@/utils/todoFilters';
import { toDayKey } from '@/utils/date';
import { ListRail } from '@/components/todos/ListRail';
import { TaskDetail } from '@/components/todos/TaskDetail';
import { TaskList, type PriorityFilter, type SortBy } from '@/components/todos/TaskList';
import {
  isSmartViewKey,
  resolveSelectedTaskId,
  resolveViewKeyFromParam,
  resolveViewParam,
} from '@/components/todos/viewKeys';
import type { Todo } from '@/types';

const PRIORITY_FILTER_OPTIONS: [PriorityFilter, string][] = [
  ['all', '全部优先级'],
  ['high', '高优先级'],
  ['medium', '中优先级'],
  ['low', '低优先级'],
  ['none', '无优先级'],
];

const SORT_OPTIONS: [SortBy, string][] = [
  ['createdAt', '按创建时间排序'],
  ['dueDate', '按截止日期排序'],
  ['priority', '按优先级排序'],
];

const selectCls =
  'px-2.5 py-1.5 rounded-md border bg-white dark:bg-ink-800 text-sm text-ink-700 dark:text-ink-200 border-paper-dark dark:border-ink-600 focus:outline-none focus:ring-2 focus:ring-vermilion/15 focus:border-vermilion/60';

/** 视图成员资格（供 viewTodos 与「切换视图是否保留选中」判定共用） */
function todosInView(key: string, list: Todo[], today: string): Todo[] {
  if (key === 'inbox') return filterInbox(list);
  if (key === 'today') return filterToday(list, today);
  if (key === 'next7') return filterNext7Days(list, today);
  return filterByList(list, key);
}

/**
 * 待办页三栏重构（B2-T1 骨架 + B2-T2 详情与 ?task= 同步）：
 * - 宽屏（≥1024px，D19）：清单栏（w-56）+ 列表区（flex-1）+ 详情栏（w-80，选中时渲染）
 * - 窄屏：清单栏 / 详情栏为 overlay 抽屉（点遮罩关闭），默认收起
 * - 路由同步 ?list= 与 ?task=（D9）：task 选中态以 URL 为事实源——
 *   点行写参/再点清参、详情关闭清参、任务删除或指向子任务时 replace 清参、
 *   切换视图时选中任务不属于新视图则清参
 * - 视图偏好 moji-ui-prefs（D8）
 * - 旧状态筛选条移除（D11 折叠分组替代），旧新建弹窗移除（内联添加替代，D20 保留优先级筛选）
 */
export default function Todos() {
  const todos = useAppStore((s) => s.todos);
  const lists = useAppStore((s) => s.lists);
  const addTodo = useAppStore((s) => s.addTodo);
  const deleteTodo = useAppStore((s) => s.deleteTodo);
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const isLg = useMediaQuery('(min-width: 1024px)');
  const { prefs, updatePrefs } = useUIPrefs();

  const listIds = useMemo(() => lists.map((l) => l.id), [lists]);
  const [viewKey, setViewKey] = useState<string>(() =>
    resolveViewKeyFromParam(searchParams.get('list'), listIds)
  );
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);
  const [railDrawerOpen, setRailDrawerOpen] = useState(false);
  const consumedNewRef = useRef(false);
  const addInputRef = useRef<HTMLInputElement>(null);

  const today = toDayKey(new Date());
  const isListView = !isSmartViewKey(viewKey);
  const activeList = isListView ? lists.find((l) => l.id === viewKey) : undefined;

  const viewTodos = useMemo(
    () => todosInView(viewKey, todos, today),
    [viewKey, todos, today]
  );

  const filteredTodos = useMemo(
    () =>
      priorityFilter === 'all'
        ? viewTodos
        : viewTodos.filter((t) => t.priority === priorityFilter),
    [viewTodos, priorityFilter]
  );

  const activeCount = filteredTodos.filter((t) => t.status === 'active').length;

  const viewTitle =
    viewKey === 'inbox'
      ? '收集箱'
      : viewKey === 'today'
        ? '今天'
        : viewKey === 'next7'
          ? '最近7天'
          : (activeList?.name ?? '清单');

  // ---------- 路由同步（D9）：?list= 双向 + 消费 ?new=1 ----------
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;
    if (params.get('new') === '1' && !consumedNewRef.current) {
      consumedNewRef.current = true;
      params.delete('new');
      changed = true;
      // 全局新建入口（QuickCreate）落点：聚焦内联添加框；今天/最近7天视图无输入框，聚焦为 no-op
      addInputRef.current?.focus();
    }
    const expected = resolveViewParam(viewKey, listIds);
    if (params.get('list') !== expected) {
      params.set('list', expected);
      changed = true;
    }
    if (changed) setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams, viewKey, listIds]);

  // 当前清单被删除时回落收集箱
  useEffect(() => {
    if (!isSmartViewKey(viewKey) && !listIds.includes(viewKey)) {
      setViewKey('inbox');
    }
  }, [listIds, viewKey]);

  // ---------- 选中态（D9）：?task= 为事实源，state 不再保存 ----------
  // 可选中 = 存在的顶层任务；缺失/已删除/子任务 → 无选中（resolveSelectedTaskId 裁决）
  const taskParam = searchParams.get('task');
  const selectedTaskId = useMemo(
    () => resolveSelectedTaskId(taskParam, todos),
    [taskParam, todos]
  );
  const selectedTask = useMemo(
    () => (selectedTaskId ? (todos.find((t) => t.id === selectedTaskId) ?? null) : null),
    [todos, selectedTaskId]
  );
  // 详情子任务列表（D4 仅一层；按创建先后展示）
  const selectedSubtasks = useMemo(() => {
    if (!selectedTaskId) return [];
    return todos
      .filter((t) => t.parentId === selectedTaskId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }, [todos, selectedTaskId]);

  // ?task= 指向不存在/不可选中的任务（已删除、子任务、空白）→ replace 清参；
  // ?list= 同步 effect 会在后续渲染补写 list 参数，最终 URL 自洽
  useEffect(() => {
    if (taskParam === null || selectedTaskId !== null) return;
    const params = new URLSearchParams(searchParams);
    params.delete('task');
    setSearchParams(params, { replace: true });
  }, [taskParam, selectedTaskId, searchParams, setSearchParams]);

  // 切到宽屏时收起窄屏抽屉
  useEffect(() => {
    if (isLg) setRailDrawerOpen(false);
  }, [isLg]);

  /** 清除选中：删掉 ?task= 参数（选中态随参数消失） */
  const clearSelectedTask = () => {
    const params = new URLSearchParams(searchParams);
    if (!params.has('task')) return;
    params.delete('task');
    setSearchParams(params, { replace: true });
  };

  const handleSelectView = (key: string) => {
    setViewKey(key);
    setRailDrawerOpen(false);
  };

  // 切换视图（D9）：选中任务不属于新视图 → 清选中与参数；属于则保留（还原现场）。
  // 裁决放 effect 而非点击 handler：?list= 同步 effect 与本清理都从最新 searchParams
  // 派生写参，避免 handler 里的旧闭包副本把刚删的 task 参数又带回来
  const prevViewKeyRef = useRef(viewKey);
  useEffect(() => {
    if (prevViewKeyRef.current === viewKey) return;
    prevViewKeyRef.current = viewKey;
    if (selectedTaskId && !viewTodos.some((t) => t.id === selectedTaskId)) {
      const params = new URLSearchParams(searchParams);
      params.delete('task');
      setSearchParams(params, { replace: true });
    }
  });

  // 点行选中 / 再点取消：写/清 ?task= 参数
  const handleSelectTask = (id: string) => {
    const params = new URLSearchParams(searchParams);
    if (params.get('task') === id) {
      params.delete('task');
    } else {
      params.set('task', id);
    }
    setSearchParams(params, { replace: true });
  };

  const handleCreateTodo = (title: string) => {
    addTodo({ title, listId: isListView ? viewKey : undefined });
    toast('success', '待办已创建');
  };

  const handleDeleteTodo = () => {
    if (!deleteTarget) return;
    deleteTodo(deleteTarget.id);
    toast('success', '待办已删除');
    setDeleteTarget(null);
  };

  const deleteTargetChildCount = deleteTarget
    ? todos.filter((t) => t.parentId === deleteTarget.id).length
    : 0;

  // D7：今天/最近7天视图归属不明，不提供内联添加
  const inlineAdd = useMemo(() => {
    if (viewKey === 'today' || viewKey === 'next7') return null;
    return {
      inputRef: addInputRef,
      placeholder:
        isListView && activeList
          ? `添加到「${activeList.name}」，回车创建`
          : '添加待办，回车创建',
    };
  }, [viewKey, isListView, activeList]);

  const emptyHint =
    viewKey === 'inbox'
      ? '在上方输入框输入标题，回车创建第一条待办。'
      : viewKey === 'today'
        ? '为待办设置今天的截止日期，它会出现在这里。'
        : viewKey === 'next7'
          ? '未来 7 天内到期或已逾期的待办会集中在这里。'
          : '在上方输入框输入标题，回车创建清单的第一条待办。';

  const railProps = {
    todos,
    lists,
    activeKey: viewKey,
    today,
    onSelect: handleSelectView,
  };

  return (
    <div className="flex h-full min-h-0">
      {/* 宽屏：清单栏常驻 */}
      {isLg && (
        <aside
          aria-label="清单栏"
          className="w-56 shrink-0 h-full overflow-y-auto px-3 py-5 border-r border-paper-dark/60 dark:border-ink-700/60"
        >
          <ListRail {...railProps} />
        </aside>
      )}

      {/* 列表区（未选中详情时居中留白） */}
      <section className="flex-1 min-w-0 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 md:px-8 py-6">
          {/* 头部：视图标题 + 计数 + 优先级筛选 / 排序（D20）+ 已完成开关（D8） */}
          <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
            <div className="flex items-center gap-2">
              {!isLg && (
                <button
                  type="button"
                  onClick={() => setRailDrawerOpen(true)}
                  aria-label="打开清单栏"
                  className="p-2 -ml-2 rounded-md text-ink-500 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
                >
                  <PanelLeft className="w-5 h-5" strokeWidth={1.5} />
                </button>
              )}
              <div>
                <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100">
                  {viewTitle}
                </h2>
                <p className="text-sm text-ink-400 dark:text-ink-300 mt-0.5">
                  {activeCount} 项待办
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <select
                aria-label="按优先级筛选"
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value as PriorityFilter)}
                className={selectCls}
              >
                {PRIORITY_FILTER_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                aria-label="排序方式"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className={selectCls}
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => updatePrefs({ hiddenCompleted: !prefs.hiddenCompleted })}
                aria-pressed={prefs.hiddenCompleted}
                aria-label={prefs.hiddenCompleted ? '显示已完成分组' : '隐藏已完成分组'}
                className="p-2 rounded-md text-ink-400 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
              >
                {prefs.hiddenCompleted ? (
                  <Eye className="w-4 h-4" strokeWidth={1.5} />
                ) : (
                  <EyeOff className="w-4 h-4" strokeWidth={1.5} />
                )}
              </button>
            </div>
          </div>

          <TaskList
            todos={filteredTodos}
            allTodos={todos}
            totalInView={viewTodos.length}
            today={today}
            sortBy={sortBy}
            hiddenCompleted={prefs.hiddenCompleted}
            emptyHint={emptyHint}
            inlineAdd={inlineAdd}
            onCreateTodo={handleCreateTodo}
            selectedTaskId={selectedTaskId}
            onSelectTask={handleSelectTask}
            onDeleteTask={setDeleteTarget}
          />
        </div>
      </section>

      {/* 宽屏：详情栏仅在选中任务时渲染（B2-T2 完整详情） */}
      {isLg && selectedTask && (
        <aside
          aria-label="任务详情"
          className="w-80 shrink-0 h-full overflow-hidden border-l border-paper-dark/60 dark:border-ink-700/60"
        >
          <TaskDetail
            todo={selectedTask}
            subtasks={selectedSubtasks}
            onDelete={setDeleteTarget}
          />
        </aside>
      )}

      {/* 窄屏：清单栏抽屉 + 遮罩 */}
      {!isLg && railDrawerOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="清单栏"
          className="fixed inset-0 z-40 flex bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={() => setRailDrawerOpen(false)}
        >
          <div
            className="h-full w-64 bg-white dark:bg-ink-800 shadow-paper-xl dark:shadow-none animate-drawer-in-left overflow-y-auto px-3 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <ListRail {...railProps} onClose={() => setRailDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* 窄屏：详情抽屉 + 遮罩（关闭 = 清 ?task= 参数） */}
      {!isLg && selectedTask && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="任务详情"
          className="fixed inset-0 z-40 flex justify-end bg-ink-900/40 dark:bg-black/60 backdrop-blur-sm animate-fade-in"
          onClick={clearSelectedTask}
        >
          <div
            className="h-full w-80 max-w-full bg-white dark:bg-ink-800 shadow-paper-xl dark:shadow-none animate-drawer-in-right overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <TaskDetail
              todo={selectedTask}
              subtasks={selectedSubtasks}
              onClose={clearSelectedTask}
              onDelete={setDeleteTarget}
            />
          </div>
        </div>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTodo}
        title="删除待办"
        message={
          deleteTarget
            ? deleteTargetChildCount > 0
              ? `确定要删除待办「${deleteTarget.title}」吗？其下 ${deleteTargetChildCount} 个子任务将一并删除，此操作不可撤销。`
              : `确定要删除待办「${deleteTarget.title}」吗？此操作不可撤销。`
            : ''
        }
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}
