import { useEffect, useRef, useState } from 'react';
import {
  Bold,
  Highlighter,
  Italic,
  List,
  ListTodo,
  Palette,
  Sigma,
  SquareSigma,
} from 'lucide-react';
import { applyInsert, type ToolbarAction } from './insertSyntax';
import { PALETTE_COLORS, type PaletteKey } from '@/design/palette';
import { cn } from '@/lib/utils';

export interface EditorToolbarProps {
  /** 目标 textarea（受控组件）：工具条只负责向其插语法，不感知保存链 */
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  /** 文本变更回调：调用方接既有防抖保存链，预览（B3-T1b 渲染链）自动反映 */
  onChangeText: (text: string) => void;
  /** 无障碍组标签（Notes / TaskDetail 各自命名） */
  label: string;
}

/** 色板 swatch 选中态描边（与 ListRail 改色面板同款） */
const SWATCH_RING =
  'ring-2 ring-offset-1 ring-ink-400 dark:ring-ink-300 ring-offset-white dark:ring-offset-ink-800';

const BUTTON_CLS =
  'p-1.5 rounded-md text-ink-500 dark:text-ink-300 hover:bg-white dark:hover:bg-ink-600 hover:text-ink-700 dark:hover:text-ink-100 transition-colors';

/** 常规按钮：图标 + aria-label + title 提示语法（颜色单独渲染，见下） */
const BUTTONS: ReadonlyArray<{
  action: ToolbarAction;
  Icon: typeof Bold;
  label: string;
  title: string;
}> = [
  { action: 'bold', Icon: Bold, label: '加粗', title: '加粗 **文字**（Ctrl+B）' },
  { action: 'italic', Icon: Italic, label: '斜体', title: '斜体 __文字__' },
  { action: 'highlight', Icon: Highlighter, label: '高亮', title: '高亮 ==文字==（Ctrl+Shift+H）' },
  { action: 'list', Icon: List, label: '无序列表', title: '无序列表 - ' },
  { action: 'task', Icon: ListTodo, label: '待办列表', title: '待办列表 - [ ] ' },
  { action: 'inlineMath', Icon: Sigma, label: '行内公式', title: '行内公式 $文字$' },
  { action: 'blockMath', Icon: SquareSigma, label: '块级公式', title: '块级公式 $$ 换行 $$' },
];

/**
 * 编辑器工具条（B3-T2）：向 textarea 插 Markdown 语法（选中包裹 / 光标插入对）。
 * 渲染链零改动——插入即走调用方既有防抖保存链，预览自动反映。
 * 快捷键：Ctrl+B 加粗、Ctrl+Shift+H 高亮（挂载在目标 textarea 上，仅编辑态生效）。
 * 选中浮现（gaps D6）：textarea 有选中文本时工具条高亮；无选中保持可用——
 * 「无选中插入语法对、光标放中间」是主流程，禁用态会废掉该场景。
 */
