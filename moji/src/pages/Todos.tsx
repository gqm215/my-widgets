import { useState, useMemo, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { format } from 'date-fns';
import { Plus, Trash2, CheckSquare, Filter, ArrowUpDown, Check } from 'lucide-react';
import { useAppStore } from '@/store';
import {
  Button,
  ConfirmDialog,
  EmptyState,
  Input,
  Modal,
  Textarea,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import type { Priority, Todo } from '@/types';

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

type StatusFilter = 'all' | 'incomplete' | 'completed';
type PriorityFilter = 'all' | Priority;
type SortBy = 'createdAt' | 'dueDate' | 'priority';

const PRIORITY_LABELS: Record<Priority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级',
};

export default function Todos() {
  const todos = useAppStore((state) => state.todos);
  const addTodo = useAppStore((state) => state.addTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const consumedNewRef = useRef(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDesc, setNewTodoDesc] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');
  const [addError, setAddError] = useState<string | null>(null);

  // Filter & Sort state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');

  // Confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<Todo | null>(null);

  const resetAddForm = () => {
    setNewTodoTitle('');
    setNewTodoDesc('');
    setNewTodoPriority('medium');
    setNewTodoDueDate('');
    setAddError(null);
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  // ?new=1：消费一次后清除参数
  useEffect(() => {
    if (searchParams.get('new') !== '1' || consumedNewRef.current) return;
    consumedNewRef.current = true;
    setNewTodoTitle('');
    setNewTodoDesc('');
    setNewTodoPriority('medium');
    setNewTodoDueDate('');
    setAddError(null);
    setShowAddModal(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  const handleAddTodo = () => {
    if (!newTodoTitle.trim()) {
      setAddError('请输入待办标题');
      return;
    }
    addTodo({
      title: newTodoTitle.trim(),
      description: newTodoDesc.trim() || undefined,
      priority: newTodoPriority,
      dueDate: newTodoDueDate || undefined,
    });
    toast('success', '待办已创建');
    setShowAddModal(false);
    resetAddForm();
  };

  const handleDeleteTodo = () => {
    if (!deleteTarget) return;
    deleteTodo(deleteTarget.id);
    toast('success', '待办已删除');
    setDeleteTarget(null);
  };

  const filteredAndSortedTodos = useMemo((): Todo[] => {
    let list = [...todos];

    if (statusFilter === 'completed') {
      list = list.filter((t) => t.completed);
    } else if (statusFilter === 'incomplete') {
      list = list.filter((t) => !t.completed);
    }

    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        case 'priority':
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'createdAt':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [todos, statusFilter, priorityFilter, sortBy]);

  const completedCount = todos.filter((t) => t.completed).length;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100">待办</h2>
          <p className="text-sm text-ink-400 dark:text-ink-300 mt-1">
            共 {todos.length} 项 · 已完成 {completedCount} 项
          </p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span>新建</span>
        </Button>
      </div>

      {/* 筛选与排序 */}
      <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 mb-6 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-ink-400 dark:text-ink-300 mr-1" strokeWidth={1.5} />
            {(Object.entries({
              all: '全部',
              incomplete: '未完成',
              completed: '已完成',
            }) as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setStatusFilter(key)}
                aria-pressed={statusFilter === key}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full transition-colors duration-150',
                  statusFilter === key
                    ? 'bg-ink-700 text-white'
                    : 'bg-paper-dark dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-paper-dark dark:bg-ink-600" />

          <div className="flex items-center gap-1" aria-label="按优先级筛选">
            {(Object.entries({
              all: '全部',
              high: '高',
              medium: '中',
              low: '低',
            }) as [PriorityFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setPriorityFilter(key)}
                aria-pressed={priorityFilter === key}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full transition-colors duration-150',
                  priorityFilter === key
                    ? key === 'high'
                      ? 'bg-vermilion text-white'
                      : key === 'medium'
                        ? 'bg-rattan text-white'
                        : key === 'low'
                          ? 'bg-ink-500 text-white'
                          : 'bg-ink-700 text-white'
                    : 'bg-paper-dark dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-paper-dark dark:bg-ink-600" />

          <div className="flex items-center gap-1" aria-label="排序方式">
            <ArrowUpDown className="w-4 h-4 text-ink-400 dark:text-ink-300 mr-1" strokeWidth={1.5} />
            {(Object.entries({
              createdAt: '创建时间',
              dueDate: '截止日期',
              priority: '优先级',
            }) as [SortBy, string][]).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                aria-pressed={sortBy === key}
                className={cn(
                  'text-xs px-3 py-1.5 rounded-full transition-colors duration-150',
                  sortBy === key
                    ? 'bg-ink-700 text-white'
                    : 'bg-paper-dark dark:bg-ink-700 text-ink-500 dark:text-ink-300 hover:bg-ink-100 dark:hover:bg-ink-600',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {filteredAndSortedTodos.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title={todos.length === 0 ? '暂无待办事项' : '没有匹配的待办'}
            description={
              todos.length === 0
                ? '点击右上角「新建」添加一条待办，开始规划你的一天。'
                : '尝试调整筛选条件查看更多内容。'
            }
            action={
              todos.length === 0 ? (
                <Button variant="primary" size="sm" onClick={openAddModal}>
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>新建待办</span>
                </Button>
              ) : undefined
            }
          />
        ) : (
          filteredAndSortedTodos.map((todo, index) => (
            <div
              key={todo.id}
              data-testid={`todo-${todo.id}`}
              className={cn(
                'todo-item-enter bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-5 md:p-6 hover:shadow-paper-lg dark:hover:shadow-none transition-shadow duration-200',
                todo.completed && 'todo-completed',
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start space-x-4">
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={todo.completed}
                  aria-label={`标记「${todo.title}」为${todo.completed ? '未完成' : '已完成'}`}
                  onClick={() => toggleTodo(todo.id)}
                  className={cn(
                    'w-6 h-6 rounded border-2 mt-0.5 flex-shrink-0 transition-colors duration-200 flex items-center justify-center',
                    todo.completed
                      ? 'bg-success border-success'
                      : todo.priority === 'high'
                        ? 'border-vermilion'
                        : todo.priority === 'medium'
                          ? 'border-rattan'
                          : 'border-ink-300 dark:border-ink-600',
                  )}
                >
                  {todo.completed && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                </button>

                <div className="flex-1 min-w-0">
                  <h3
                    className={cn(
                      'todo-text font-medium transition-all duration-300',
                      todo.completed
                        ? 'text-ink-300 dark:text-ink-600'
                        : 'text-ink-900 dark:text-ink-100',
                    )}
                  >
                    {todo.title}
                  </h3>
                  {todo.description && (
                    <p className="text-ink-400 dark:text-ink-300 text-sm mt-1">{todo.description}</p>
                  )}
                  <div className="flex items-center mt-2 space-x-3 flex-wrap gap-y-1">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        todo.priority === 'high' && 'bg-vermilion/10 text-vermilion',
                        todo.priority === 'medium' && 'bg-rattan/10 text-rattan',
                        todo.priority === 'low' &&
                          'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
                      )}
                    >
                      {PRIORITY_LABELS[todo.priority]}
                    </span>
                    {todo.dueDate && (
                      <span className="text-xs text-ink-400 dark:text-ink-300">
                        截止 {todo.dueDate}
                      </span>
                    )}
                    <span className="text-xs text-ink-300 dark:text-ink-600">
                      {format(new Date(todo.createdAt), 'yyyy-MM-dd')}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setDeleteTarget(todo)}
                  aria-label={`删除${todo.title}`}
                  className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-300 hover:text-vermilion"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 新建待办 Modal */}
      <Modal open={showAddModal} onClose={() => setShowAddModal(false)} title="新建待办">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddTodo();
          }}
        >
          <Input
            label="标题"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            placeholder="待办事项标题"
            autoFocus
          />
          <Textarea
            label="描述"
            value={newTodoDesc}
            onChange={(e) => setNewTodoDesc(e.target.value)}
            placeholder="可选"
            rows={2}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="todo-priority"
                className="block text-sm font-medium text-ink-700 dark:text-ink-200 mb-1.5"
              >
                优先级
              </label>
              <select
                id="todo-priority"
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as Priority)}
                className="w-full px-3.5 py-2 rounded-md border bg-white dark:bg-ink-800 text-ink-900 dark:text-ink-100 border-paper-dark dark:border-ink-600 focus:outline-none focus:ring-2 focus:ring-vermilion/15 focus:border-vermilion/60"
              >
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
            </div>
            <Input
              label="截止日期"
              type="date"
              value={newTodoDueDate}
              onChange={(e) => setNewTodoDueDate(e.target.value)}
            />
          </div>

          {addError && (
            <p role="alert" className="text-sm text-vermilion">
              {addError}
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setShowAddModal(false)}>
              取消
            </Button>
            <Button type="submit" variant="primary">
              创建
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTodo}
        title="删除待办"
        message={deleteTarget ? `确定要删除待办「${deleteTarget.title}」吗？此操作不可撤销。` : ''}
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}
