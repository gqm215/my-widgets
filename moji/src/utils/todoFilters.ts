import { addDays } from 'date-fns';
import { parseDayKey, toDayKey } from '@/utils/date';
import type { Todo } from '@/types';

/**
 * 待办智能过滤纯函数集（B2 三栏 UI 的过滤层）
 *
 * 日期模型：
 * - `dueDate` 存本地日键 `yyyy-MM-dd`（见 utils/date.ts 的 toDayKey）
 * - 日键字符串比较即时间序（字典序 = 时间序）
 * - 所有需要「今天」的函数接受注入的 `today` 日键参数，保持纯函数可测，
 *   内部不调用 `new Date()`
 *
 * 决策依据（docs/gaps-and-decisions.md）：
 * - D4：子任务不进收集箱/今天/最近7天——所有过滤只返回顶层任务；
 *       清单过滤同样只返回顶层（子任务在父行内嵌展示，嵌套渲染归 B2 UI）
 * - D7：智能清单只有三个——收集箱/今天/最近7天；「最近7天」= 未来7天 + 已逾期；
 *       逾期任务在「今天」视图独立红色分组置顶（分组是 UI 的事，
 *       本模块只出成员资格与逾期判定，不做分组/排序）
 */

/** D4：顶层任务判定——parentId 非空（truthy）即为子任务 */
function isTopLevel(todo: Todo): boolean {
  return !todo.parentId;
}

/**
 * 清单过滤（D4）：返回归属指定清单的顶层任务。
 * 只管成员资格、不过滤 status——completed/abandoned 是否展示、
 * 如何分组沉底由视图层决定（D11 已完成折叠分组归 UI）。
 */
export function filterByList(todos: Todo[], listId: string): Todo[] {
  return (todos ?? []).filter((todo) => isTopLevel(todo) && todo.listId === listId);
}

/**
 * 收集箱过滤（D7）：无 listId 的顶层任务（listId 缺失或空串均视为未归清单）。
 * 只管成员资格、不过滤 status（abandoned 是否显示归 B2 UI 拍板）。
 */
export function filterInbox(todos: Todo[]): Todo[] {
  return (todos ?? []).filter((todo) => isTopLevel(todo) && !todo.listId);
}

/**
 * 今天过滤（D7）：`dueDate` 恰为 `today` 的顶层任务。
 * - 含 completed（UI 沉底折叠；成员资格保留）
 * - abandoned 不进今天视图：abandonedAt 之后任务已脱离日程
 * - 无 dueDate 的顶层任务只进收集箱（若同时无 listId）
 */
export function filterToday(todos: Todo[], today: string): Todo[] {
  const todayKey = toDayKey(today);
  if (!todayKey) return [];
  return (todos ?? []).filter(
    (todo) =>
      isTopLevel(todo) &&
      todo.status !== 'abandoned' &&
      toDayKey(todo.dueDate) === todayKey
  );
}

/**
 * 最近 7 天过滤（D7）：`dueDate` 落在 `[today, today+6]` 窗口内、
 * 或已逾期（复用 isOverdue，仅 active）的顶层任务。
 * - abandoned 排除；dueDate 落在窗口内的 completed 成员资格保留
 * - 无 dueDate 不进；today+7 及以后不进
 */
export function filterNext7Days(todos: Todo[], today: string): Todo[] {
  const todayKey = toDayKey(today);
  if (!todayKey) return [];
  // 窗口末日用 date-fns addDays 计算并折回日键，避免手写日期运算
  const endKey = toDayKey(addDays(parseDayKey(todayKey), 6));
  return (todos ?? []).filter((todo) => {
    if (todo.status === 'abandoned') return false;
    if (!isTopLevel(todo)) return false;
    const dueKey = toDayKey(todo.dueDate);
    if (!dueKey) return false;
    return (dueKey >= todayKey && dueKey <= endKey) || isOverdue(todo, todayKey);
  });
}

/**
 * 逾期判定（D7）：顶层任务 `status === 'active'` 且 `dueDate` 早于 `today` 才算逾期。
 * - 当天（dueDate === today）不算逾期
 * - completed 已终结、abandoned 已脱离日程，均不算逾期（仅 active 任务会逾期）
 * - 无 dueDate 不算逾期；today 非法日键时一律不算逾期
 */
export function isOverdue(todo: Todo, today: string): boolean {
  const todayKey = toDayKey(today);
  if (!todayKey) return false;
  if (!isTopLevel(todo)) return false;
  if (todo.status !== 'active') return false;
  const dueKey = toDayKey(todo.dueDate);
  if (!dueKey) return false;
  return dueKey < todayKey;
}
