import { describe, it, expect } from 'vitest';
import {
  filterByList,
  filterInbox,
  filterNext7Days,
  filterToday,
  isOverdue,
} from '@/utils/todoFilters';
import { makeTodo } from '@/test/fixtures';
import type { Todo } from '@/types';

/** 多数用例使用的注入「今天」（日键，与实现约定一致：YYYY-MM-DD） */
const TODAY = '2026-11-14';

describe('filterInbox（收集箱）', () => {
  it('无 listId 的顶层任务进收集箱', () => {
    const todos = [makeTodo({ id: 't-inbox' })];
    expect(filterInbox(todos).map((t) => t.id)).toEqual(['t-inbox']);
  });

  it('有 listId 的任务不进收集箱', () => {
    const todos = [makeTodo({ id: 't-list', listId: 'list-1' }), makeTodo({ id: 't-inbox' })];
    expect(filterInbox(todos).map((t) => t.id)).toEqual(['t-inbox']);
  });

  it('listId 为空串视为未归清单（防御）', () => {
    const todos = [makeTodo({ id: 't-empty', listId: '' })];
    expect(filterInbox(todos).map((t) => t.id)).toEqual(['t-empty']);
  });

  it('子任务（parentId 非空、无 listId）不进收集箱（D4）', () => {
    const todos = [makeTodo({ id: 'parent' }), makeTodo({ id: 'sub', parentId: 'parent' })];
    expect(filterInbox(todos).map((t) => t.id)).toEqual(['parent']);
  });

  it('completed / abandoned 成员资格保留（过滤层不按 status 过滤）', () => {
    const todos = [
      makeTodo({ id: 'done', status: 'completed' }),
      makeTodo({ id: 'gone', status: 'abandoned' }),
    ];
    expect(filterInbox(todos).map((t) => t.id)).toEqual(['done', 'gone']);
  });

  it('todos 为 null / undefined 时返回空数组（防御）', () => {
    expect(filterInbox(null as unknown as Todo[])).toEqual([]);
    expect(filterInbox(undefined as unknown as Todo[])).toEqual([]);
  });
});

describe('filterToday（今天）', () => {
  it('dueDate 恰为 today 的顶层任务进今天', () => {
    const todos = [makeTodo({ id: 't-today', dueDate: TODAY })];
    expect(filterToday(todos, TODAY).map((t) => t.id)).toEqual(['t-today']);
  });

  it('昨天 / 明天的任务不进今天', () => {
    const todos = [
      makeTodo({ id: 'yesterday', dueDate: '2026-11-13' }),
      makeTodo({ id: 'tomorrow', dueDate: '2026-11-15' }),
    ];
    expect(filterToday(todos, TODAY)).toEqual([]);
  });

  it('无 dueDate 不进今天', () => {
    const todos = [makeTodo({ id: 'no-date' })];
    expect(filterToday(todos, TODAY)).toEqual([]);
  });

  it('子任务不进今天（D4）——即使 dueDate 恰为 today', () => {
    const todos = [makeTodo({ id: 'sub', parentId: 'parent', dueDate: TODAY })];
    expect(filterToday(todos, TODAY)).toEqual([]);
  });

  it('abandoned 不进今天（abandonedAt 后已脱离日程）', () => {
    const todos = [makeTodo({ id: 'gone', status: 'abandoned', dueDate: TODAY })];
    expect(filterToday(todos, TODAY)).toEqual([]);
  });

  it('completed 且 dueDate===today 进（成员资格保留，UI 沉底折叠）', () => {
    const todos = [makeTodo({ id: 'done', status: 'completed', dueDate: TODAY })];
    expect(filterToday(todos, TODAY).map((t) => t.id)).toEqual(['done']);
  });

  it('today 非法日键时返回空数组（防御）', () => {
    const todos = [makeTodo({ id: 't-today', dueDate: TODAY })];
    expect(filterToday(todos, '')).toEqual([]);
    expect(filterToday(todos, 'not-a-day')).toEqual([]);
    expect(filterToday(todos, '2026-02-30')).toEqual([]);
  });

  it('todos 为 null / undefined 时返回空数组（防御）', () => {
    expect(filterToday(null as unknown as Todo[], TODAY)).toEqual([]);
    expect(filterToday(undefined as unknown as Todo[], TODAY)).toEqual([]);
  });
});

