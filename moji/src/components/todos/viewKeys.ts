/**
 * 待办页视图键与 URL ?list= / ?task= 参数的双向解析（D9）。
 *
 * ?list= 取值：`inbox | today | next7 | <listId>`
 * - 非法值（未知串 / 已删除的 listId / 缺失）一律回落 `inbox`
 * - 页面以 state 持有当前视图键，URL 仅做同步与还原现场
 *
 * ?task= 取值：`<todoId>`
 * - 缺失 / 空白 / 任务不存在 / 指向子任务一律回落「无选中」（null）
 * - 选中态以 URL 为事实源：点行写参、再点清参，详情栏随参数渲染
 */

import type { Todo } from '@/types';

export type SmartViewKey = 'inbox' | 'today' | 'next7';

export const SMART_VIEW_KEYS: readonly SmartViewKey[] = ['inbox', 'today', 'next7'];

export function isSmartViewKey(value: string): value is SmartViewKey {
  return (SMART_VIEW_KEYS as readonly string[]).includes(value);
}

/** 当前视图对应的 ?list= 参数值；清单不存在（已删除）时回落 inbox */
export function resolveViewParam(viewKey: string, listIds: readonly string[]): string {
  if (isSmartViewKey(viewKey)) return viewKey;
  return listIds.includes(viewKey) ? viewKey : 'inbox';
}

/** URL ?list= 参数 → 视图键；缺失 / 非法 / 清单已删一律回落 inbox */
export function resolveViewKeyFromParam(raw: string | null, listIds: readonly string[]): string {
  if (!raw) return 'inbox';
  if (isSmartViewKey(raw)) return raw;
  return listIds.includes(raw) ? raw : 'inbox';
}

/**
 * URL ?task= 参数 → 可选中的任务 id（D9）。
 *
 * 可选中 = 顶层任务且存在于 todos：
 * - 缺失 / 空白串 → null（无选中）
 * - id 不在集合中（任务已删除 / 乱写）→ null
 * - 指向子任务 → null（D4：子任务仅 title+status，不进详情选中集；
 *   页内交互只有顶层行可选中，?task= 指向子任务只可能来自手改链接或陈旧书签）
 */
export function resolveSelectedTaskId(
  raw: string | null | undefined,
  todos: readonly Todo[]
): string | null {
  const id = typeof raw === 'string' ? raw.trim() : '';
  if (!id) return null;
  const todo = todos.find((t) => t.id === id);
  return todo && !todo.parentId ? id : null;
}
