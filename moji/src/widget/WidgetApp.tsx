import { useMemo } from 'react';
import { Check, X } from 'lucide-react';
import { useAppStore } from '@/store';
import { toDayKey } from '@/utils/date';
import { cn } from '@/lib/utils';
import type { CSSProperties } from 'react';
import type { MojiBridge } from '@/platform/bridge';

interface WidgetAppProps {
  /** 桌面壳桥；Web 预览时为 null（此时隐藏「关闭」按钮） */
  bridge: MojiBridge | null;
}

/** Electron / Tauri 下的窗口拖拽区样式；Tauri 还需 data-tauri-drag-region 属性 */
const DRAG_REGION = { WebkitAppRegion: 'drag' } as CSSProperties;
const NO_DRAG_REGION = { WebkitAppRegion: 'no-drag' } as CSSProperties;

/**
 * 桌面小组件视图：无边框透明窗口，只显示「今日待办」。
 *
 * 数据与主窗口共用同一个 store；桌面壳会把任一侧的写入广播到另一侧，
 * 所以勾选 / 取消勾选在两个窗口间实时同步。
 */
export function WidgetApp({ bridge }: WidgetAppProps) {
  const todos = useAppStore((s) => s.todos);
  const toggleTodo = useAppStore((s) => s.toggleTodo);

  const today = toDayKey(new Date());
  const todayLabel = useMemo(
    () =>
      new Date().toLocaleDateString('zh-CN', {
        month: 'long',
        day: 'numeric',
        weekday: 'short',
      }),
    [],
  );

  const todayTodos = useMemo(
    () => todos.filter((todo) => !todo.completed && todo.dueDate === today),
    [todos, today],
  );

  const totalPending = useMemo(() => todos.filter((todo) => !todo.completed).length, [todos]);

  return (
    <div
      className="h-screen w-screen p-2 bg-transparent"
      data-testid="moji-widget"
    >
      <div className="flex h-full w-full flex-col overflow-hidden rounded-2xl border border-black/[0.06] bg-paper/95 shadow-paper-xl backdrop-blur-md dark:border-white/[0.08] dark:bg-ink-900/95 dark:shadow-none">
        {/* 拖拽区 + 标题 */}
        <header
          className="flex items-center justify-between px-3 py-2 border-b border-black/[0.05] dark:border-white/[0.06] select-none"
          style={DRAG_REGION}
          data-tauri-drag-region
        >
          <div className="min-w-0">
            <p className="text-sm font-serif font-semibold text-ink-700 dark:text-ink-100 truncate">
              墨集 · 今日
            </p>
            <p className="text-[11px] text-ink-400 leading-tight">{todayLabel}</p>
          </div>
          {bridge && (
            <button
              type="button"
              onClick={() => bridge.closeWindow()}
              aria-label="关闭小组件"
              style={NO_DRAG_REGION}
              className="p-1 rounded-md text-ink-300 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors"
            >
              <X className="w-4 h-4" strokeWidth={1.5} />
            </button>
          )}
        </header>

        {/* 今日待办 */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {todayTodos.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-1 text-center">
              <p className="text-2xl">🍃</p>
              <p className="text-xs text-ink-400">今天没有到期待办</p>
            </div>
          ) : (
            <ul className="space-y-1">
              {todayTodos.map((todo) => (
                <li key={todo.id}>
                  <button
                    type="button"
                    onClick={() => toggleTodo(todo.id)}
                    className="w-full flex items-start gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-paper-dark dark:hover:bg-ink-700 transition-colors group"
                  >
                    <span
                      className={cn(
                        'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        'border-ink-300 text-transparent',
                      )}
                    >
                      <Check className="w-3 h-3 opacity-0 group-hover:opacity-60 transition-opacity" strokeWidth={2.5} />
                    </span>
                    <span className="text-xs leading-relaxed text-ink-700 dark:text-ink-100 line-clamp-2">
                      {todo.title}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 底部统计 */}
        <footer className="px-3 py-1.5 border-t border-black/[0.05] dark:border-white/[0.06] text-[11px] text-ink-400 flex items-center justify-between">
          <span>今日 {todayTodos.length} 项</span>
          <span>未完成 {totalPending} 项</span>
        </footer>
      </div>
    </div>
  );
}

export default WidgetApp;