export default function EditorToolbar({ textareaRef, onChangeText, label }: EditorToolbarProps) {
  const [colorOpen, setColorOpen] = useState(false);
  const [lastColorKey, setLastColorKey] = useState<PaletteKey | null>(null);
  const [hasSelection, setHasSelection] = useState(false);
  const colorPanelRef = useRef<HTMLDivElement>(null);
  /** 插入后的待恢复选区：onChange 触发受控重渲后应用（保证光标/选区落点稳定） */
  const pendingSelection = useRef<[number, number] | null>(null);

  const handleAction = (action: ToolbarAction) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const result = applyInsert(action, ta.value, ta.selectionStart, ta.selectionEnd);
    if (result.text === ta.value) return; // 幂等（如行已有前缀）：不触发保存链
    pendingSelection.current = [result.selStart, result.selEnd];
    onChangeText(result.text);
  };

  /* 插入后的选区恢复：刻意每次提交后运行（onChange → 受控重渲 → 应用待恢复选区），
     不依赖 textareaRef 变化，故豁免 exhaustive-deps */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingSelection.current) return;
    const [start, end] = pendingSelection.current;
    pendingSelection.current = null;
    const ta = textareaRef.current;
    if (!ta) return; // 防御性兜底：插入后 textarea 已卸载则放弃恢复
    ta.focus();
    ta.setSelectionRange(start, end);
    setHasSelection(start !== end);
  });

  /* 选区浮现（视觉态）+ 快捷键：直接挂载在目标 textarea 上，父组件零接线 */
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return undefined;
    const updateSelection = () => setHasSelection(ta.selectionStart !== ta.selectionEnd);
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        handleAction('bold');
      } else if (e.shiftKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        handleAction('highlight');
      }
    };
    ta.addEventListener('select', updateSelection);
    ta.addEventListener('keyup', updateSelection);
    ta.addEventListener('mouseup', updateSelection);
    ta.addEventListener('keydown', handleKeyDown);
    return () => {
      ta.removeEventListener('select', updateSelection);
      ta.removeEventListener('keyup', updateSelection);
      ta.removeEventListener('mouseup', updateSelection);
      ta.removeEventListener('keydown', handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- handleAction 依赖 ref 与回调，回调由调用方保证稳定
  }, [textareaRef]);

  /* 颜色面板：Esc / 外点关闭（触发按钮自身不视为外点，保留 toggle 语义；ListRail 模式） */
  useEffect(() => {
    if (!colorOpen) return undefined;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        colorPanelRef.current &&
        !colorPanelRef.current.contains(target) &&
        !(target instanceof Element && target.closest('[data-color-trigger]'))
      ) {
        setColorOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setColorOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [colorOpen]);

  return (
    <div
      role="toolbar"
      aria-label={label}
      data-has-selection={hasSelection ? 'on' : 'off'}
      onMouseDown={(e) => e.preventDefault()}
      className={cn(
        'relative flex items-center gap-0.5 flex-wrap rounded-md px-1 py-0.5 mb-1.5 transition-colors',
        hasSelection ? 'bg-paper-dark/70 dark:bg-ink-700/70' : 'bg-transparent',
      )}
    >
      {BUTTONS.map(({ action, Icon, label: btnLabel, title }) => (
        <button
          key={action}
          type="button"
          aria-label={btnLabel}
          title={title}
          className={BUTTON_CLS}
          onClick={() => handleAction(action)}
        >
          <Icon className="w-4 h-4" strokeWidth={1.5} />
        </button>
      ))}

      <button
        type="button"
        data-color-trigger
        aria-label="文字颜色"
        title="六色高亮（B3-T1b 渲染）"
        aria-expanded={colorOpen}
        className={cn(BUTTON_CLS, colorOpen && 'bg-white dark:bg-ink-600 text-ink-700 dark:text-ink-100')}
        onClick={() => setColorOpen((open) => !open)}
      >
        <Palette className="w-4 h-4" strokeWidth={1.5} />
      </button>

      {colorOpen && (
        <div
          ref={colorPanelRef}
          role="group"
          aria-label="高亮颜色"
          className="absolute left-1 top-full mt-1 z-10 flex items-center gap-1.5 rounded-lg bg-white dark:bg-ink-800 shadow-paper-lg dark:shadow-none border border-black/[0.04] dark:border-white/[0.06] px-2 py-1.5 animate-scale-in"
        >
          {PALETTE_COLORS.map((color) => (
            <button
              key={color.key}
              type="button"
              title={color.name}
              aria-label={`插入${color.name}高亮`}
              aria-pressed={lastColorKey === color.key}
              onClick={() => {
                setLastColorKey(color.key);
                handleAction(`color:${color.key}`);
              }}
              className={cn(
                'w-4 h-4 rounded-full flex-shrink-0 transition-shadow hover:scale-110',
                lastColorKey === color.key && SWATCH_RING,
              )}
              style={{ backgroundColor: color.hex }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
