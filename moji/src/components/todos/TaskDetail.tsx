import { useEffect, useRef, useState } from 'react';
import { Ban, Bell, CalendarDays, Check, RotateCcw, Trash2, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { Input, Textarea } from '@/components/ui';
import MarkdownView from '@/components/markdown/MarkdownView';
import EditorToolbar from '@/components/markdown/EditorToolbar';
import { cn } from '@/lib/utils';
import type { Priority, Todo } from '@/types';

export interface TaskDetailProps {
  /** 当前选中任务（页面保证为顶层任务；防御性支持子任务受限展示） */
  todo: Todo;
  /** 该任务的子任务（页面按创建先后排序后传入，D4 仅一层） */
  subtasks: Todo[];
  /** 窄屏抽屉模式提供关闭按钮 */
  onClose?: () => void;
  /** 触发页面级删除确认：父任务文案含级联子任务数，子任务为单删文案（D4） */
  onDelete?: (todo: Todo) => void;
}

const PRIORITY_OPTIONS: readonly [Priority, string][] = [
  ['none', '无'],
  ['low', '低'],
  ['medium', '中'],
  ['high', '高'],
];

/** 优先级选中态配色：高优朱砂 / 中优藤黄 / 低优与无优墨灰（复用现有令牌） */
const PRIORITY_SELECTED_CLS: Record<Priority, string> = {
  high: 'border-vermilion text-vermilion bg-vermilion/5 font-medium',
  medium: 'border-rattan text-rattan bg-rattan/5 font-medium',
  low: 'border-ink-400 dark:border-ink-400 text-ink-700 dark:text-ink-200 bg-paper-dark/50 dark:bg-ink-700/50 font-medium',
  none: 'border-ink-400 dark:border-ink-400 text-ink-700 dark:text-ink-200 bg-paper-dark/50 dark:bg-ink-700/50 font-medium',
};

const ghostActionCls =
  'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-ink-500 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors';

/**
 * 任务详情栏（B2-T2）：标题 inline 编辑（blur/Enter 提交）、截止日期、
 * 提醒占位（B5 接调度）、描述 Markdown 编辑/预览双态（D6）、子任务增删勾（D4）、
 * 优先级 4 档（D20）、放弃/恢复/删除。数据由页面传入，动作走 store。
 */
export function TaskDetail({ todo, subtasks, onClose, onDelete }: TaskDetailProps) {
  const updateTodo = useAppStore((s) => s.updateTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const addSubtask = useAppStore((s) => s.addSubtask);
  const abandonTodo = useAppStore((s) => s.abandonTodo);
  const restoreTodo = useAppStore((s) => s.restoreTodo);

  const isSubtask = Boolean(todo.parentId);
  const completed = todo.status === 'completed';
  const abandoned = todo.status === 'abandoned';

  /* ---------- 标题：常驻 input，blur/Enter 提交（Notes 先例），Esc 还原，空标题不提交 ---------- */
  const [titleDraft, setTitleDraft] = useState(todo.title);
  useEffect(() => {
    setTitleDraft(todo.title);
  }, [todo.id, todo.title]);

  const commitTitle = () => {
    const next = titleDraft.trim();
    if (!next || next === todo.title) {
      setTitleDraft(todo.title);
      return;
    }
    updateTodo(todo.id, { title: next });
  };

  /* ---------- 截止日期：原生 date input，清空 → 移除字段 ---------- */
  const handleDueDateChange = (value: string) => {
    updateTodo(todo.id, { dueDate: value || undefined });
  };

  /* ---------- 描述（D6）：编辑/预览显式双按钮；原文进 description；blur 提交 ---------- */
  const [descMode, setDescMode] = useState<'edit' | 'preview'>(() =>
    todo.description ? 'preview' : 'edit'
  );
  const [descDraft, setDescDraft] = useState(todo.description ?? '');
  /** 描述 textarea：编辑态工具条向其插语法（B3-T2） */
  const descRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    setDescMode(todo.description ? 'preview' : 'edit');
    setDescDraft(todo.description ?? '');
  }, [todo.id, todo.description]);

  const commitDescription = () => {
    if (descDraft === (todo.description ?? '')) return;
    // 空白内容视为无描述（移除字段）；其余保留 Markdown 原文（含首尾空白语义）
    updateTodo(todo.id, { description: descDraft.trim() ? descDraft : undefined });
  };

  /* ---------- 子任务（D4）：勾选 / 内联添加（回车连续）/ 删除走页面确认 ---------- */
  const [subtaskDraft, setSubtaskDraft] = useState('');
  const handleAddSubtask = () => {
    const title = subtaskDraft.trim();
    if (!title) return;
    addSubtask(todo.id, title);
    setSubtaskDraft('');
  };

  const sectionLabelCls = 'text-xs font-medium text-ink-400 dark:text-ink-300 mb-1.5';

  return (
    <div className="h-full flex flex-col">
      {/* 头部（B2-T1 结构沿用） */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-paper-dark/60 dark:border-ink-700/60">
        <span className="text-sm font-serif font-medium text-ink-700 dark:text-ink-200">
          任务详情
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
            className="p-1.5 rounded-md text-ink-400 dark:text-ink-300 hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* 标题：常驻 input（blur/Enter 提交，Esc 还原） */}
        <input
          type="text"
          aria-label="任务标题"
          value={titleDraft}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            } else if (e.key === 'Escape') {
              setTitleDraft(todo.title);
            }
          }}
          placeholder="任务标题"
          className="w-full bg-transparent border-none focus:outline-none px-0 text-lg font-serif font-semibold text-ink-900 dark:text-ink-100 placeholder-ink-300 dark:placeholder-ink-600"
        />

        {/* 日期 + 提醒占位（B5 接提醒调度） */}
        <div className="space-y-2">
          <label
            className={cn(
              'relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs cursor-pointer transition-colors',
              todo.dueDate
                ? 'border-paper-dark dark:border-ink-600 text-ink-700 dark:text-ink-200 hover:border-ink-300 dark:hover:border-ink-500'
                : 'border-dashed border-paper-dark dark:border-ink-600 text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-200'
            )}
          >
            <CalendarDays className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>{todo.dueDate ? `截止 ${todo.dueDate}` : '设置截止日期'}</span>
            <input
              type="date"
              aria-label="截止日期"
              value={todo.dueDate ?? ''}
              onChange={(e) => handleDueDateChange(e.target.value)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </label>
          <div
            aria-label="提醒"
            aria-disabled="true"
            title="提醒调度将在 B5 接入"
            className="flex items-center gap-2 px-2.5 py-2 rounded-md border border-dashed border-paper-dark dark:border-ink-600 text-ink-300 dark:text-ink-500 cursor-not-allowed select-none"
          >
            <Bell className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={1.5} />
            <span className="text-xs">提醒：未设置</span>
            <span className="ml-auto text-[10px] whitespace-nowrap">提醒调度将在 B5 接入</span>
          </div>
        </div>

        {/* 优先级 4 档（D20） */}
        <div>
          <p className={sectionLabelCls}>优先级</p>
          <div
            role="radiogroup"
            aria-label="优先级"
            className="grid grid-cols-4 gap-1"
          >
            {PRIORITY_OPTIONS.map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={todo.priority === value}
                onClick={() => updateTodo(todo.id, { priority: value })}
                className={cn(
                  'px-1 py-1.5 rounded-md text-xs border transition-colors',
                  todo.priority === value
                    ? PRIORITY_SELECTED_CLS[value]
                    : 'border-paper-dark dark:border-ink-600 text-ink-500 dark:text-ink-300 hover:border-ink-300 dark:hover:border-ink-500'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* 描述（D6）：编辑（Textarea）/ 预览（共享 MarkdownView）显式切换 */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-medium text-ink-400 dark:text-ink-300">描述</p>
            <div
              role="group"
              aria-label="描述模式"
              className="flex rounded-md border border-paper-dark dark:border-ink-600 overflow-hidden"
            >
              <button
                type="button"
                aria-pressed={descMode === 'edit'}
                onClick={() => setDescMode('edit')}
                className={cn(
                  'px-2.5 py-1 text-xs transition-colors',
                  descMode === 'edit'
                    ? 'bg-ink-700 text-white font-medium'
                    : 'text-ink-500 dark:text-ink-300 hover:bg-paper-dark/60 dark:hover:bg-ink-700/60'
                )}
              >
                编辑
              </button>
              <button
                type="button"
                aria-pressed={descMode === 'preview'}
                onClick={() => setDescMode('preview')}
                className={cn(
                  'px-2.5 py-1 text-xs transition-colors',
                  descMode === 'preview'
                    ? 'bg-ink-700 text-white font-medium'
                    : 'text-ink-500 dark:text-ink-300 hover:bg-paper-dark/60 dark:hover:bg-ink-700/60'
                )}
              >
                预览
              </button>
            </div>
          </div>
          {descMode === 'edit' ? (
            <>
              {/* B3-T2：描述编辑态工具条（与笔记页同一组件），onChange 走既有 blur/防抖链 */}
              <EditorToolbar
                textareaRef={descRef}
                onChangeText={setDescDraft}
                label="描述编辑工具条"
              />
              <Textarea
                ref={descRef}
                aria-label="任务描述"
                value={descDraft}
                onChange={(e) => setDescDraft(e.target.value)}
                onBlur={commitDescription}
                placeholder="添加描述，支持 Markdown 语法…"
                className="min-h-24 text-sm"
              />
            </>
          ) : (
            <div
              aria-label="描述预览"
              className="markdown-body min-h-24 px-1 py-0.5 text-sm"
            >
              {/* B3-T1a：共享 MarkdownView（detail 紧凑排版档位），公式语法 $行内$ / $$块级$$ */}
              <MarkdownView variant="detail">{descDraft || '*暂无描述*'}</MarkdownView>
            </div>
          )}
        </div>

        {/* 子任务（D4：仅一层；子任务详情不再提供添加入口） */}
        <div>
          <p className={sectionLabelCls}>
            子任务{subtasks.length > 0 ? `（${subtasks.length}）` : ''}
          </p>
          {subtasks.length > 0 && (
            <ul className="space-y-1 mb-2">
              {subtasks.map((st) => {
                const stCompleted = st.status === 'completed';
                return (
                  <li
                    key={st.id}
                    data-testid={`detail-subtask-${st.id}`}
                    className="group/sub flex items-center gap-2"
                  >
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={stCompleted}
                      aria-label={`标记「${st.title}」为${stCompleted ? '未完成' : '已完成'}`}
                      onClick={() => toggleTodo(st.id)}
                      className={cn(
                        'w-[18px] h-[18px] rounded border-2 flex-shrink-0 transition-colors duration-200 flex items-center justify-center',
                        stCompleted ? 'bg-success border-success' : 'border-ink-300 dark:border-ink-600'
                      )}
                    >
                      {stCompleted && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                    </button>
                    <span
                      className={cn(
                        'flex-1 min-w-0 truncate text-sm',
                        stCompleted ? 'text-ink-300 dark:text-ink-600' : 'text-ink-700 dark:text-ink-200'
                      )}
                    >
                      {st.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDelete?.(st)}
                      aria-label={`删除${st.title}`}
                      className="p-1 rounded text-ink-300 dark:text-ink-500 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors opacity-0 group-hover/sub:opacity-100 focus-visible:opacity-100"
                    >
                      <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!isSubtask && (
            <Input
              aria-label="添加子任务"
              placeholder="添加子任务，回车创建"
              value={subtaskDraft}
              onChange={(e) => setSubtaskDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                handleAddSubtask();
              }}
              className="py-1.5 text-sm"
            />
          )}
        </div>
      </div>

      {/* 底部状态操作：放弃/恢复仅顶层任务（store 对子任务 no-op）；删除走页面级确认 */}
      <div className="px-4 py-3 border-t border-paper-dark/60 dark:border-ink-700/60 flex items-center gap-1">
        {!isSubtask && !completed && !abandoned && (
          <button
            type="button"
            onClick={() => abandonTodo(todo.id)}
            aria-label={`放弃「${todo.title}」`}
            className={ghostActionCls}
          >
            <Ban className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>放弃</span>
          </button>
        )}
        {!isSubtask && abandoned && (
          <button
            type="button"
            onClick={() => restoreTodo(todo.id)}
            aria-label={`恢复「${todo.title}」`}
            className={cn(ghostActionCls, 'text-success hover:text-success')}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>恢复</span>
          </button>
        )}
        {completed && (
          <button
            type="button"
            onClick={() => toggleTodo(todo.id)}
            aria-label={`标记「${todo.title}」为进行中`}
            className={ghostActionCls}
          >
            <RotateCcw className="w-3.5 h-3.5" strokeWidth={1.5} />
            <span>标记为进行中</span>
          </button>
        )}
        <div className="flex-1" />
        {onDelete && (
          <button
            type="button"
            onClick={() => onDelete(todo)}
            aria-label={`删除${todo.title}`}
            className="p-2 rounded-md text-ink-400 dark:text-ink-300 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