describe('filterNext7Days（最近7天）', () => {
  it('窗口首日（today 当天）进', () => {
    const todos = [makeTodo({ id: 't-first', dueDate: TODAY })];
    expect(filterNext7Days(todos, TODAY).map((t) => t.id)).toEqual(['t-first']);
  });

  it('窗口末日（today+6）进', () => {
    const todos = [makeTodo({ id: 't-end', dueDate: '2026-11-20' })];
    expect(filterNext7Days(todos, TODAY).map((t) => t.id)).toEqual(['t-end']);
  });

  it('today+7 不进', () => {
    const todos = [makeTodo({ id: 't-beyond', dueDate: '2026-11-21' })];
    expect(filterNext7Days(todos, TODAY)).toEqual([]);
  });

  it('昨天（已逾期的 active 任务）进（D7：最近7天 = 未来7天 + 已逾期）', () => {
    const todos = [makeTodo({ id: 'overdue', dueDate: '2026-11-13' })];
    expect(filterNext7Days(todos, TODAY).map((t) => t.id)).toEqual(['overdue']);
  });

  it('更早的日期（today-2）也进（逾期无下限）', () => {
    const todos = [makeTodo({ id: 'old', dueDate: '2026-11-12' })];
    expect(filterNext7Days(todos, TODAY).map((t) => t.id)).toEqual(['old']);
  });

  it('completed 且 dueDate 已过不进（逾期仅 active）', () => {
    const todos = [makeTodo({ id: 'done', status: 'completed', dueDate: '2026-11-13' })];
    expect(filterNext7Days(todos, TODAY)).toEqual([]);
  });

  it('子任务不进（D4）——即使 dueDate 在窗口内', () => {
    const todos = [makeTodo({ id: 'sub', parentId: 'parent', dueDate: TODAY })];
    expect(filterNext7Days(todos, TODAY)).toEqual([]);
  });

  it('abandoned 不进——即使 dueDate 在窗口内', () => {
    const todos = [makeTodo({ id: 'gone', status: 'abandoned', dueDate: TODAY })];
    expect(filterNext7Days(todos, TODAY)).toEqual([]);
  });

  it('无 dueDate 不进', () => {
    const todos = [makeTodo({ id: 'no-date' })];
    expect(filterNext7Days(todos, TODAY)).toEqual([]);
  });

  it('today 非法日键时返回空数组（防御）', () => {
    const todos = [makeTodo({ id: 't-first', dueDate: TODAY })];
    expect(filterNext7Days(todos, '')).toEqual([]);
    expect(filterNext7Days(todos, '2026-02-30')).toEqual([]);
  });

  it('todos 为 null / undefined 时返回空数组（防御）', () => {
    expect(filterNext7Days(null as unknown as Todo[], TODAY)).toEqual([]);
    expect(filterNext7Days(undefined as unknown as Todo[], TODAY)).toEqual([]);
  });
});

describe('isOverdue（逾期判定）', () => {
  it('dueDate 早于 today 且 active → true', () => {
    expect(isOverdue(makeTodo({ id: 't1', dueDate: '2026-11-13' }), TODAY)).toBe(true);
  });

  it('dueDate === today（当天）不算逾期', () => {
    expect(isOverdue(makeTodo({ id: 't1', dueDate: TODAY }), TODAY)).toBe(false);
  });

  it('dueDate 晚于 today 不算逾期', () => {
    expect(isOverdue(makeTodo({ id: 't1', dueDate: '2026-11-15' }), TODAY)).toBe(false);
  });

  it('completed 不算逾期（即使 dueDate 已过）', () => {
    expect(
      isOverdue(makeTodo({ id: 't1', status: 'completed', dueDate: '2026-11-13' }), TODAY)
    ).toBe(false);
  });

  it('abandoned 不算逾期（即使 dueDate 已过）', () => {
    expect(
      isOverdue(makeTodo({ id: 't1', status: 'abandoned', dueDate: '2026-11-13' }), TODAY)
    ).toBe(false);
  });

  it('无 dueDate 不算逾期', () => {
    expect(isOverdue(makeTodo({ id: 't1' }), TODAY)).toBe(false);
  });

  it('子任务不算逾期（D4）', () => {
    expect(
      isOverdue(makeTodo({ id: 'sub', parentId: 'parent', dueDate: '2026-11-13' }), TODAY)
    ).toBe(false);
  });

  it('today 非法日键不算逾期（防御）', () => {
    const todo = makeTodo({ id: 't1', dueDate: '2026-11-13' });
    expect(isOverdue(todo, '')).toBe(false);
    expect(isOverdue(todo, '2026-02-30')).toBe(false);
  });
});

