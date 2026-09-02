import { useAppStore } from '@/store';
import { Plus, Trash2, CheckSquare, Filter, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';
import { ConfirmDialog, EmptyState } from '@/components/ui';
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

export default function Todos() {
  const todos = useAppStore((state) => state.todos);
  const addTodo = useAppStore((state) => state.addTodo);
  const deleteTodo = useAppStore((state) => state.deleteTodo);
  const toggleTodo = useAppStore((state) => state.toggleTodo);

  const [showAddModal, setShowAddModal] = useState(false);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [newTodoDesc, setNewTodoDesc] = useState('');
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>('medium');
  const [newTodoDueDate, setNewTodoDueDate] = useState('');

  // Filter & Sort state
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');

  // Confirm dialog state
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [exitingId, setExitingId] = useState<string | null>(null);

  const handleAddTodo = () => {
    if (newTodoTitle.trim()) {
      addTodo({
        title: newTodoTitle,
        description: newTodoDesc || undefined,
        priority: newTodoPriority,
        dueDate: newTodoDueDate || undefined,
      });
      setShowAddModal(false);
      setNewTodoTitle('');
      setNewTodoDesc('');
      setNewTodoDueDate('');
      setNewTodoPriority('medium');
    }
  };

  const filteredAndSortedTodos = useMemo((): Todo[] => {
    let list = [...todos];

    // Filter by status
    if (statusFilter === 'completed') {
      list = list.filter((t) => t.completed);
    } else if (statusFilter === 'incomplete') {
      list = list.filter((t) => !t.completed);
    }

    // Filter by priority
    if (priorityFilter !== 'all') {
      list = list.filter((t) => t.priority === priorityFilter);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate': {
          // Items without dueDate go to the end
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

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-serif font-semibold text-ink-900 dark:text-ink-100">待办</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 bg-vermilion hover:bg-vermilion-light text-white px-4 py-2 rounded-md transition-colors duration-200"
        >
          <Plus className="w-5 h-5" strokeWidth={1.5} />
          <span>新建</span>
        </button>
      </div>

      {/* Filter & Sort Toolbar */}
      <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-4 mb-6 space-y-3">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-ink-400 dark:text-ink-500 mr-1" strokeWidth={1.5} />
            {(Object.entries({
              all: '全部',
              incomplete: '未完成',
              completed: '已完成',
            }) as [StatusFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
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

          {/* Priority Filter */}
          <div className="flex items-center gap-1">
            {(Object.entries({
              all: '全部',
              high: '高',
              medium: '中',
              low: '低',
            }) as [PriorityFilter, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPriorityFilter(key)}
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

          {/* Sort */}
          <div className="flex items-center gap-1">
            <ArrowUpDown className="w-4 h-4 text-ink-400 dark:text-ink-500 mr-1" strokeWidth={1.5} />
            {(Object.entries({
              createdAt: '创建时间',
              dueDate: '截止日期',
              priority: '优先级',
            }) as [SortBy, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setSortBy(key)}
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

      {/* List */}
      <div className="space-y-4">
        {filteredAndSortedTodos.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-12 h-12 text-ink-200 dark:text-ink-600" strokeWidth={1} />}
            title={todos.length === 0 ? '暂无待办事项' : '没有匹配的待办'}
            description={todos.length === 0 ? '点击右上角「新建」添加一条待办，开始规划你的一天。' : '尝试调整筛选条件查看更多内容。'}
            action={
              todos.length === 0 ? (
                <button
                  onClick={() => setShowAddModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-colors duration-200 text-sm"
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                  <span>新建待办</span>
                </button>
              ) : undefined
            }
          />
        ) : (
          filteredAndSortedTodos.map((todo, index) => (
            <div
              key={todo.id}
              className={cn(
                'todo-item-enter bg-white dark:bg-ink-800 rounded-lg shadow-paper dark:shadow-none p-6 hover:shadow-paper-lg dark:hover:shadow-none transition-shadow duration-200',
                todo.completed && 'todo-completed',
                exitingId === todo.id && 'todo-item-exit',
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start space-x-4">
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-6 h-6 rounded border-2 mt-0.5 flex-shrink-0 transition-colors duration-200 ${
                    todo.completed
                      ? 'bg-success border-success'
                      : todo.priority === 'high'
                        ? 'border-vermilion'
                        : todo.priority === 'medium'
                          ? 'border-rattan'
                          : 'border-ink-300 dark:border-ink-600'
                  }`}
                >
                  {todo.completed && (
                    <CheckSquare className="w-4 h-4 text-white m-auto" strokeWidth={3} />
                  )}
                </button>

                <div className="flex-1">
                  <h3
                    className={`todo-text font-medium transition-all duration-300 ${
                      todo.completed ? 'text-ink-300 dark:text-ink-600' : 'text-ink-900 dark:text-ink-100'
                    }`}
                  >
                    {todo.title}
                  </h3>
                  {todo.description && (
                    <p className="text-ink-400 dark:text-ink-500 text-sm mt-1">{todo.description}</p>
                  )}
                  <div className="flex items-center mt-2 space-x-3">
                    <span
                      className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        todo.priority === 'high' && 'bg-vermilion/10 text-vermilion',
                        todo.priority === 'medium' && 'bg-rattan/10 text-rattan',
                        todo.priority === 'low' && 'bg-ink-100 dark:bg-ink-700 text-ink-500 dark:text-ink-300',
                      )}
                    >
                      {todo.priority === 'high'
                        ? '高优先级'
                        : todo.priority === 'medium'
                          ? '中优先级'
                          : '低优先级'}
                    </span>
                    {todo.dueDate && (
                      <span className="text-xs text-ink-400 dark:text-ink-500">
                        {format(new Date(todo.dueDate), 'yyyy-MM-dd')}
                      </span>
                    )}
                    <span className="text-xs text-ink-300 dark:text-ink-600">
                      {format(new Date(todo.createdAt), 'yyyy-MM-dd')}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setDeleteTarget(todo.id)}
                  className="p-2 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors text-ink-400 dark:text-ink-500 hover:text-vermilion"
                >
                  <Trash2 className="w-4 h-4" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-ink-800 rounded-lg shadow-paper-lg dark:shadow-none p-6 w-full max-w-md animate-modal-in">
            <h3 className="text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 mb-4">新建待办</h3>
            <div className="space-y-4">
              <input
                type="text"
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="标题"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
                autoFocus
              />
              <textarea
                value={newTodoDesc}
                onChange={(e) => setNewTodoDesc(e.target.value)}
                placeholder="描述"
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
                rows={3}
              />
              <select
                value={newTodoPriority}
                onChange={(e) => setNewTodoPriority(e.target.value as Priority)}
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
              >
                <option value="high">高优先级</option>
                <option value="medium">中优先级</option>
                <option value="low">低优先级</option>
              </select>
              <input
                type="date"
                value={newTodoDueDate}
                onChange={(e) => setNewTodoDueDate(e.target.value)}
                className="w-full border border-paper-dark dark:border-ink-600 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-vermilion/50 bg-white dark:bg-ink-700 text-ink-900 dark:text-ink-100"
              />
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-ink-600 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 rounded-md transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleAddTodo}
                  className="px-4 py-2 bg-vermilion hover:bg-vermilion-light text-white rounded-md transition-colors"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) {
            setExitingId(deleteTarget);
            setTimeout(() => {
              deleteTodo(deleteTarget);
              setDeleteTarget(null);
              setExitingId(null);
            }, 200);
          }
        }}
        title="删除待办"
        message="确定要删除这条待办吗？此操作不可撤销。"
        confirmLabel="删除"
        variant="danger"
      />
    </div>
  );
}
