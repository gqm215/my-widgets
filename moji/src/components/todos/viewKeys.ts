/**
 * 待办页视图键与 URL ?list= 参数的双向解析（D9）。
 *
 * 参数取值：`inbox | today | next7 | <listId>`
 * - 非法值（未知串 / 已删除的 listId / 缺失）一律回落 `inbox`
 * - 页面以 state 持有当前视图键，URL 仅做同步与还原现场
 */

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
