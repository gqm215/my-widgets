import { useEffect, useRef, useState } from 'react';
import { CalendarCheck, CalendarRange, Inbox, Palette, Pencil, Plus, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store';
import { ConfirmDialog, Input, useToast } from '@/components/ui';
import { cn } from '@/lib/utils';
import { DEFAULT_LIST_COLOR, PALETTE_COLORS } from '@/design/palette';
import { filterByList, filterInbox, filterNext7Days, filterToday } from '@/utils/todoFilters';
import type { List, Todo } from '@/types';

export interface ListRailProps {
  todos: Todo[];
  lists: List[];
  /** 当前视图键：inbox | today | next7 | <listId> */
  activeKey: string;
  today: string;
  onSelect: (key: string) => void;
  /** 窄屏抽屉模式下，选择/操作完成后收起抽屉 */
  onClose?: () => void;
}

/** 色板 swatch 选中态描边（纸白/墨底各配 ring 底色） */
const SWATCH_RING =
  'ring-2 ring-offset-1 ring-ink-400 dark:ring-ink-300 ring-offset-white dark:ring-offset-ink-800';

/**
 * 清单栏（D7/D18）：智能清单三件套 + 用户清单 + 新建入口。
 * 角标 = 各视图 active 顶层任务数（completed/abandoned 不计入）。
 * 色板六色唯一事实源见 src/design/palette.ts；新建默认墨灰，已有清单可改色。
 */
export function ListRail({ todos, lists, activeKey, today, onSelect, onClose }: ListRailProps) {
  const addList = useAppStore((s) => s.addList);
  const updateList = useAppStore((s) => s.updateList);
  const deleteList = useAppStore((s) => s.deleteList);
  const { toast } = useToast();

  const [creating, setCreating] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListColor, setNewListColor] = useState<string>(DEFAULT_LIST_COLOR);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<List | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [colorPanelId, setColorPanelId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const colorPanelRef = useRef<HTMLDivElement>(null);

  const countActive = (items: Todo[]) => items.filter((t) => t.status === 'active').length;
  const inboxCount = countActive(filterInbox(todos));
  const todayCount = countActive(filterToday(todos, today));
  const next7Count = countActive(filterNext7Days(todos, today));

  // 「+」菜单 / 改色面板：外点 / Esc 关闭（改色触发按钮自身不视为外点，保留 toggle 语义）
  useEffect(() => {
    if (!menuOpen && !colorPanelId) return undefined;
    const handlePointerDown = (e: MouseEvent) => {
      const target = e.target as Element;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (
        colorPanelId &&
        colorPanelRef.current &&
        !colorPanelRef.current.contains(target) &&
        !(target instanceof Element && target.closest('[data-recolor-trigger]'))
      ) {
        setColorPanelId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setColorPanelId(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [menuOpen, colorPanelId]);

  const startCreate = () => {
    setMenuOpen(false);
    setColorPanelId(null);
    setCreating(true);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewListName('');
    setNewListColor(DEFAULT_LIST_COLOR);
  };

  const handleCreate = () => {
    const name = newListName.trim();
    if (!name) return;
    addList(name, newListColor);
    toast('success', '清单已创建');
    cancelCreate();
  };

  const startRename = (list: List) => {
    setColorPanelId(null);
    setEditingId(list.id);
    setEditingName(list.name);
  };

  const toggleColorPanel = (list: List) => {
    setMenuOpen(false);
    setColorPanelId((prev) => (prev === list.id ? null : list.id));
  };

  const cancelRename = () => {
    setEditingId(null);
    setEditingName('');
  };

  const commitRename = () => {
    if (!editingId) return;
    const name = editingName.trim();
    if (name) {
      updateList(editingId, { name });
      toast('success', '清单已重命名');
    }
    cancelRename();
  };

  const handleSelect = (key: string) => {
    onSelect(key);
    onClose?.();
  };

  const smartItems = [
    { key: 'inbox', label: '收集箱', count: inboxCount, icon: Inbox },
    { key: 'today', label: '今天', count: todayCount, icon: CalendarCheck },
    { key: 'next7', label: '最近7天', count: next7Count, icon: CalendarRange },
  ];

  return (
    <nav aria-label="清单栏" className="flex flex-col h-full">
      <ul className="space-y-0.5">
        {smartItems.map(({ key, label, count, icon: Icon }) => (
          <li key={key}>
            <button
              type="button"
              onClick={() => handleSelect(key)}
              aria-label={`${label}（${count} 项待办）`}
              aria-current={activeKey === key ? 'true' : undefined}
              className={cn(
                'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-colors duration-150',
                activeKey === key
                  ? 'bg-paper-accent dark:bg-ink-700/60 text-ink-900 dark:text-ink-100 font-medium'
                  : 'text-ink-600 dark:text-ink-300 hover:bg-paper-dark/60 dark:hover:bg-ink-700/40',
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" strokeWidth={1.5} />
              <span className="flex-1 text-left truncate">{label}</span>
              <span
                aria-hidden="true"
                className="text-xs text-ink-300 dark:text-ink-500 tabular-nums"
              >
                {count}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="brush-divider my-3" aria-hidden="true" />

      {lists.length === 0 ? (
        <p className="px-2.5 py-1 text-xs text-ink-300 dark:text-ink-500">还没有自建清单</p>
      ) : (
        <ul className="space-y-0.5">
          {lists.map((list) => {
            const count = countActive(filterByList(todos, list.id));
            const active = activeKey === list.id;
            return (
              <li key={list.id} className="group relative">
                {editingId === list.id ? (
                  <Input
                    aria-label="清单名称"
                    value={editingName}
                    autoFocus
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitRename();
                      if (e.key === 'Escape') cancelRename();
                    }}
                    className="py-1 text-sm"
                  />
                ) : (
                  <>
                  <div
                    className={cn(
                      'flex items-center rounded-md pr-1 transition-colors duration-150',
                      active
                        ? 'bg-paper-accent dark:bg-ink-700/60'
                        : 'hover:bg-paper-dark/60 dark:hover:bg-ink-700/40',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(list.id)}
                      aria-label={`${list.name}（${count} 项待办）`}
                      aria-current={active ? 'true' : undefined}
                      className={cn(
                        'flex-1 min-w-0 flex items-center gap-2.5 px-2.5 py-2 text-sm',
                        active
                          ? 'text-ink-900 dark:text-ink-100 font-medium'
                          : 'text-ink-600 dark:text-ink-300',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: list.color }}
                      />
                      <span className="truncate">{list.name}</span>
                      <span
                        aria-hidden="true"
                        className="ml-auto text-xs text-ink-300 dark:text-ink-500 tabular-nums"
                      >
                        {count}
                      </span>
                    </button>
                    {/* hover 显操作：行内改名 / 改色面板 / 删除确认 */}
                    <div
                      className={cn(
                        'flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-150',
                        colorPanelId === list.id && 'opacity-100',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => startRename(list)}
                        aria-label={`重命名清单「${list.name}」`}
                        className="p-1.5 rounded text-ink-300 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-200 hover:bg-paper-dark dark:hover:bg-ink-600 transition-colors"
                      >
                        <Pencil className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        data-recolor-trigger
                        onClick={() => toggleColorPanel(list)}
                        aria-label={`改色清单「${list.name}」`}
                        aria-expanded={colorPanelId === list.id}
                        className="p-1.5 rounded text-ink-300 dark:text-ink-500 hover:text-ink-600 dark:hover:text-ink-200 hover:bg-paper-dark dark:hover:bg-ink-600 transition-colors"
                      >
                        <Palette className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(list)}
                        aria-label={`删除清单「${list.name}」`}
                        className="p-1.5 rounded text-ink-300 dark:text-ink-500 hover:text-vermilion hover:bg-paper-dark dark:hover:bg-ink-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                  {colorPanelId === list.id && (
                    <div
                      ref={colorPanelRef}
                      role="group"
                      aria-label={`改色清单「${list.name}」`}
                      className="absolute right-0 top-full mt-1 z-10 flex items-center gap-1.5 rounded-lg bg-white dark:bg-ink-800 shadow-paper-lg dark:shadow-none border border-black/[0.04] dark:border-white/[0.06] px-2 py-1.5 animate-scale-in"
                    >
                      {PALETTE_COLORS.map((color) => (
                        <button
                          key={color.key}
                          type="button"
                          title={color.name}
                          aria-label={`改为${color.name}`}
                          aria-pressed={list.color === color.hex}
                          onClick={() => {
                            updateList(list.id, { color: color.hex });
                            setColorPanelId(null);
                          }}
                          className={cn(
                            'w-4 h-4 rounded-full flex-shrink-0 transition-shadow hover:scale-110',
                            list.color === color.hex && SWATCH_RING,
                          )}
                          style={{ backgroundColor: color.hex }}
                        />
                      ))}
                    </div>
                  )}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto pt-3">
        <div className="brush-divider mb-3" aria-hidden="true" />
        {creating ? (
          <div>
            <Input
              aria-label="新清单名称"
              placeholder="新清单名称"
              value={newListName}
              autoFocus
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') cancelCreate();
              }}
              className="py-1.5 text-sm"
            />
            {/* 六色选择：默认墨灰（palette.ts 唯一事实源），回车按所选色创建 */}
            <div role="group" aria-label="新清单颜色" className="mt-2 flex items-center gap-1.5 px-0.5">
              {PALETTE_COLORS.map((color) => (
                <button
                  key={color.key}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={newListColor === color.hex}
                  onClick={() => setNewListColor(color.hex)}
                  className={cn(
                    'w-4 h-4 rounded-full flex-shrink-0 transition-shadow hover:scale-110',
                    newListColor === color.hex && SWATCH_RING,
                  )}
                  style={{ backgroundColor: color.hex }}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startCreate}
              className="flex-1 flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm text-ink-500 dark:text-ink-300 hover:text-vermilion hover:bg-paper-dark/60 dark:hover:bg-ink-700/40 transition-colors"
            >
              <Plus className="w-4 h-4" strokeWidth={1.5} />
              <span>新建清单</span>
            </button>
            {/* 「+」菜单：模板入口预留（D17/清单模板后续批次） */}
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="新建清单菜单"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="p-2 rounded-md text-ink-400 dark:text-ink-300 hover:text-ink-600 dark:hover:text-ink-100 hover:bg-paper-dark/60 dark:hover:bg-ink-700/40 transition-colors"
              >
                <Plus className="w-4 h-4" strokeWidth={1.5} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  aria-label="新建清单选项"
                  className="absolute bottom-full left-0 mb-1 w-44 z-10 rounded-lg bg-white dark:bg-ink-800 shadow-paper-lg dark:shadow-none border border-black/[0.04] dark:border-white/[0.06] py-1 animate-scale-in"
                >
                  <button
                    type="button"
                    role="menuitem"
                    onClick={startCreate}
                    className="w-full text-left px-3 py-1.5 text-sm text-ink-700 dark:text-ink-200 hover:bg-paper-dark/60 dark:hover:bg-ink-700/60 transition-colors"
                  >
                    新建空白清单
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    disabled
                    className="w-full flex items-center justify-between gap-2 text-left px-3 py-1.5 text-sm text-ink-300 dark:text-ink-600 cursor-not-allowed"
                  >
                    <span>从模板新建</span>
                    <span className="text-xs">即将上线</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (!deleteTarget) return;
          deleteList(deleteTarget.id);
          toast('success', '清单已删除');
          setDeleteTarget(null);
        }}
        title="删除清单"
        message={
          deleteTarget
            ? `确定要删除清单「${deleteTarget.name}」吗？清单下的任务不会删除，将移入收集箱。`
            : ''
        }
        confirmLabel="删除"
        variant="danger"
      />
    </nav>
  );
}