describe('filterByList（清单过滤）', () => {
  it('匹配 listId 的顶层任务进，不匹配的不进', () => {
    const todos = [
      makeTodo({ id: 'a', listId: 'list-1' }),
      makeTodo({ id: 'b', listId: 'list-2' }),
      makeTodo({ id: 'c' }),
    ];
    expect(filterByList(todos, 'list-1').map((t) => t.id)).toEqual(['a']);
  });

  it('completed 成员资格保留（过滤层不按 status 过滤）', () => {
    const todos = [makeTodo({ id: 'done', listId: 'list-1', status: 'completed' })];
    expect(filterByList(todos, 'list-1').map((t) => t.id)).toEqual(['done']);
  });

  it('子任务不进清单结果（D4 防御）——即使 listId 相同', () => {
    const todos = [
      makeTodo({ id: 'parent', listId: 'list-1' }),
      makeTodo({ id: 'sub', parentId: 'parent', listId: 'list-1' }),
    ];
    expect(filterByList(todos, 'list-1').map((t) => t.id)).toEqual(['parent']);
  });

  it('todos 为 null 时返回空数组（防御）', () => {
    expect(filterByList(null as unknown as Todo[], 'list-1')).toEqual([]);
  });
});

describe('注入 today 边界（月末 / 年末 / 闰日）', () => {
  it('月末跨界：today=2026-11-30，窗口末日为 2026-12-06', () => {
    const todos = [
      makeTodo({ id: 'first', dueDate: '2026-11-30' }),
      makeTodo({ id: 'end', dueDate: '2026-12-06' }),
      makeTodo({ id: 'beyond', dueDate: '2026-12-07' }),
      makeTodo({ id: 'overdue', dueDate: '2026-11-29' }),
    ];
    expect(filterNext7Days(todos, '2026-11-30').map((t) => t.id).sort()).toEqual([
      'end',
      'first',
      'overdue',
    ]);
  });

  it('年末跨年：today=2026-12-31，窗口末日为 2027-01-06', () => {
    const todos = [
      makeTodo({ id: 'first', dueDate: '2026-12-31' }),
      makeTodo({ id: 'end', dueDate: '2027-01-06' }),
      makeTodo({ id: 'beyond', dueDate: '2027-01-07' }),
      makeTodo({ id: 'overdue', dueDate: '2026-12-30' }),
    ];
    expect(filterNext7Days(todos, '2026-12-31').map((t) => t.id).sort()).toEqual([
      'end',
      'first',
      'overdue',
    ]);
  });

  it('闰年 2 月：today=2028-02-23，窗口末日为闰日 2028-02-29', () => {
    const todos = [
      makeTodo({ id: 'end', dueDate: '2028-02-29' }),
      makeTodo({ id: 'beyond', dueDate: '2028-03-01' }),
    ];
    expect(filterNext7Days(todos, '2028-02-23').map((t) => t.id)).toEqual(['end']);
  });

  it('今天过滤按日键全等比较（月末当天进，次月 1 日不进）', () => {
    const todos = [
      makeTodo({ id: 't1', dueDate: '2026-11-30' }),
      makeTodo({ id: 't2', dueDate: '2026-12-01' }),
    ];
    expect(filterToday(todos, '2026-11-30').map((t) => t.id)).toEqual(['t1']);
    expect(filterToday(todos, '2026-12-01').map((t) => t.id)).toEqual(['t2']);
  });

  it('月末 / 年末的逾期判定', () => {
    expect(isOverdue(makeTodo({ id: 't1', dueDate: '2026-11-29' }), '2026-11-30')).toBe(true);
    expect(isOverdue(makeTodo({ id: 't2', dueDate: '2027-01-01' }), '2026-12-31')).toBe(false);
    expect(isOverdue(makeTodo({ id: 't3', dueDate: '2026-12-30' }), '2026-12-31')).toBe(true);
  });
});

describe('纯函数约束', () => {
  it('过滤返回新数组且不改动入参', () => {
    const todos = [
      makeTodo({ id: 'a', dueDate: TODAY }),
      makeTodo({ id: 'b' }),
      makeTodo({ id: 'sub', parentId: 'a', dueDate: TODAY }),
    ];
    const snapshot = [...todos];

    const inbox = filterInbox(todos);
    const today = filterToday(todos, TODAY);
    const next7 = filterNext7Days(todos, TODAY);
    const inList = filterByList(todos, 'list-1');

    expect(inbox).not.toBe(todos);
    expect(today).not.toBe(todos);
    expect(next7).not.toBe(todos);
    expect(inList).not.toBe(todos);
    expect(todos).toEqual(snapshot);
    expect(todos).toHaveLength(3);
  });
});
