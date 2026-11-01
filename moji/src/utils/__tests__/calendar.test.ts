import { describe, it, expect } from 'vitest';
import {
  HOUR_HEIGHT,
  MIN_EVENT_HEIGHT,
  buildDayIndex,
  expandOccurrences,
  layoutTimedEvent,
} from '@/utils/calendar';
import type { Todo } from '@/types';
import { makeEvent, makeTodo, seedState } from '@/test/fixtures';

function localDate(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0,
  seconds = 0,
  ms = 0
): Date {
  return new Date(year, month - 1, day, hours, minutes, seconds, ms);
}

function iso(
  year: number,
  month: number,
  day: number,
  hours = 0,
  minutes = 0
): string {
  return localDate(year, month, day, hours, minutes).toISOString();
}

describe('layoutTimedEvent', () => {
  it('按 HOUR_HEIGHT=48 把分钟换算为像素', () => {
    expect(HOUR_HEIGHT).toBe(48);
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 9), endDate: iso(2025, 7, 9, 10) })
    );
    expect(layout.top).toBe(9 * 48);
    expect(layout.height).toBe(48);
  });

  it('半小时高度为 24px', () => {
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 9), endDate: iso(2025, 7, 9, 9, 30) })
    );
    expect(layout.height).toBe(24);
  });

  it('过短事件高度不小于 24px', () => {
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 9), endDate: iso(2025, 7, 9, 9, 15) })
    );
    expect(layout.height).toBe(MIN_EVENT_HEIGHT);
  });

  it('非整点起始按分钟精确计算 top', () => {
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 9, 30), endDate: iso(2025, 7, 9, 10, 30) })
    );
    expect(layout.top).toBe((9 * 60 + 30) / 60 * 48);
    expect(layout.height).toBe(48);
  });

  it('缺省 endDate 按 start + 60min 处理', () => {
    const layout = layoutTimedEvent(makeEvent({ startDate: iso(2025, 7, 9, 13) }));
    expect(layout.top).toBe(13 * 48);
    expect(layout.height).toBe(48);
  });

  it('非法 endDate 按 start + 60min 处理', () => {
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 13), endDate: 'not-a-date' })
    );
    expect(layout.height).toBe(48);
  });

  it('endDate 早于 startDate 时按 60min 处理', () => {
    const layout = layoutTimedEvent(
      makeEvent({ startDate: iso(2025, 7, 9, 13), endDate: iso(2025, 7, 9, 12) })
    );
    expect(layout.height).toBe(48);
  });

  it('非法 startDate 返回兜底布局', () => {
    const layout = layoutTimedEvent(makeEvent({ startDate: 'bad' }));
    expect(layout).toEqual({ top: 0, height: MIN_EVENT_HEIGHT });
  });

  it('全天事件（本地零点）top 为 0', () => {
    const layout = layoutTimedEvent(makeEvent({ startDate: iso(2025, 7, 9), isAllDay: true }));
    expect(layout.top).toBe(0);
    expect(layout.height).toBe(48);
  });
});

describe('expandOccurrences', () => {
  it('非重复事件与区间有交集时保留原对象', () => {
    const event = makeEvent({ startDate: iso(2025, 7, 9, 10), endDate: iso(2025, 7, 9, 11) });
    const result = expandOccurrences([event], localDate(2025, 7, 1), localDate(2025, 7, 31));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(event);
  });

  it('非重复事件跨区间起点也保留', () => {
    const event = makeEvent({ startDate: iso(2025, 7, 8, 22), endDate: iso(2025, 7, 9, 2) });
    const result = expandOccurrences([event], localDate(2025, 7, 9), localDate(2025, 7, 9, 23, 59));
    expect(result).toHaveLength(1);
  });

  it('非重复事件完全在区间外时丢弃', () => {
    const event = makeEvent({ startDate: iso(2025, 6, 1, 10) });
    const result = expandOccurrences([event], localDate(2025, 7, 1), localDate(2025, 7, 31));
    expect(result).toEqual([]);
  });

  it('daily 展开区间内每天一次，保留时分秒与 endDate 时长', () => {
    const event = makeEvent({
      id: 'daily-1',
      startDate: iso(2025, 7, 1, 9, 30),
      endDate: iso(2025, 7, 1, 10, 15),
      repeat: 'daily',
    });
    const result = expandOccurrences([event], localDate(2025, 7, 3), localDate(2025, 7, 5, 23, 59));

    expect(result).toHaveLength(3);
    expect(result.map((e) => new Date(e.startDate).getDate())).toEqual([3, 4, 5]);
    result.forEach((occurrence) => {
      const start = new Date(occurrence.startDate);
      expect(start.getHours()).toBe(9);
      expect(start.getMinutes()).toBe(30);
      const end = new Date(occurrence.endDate!);
      expect(end.getHours()).toBe(10);
      expect(end.getMinutes()).toBe(15);
      expect(occurrence.id).toBe('daily-1');
      expect(occurrence.repeat).toBe('daily');
    });
  });

  it('daily 跨天事件在区间起点前开始也能命中', () => {
    const event = makeEvent({
      startDate: iso(2025, 7, 1, 23),
      endDate: iso(2025, 7, 2, 1),
      repeat: 'daily',
    });
    const result = expandOccurrences(
      [event],
      localDate(2025, 7, 3, 0, 30),
      localDate(2025, 7, 3, 2)
    );
    expect(result).toHaveLength(1);
    expect(new Date(result[0].startDate).getDate()).toBe(2);
  });

  it('weekly 按 7 天推进', () => {
    const event = makeEvent({
      startDate: iso(2025, 7, 1, 10),
      endDate: iso(2025, 7, 1, 11),
      repeat: 'weekly',
    });
    const result = expandOccurrences([event], localDate(2025, 7, 8), localDate(2025, 7, 22, 23, 59));
    expect(result).toHaveLength(3);
    expect(result.map((e) => new Date(e.startDate).getDate())).toEqual([8, 15, 22]);
    result.forEach((occurrence) => {
      expect(new Date(occurrence.startDate).getDay()).toBe(new Date(event.startDate).getDay());
    });
  });

  it('monthly 保留每月同一天，短月跳过（如 31 日）', () => {
    const event = makeEvent({
      startDate: iso(2025, 1, 31, 10),
      endDate: iso(2025, 1, 31, 11),
      repeat: 'monthly',
    });
    const result = expandOccurrences([event], localDate(2025, 2, 1), localDate(2025, 4, 30, 23, 59));
    // 2 月、4 月没有 31 日 → 只有 3 月 31 日
    expect(result).toHaveLength(1);
    const start = new Date(result[0].startDate);
    expect(start.getMonth()).toBe(2);
    expect(start.getDate()).toBe(31);
    expect(start.getHours()).toBe(10);
  });

  it('monthly 正常日期逐月展开', () => {
    const event = makeEvent({
      startDate: iso(2025, 1, 15, 8),
      endDate: iso(2025, 1, 15, 9),
      repeat: 'monthly',
    });
    const result = expandOccurrences([event], localDate(2025, 1, 1), localDate(2025, 4, 30, 23, 59));
    expect(result).toHaveLength(4);
    expect(result.map((e) => new Date(e.startDate).getMonth())).toEqual([0, 1, 2, 3]);
  });

  it('重复事件无 endDate 时虚拟出现不带 endDate', () => {
    const event = makeEvent({ startDate: iso(2025, 7, 1, 9), repeat: 'daily' });
    const result = expandOccurrences([event], localDate(2025, 7, 1), localDate(2025, 7, 3, 23, 59));
    expect(result.length).toBe(3);
    result.forEach((occurrence) => {
      expect('endDate' in occurrence).toBe(false);
    });
  });

  it('虚拟出现是同 id 浅拷贝，仅替换 startDate/endDate，不新增字段', () => {
    const event = makeEvent({ startDate: iso(2025, 7, 1, 9), endDate: iso(2025, 7, 1, 10), repeat: 'daily' });
    const result = expandOccurrences([event], localDate(2025, 7, 2), localDate(2025, 7, 2, 23, 59));
    expect(result).toHaveLength(1);
    expect(Object.keys(result[0]).sort()).toEqual(Object.keys(event).sort());
    expect(result[0].id).toBe(event.id);
    expect(result[0].startDate).not.toBe(event.startDate);
  });

  it('区间非法（from > to）返回空数组', () => {
    const event = makeEvent({ startDate: iso(2025, 7, 1), repeat: 'daily' });
    expect(expandOccurrences([event], localDate(2025, 7, 10), localDate(2025, 7, 1))).toEqual([]);
    expect(expandOccurrences([event], new Date('bad'), localDate(2025, 7, 10))).toEqual([]);
    expect(expandOccurrences([event], localDate(2025, 7, 1), new Date('bad'))).toEqual([]);
  });

  it('startDate 非法的事件被忽略', () => {
    expect(expandOccurrences([makeEvent({ startDate: 'bad' })], localDate(2025, 7, 1), localDate(2025, 7, 31))).toEqual([]);
  });

  it('空数组返回空数组', () => {
    expect(expandOccurrences([], localDate(2025, 7, 1), localDate(2025, 7, 31))).toEqual([]);
  });

  it('多个事件按输入顺序输出', () => {
    const first = makeEvent({ id: 'a', startDate: iso(2025, 7, 2, 9) });
    const second = makeEvent({ id: 'b', startDate: iso(2025, 7, 1, 9) });
    const result = expandOccurrences([first, second], localDate(2025, 7, 1), localDate(2025, 7, 31));
    expect(result.map((e) => e.id)).toEqual(['a', 'b']);
  });
});

describe('buildDayIndex', () => {
  it('待办按 dueDate 日键分桶，无 dueDate / 非法 dueDate 忽略', () => {
    const todos: Todo[] = [
      makeTodo({ id: 't1', dueDate: '2025-07-09' }),
      makeTodo({ id: 't2', dueDate: iso(2025, 7, 9, 12) }),
      makeTodo({ id: 't3' }),
      makeTodo({ id: 't4', dueDate: 'bad' }),
    ];
    const index = buildDayIndex(todos, [], {
      from: localDate(2025, 7, 1),
      to: localDate(2025, 7, 31),
    });
    expect(index.get('2025-07-09')!.todos.map((t) => t.id)).toEqual(['t1', 't2']);
    expect(index.has('bad')).toBe(false);
    expect(index.size).toBe(1);
  });

  it('日程按 startDate 日键分桶', () => {
    const events = [
      makeEvent({ id: 'e1', startDate: iso(2025, 7, 9, 10), endDate: iso(2025, 7, 9, 11) }),
      makeEvent({ id: 'e2', startDate: iso(2025, 7, 10, 10) }),
    ];
    const index = buildDayIndex([], events, {
      from: localDate(2025, 7, 1),
      to: localDate(2025, 7, 31),
    });
    expect(index.get('2025-07-09')!.events.map((e) => e.id)).toEqual(['e1']);
    expect(index.get('2025-07-10')!.events.map((e) => e.id)).toEqual(['e2']);
  });

  it('重复日程展开后落到每一天的桶里', () => {
    const daily = makeEvent({
      id: 'daily',
      startDate: iso(2025, 7, 1, 9),
      endDate: iso(2025, 7, 1, 10),
      repeat: 'daily',
    });
    const index = buildDayIndex([], [daily], {
      from: localDate(2025, 7, 1),
      to: localDate(2025, 7, 3, 23, 59),
    });
    expect(index.size).toBe(3);
    for (const day of ['2025-07-01', '2025-07-02', '2025-07-03']) {
      const bucket = index.get(day)!;
      expect(bucket.events).toHaveLength(1);
      expect(bucket.events[0].id).toBe('daily');
      expect(new Date(bucket.events[0].startDate).getHours()).toBe(9);
    }
  });

  it('区间外的日程不进入索引', () => {
    const index = buildDayIndex(
      [],
      [makeEvent({ startDate: iso(2025, 6, 1, 10) })],
      { from: localDate(2025, 7, 1), to: localDate(2025, 7, 31) }
    );
    expect(index.size).toBe(0);
  });

  it('空输入返回空 Map', () => {
    const index = buildDayIndex([], [], {
      from: localDate(2025, 7, 1),
      to: localDate(2025, 7, 31),
    });
    expect(index).toBeInstanceOf(Map);
    expect(index.size).toBe(0);
  });

  it('同一天既有待办又有日程时放在同一桶不同键下', () => {
    const index = buildDayIndex(
      [makeTodo({ id: 't1', dueDate: '2025-07-09' })],
      [makeEvent({ id: 'e1', startDate: iso(2025, 7, 9, 10) })],
      { from: localDate(2025, 7, 1), to: localDate(2025, 7, 31) },
    );
    const bucket = index.get('2025-07-09')!;
    expect(bucket.todos.map((t) => t.id)).toEqual(['t1']);
    expect(bucket.events.map((e) => e.id)).toEqual(['e1']);
  });

  it('与 seedState 数据协作', () => {
    const state = seedState({
      todos: [makeTodo({ id: 't1', dueDate: '2025-07-09' })],
      events: [makeEvent({ id: 'e1', startDate: iso(2025, 7, 9, 10) })],
    });
    const index = buildDayIndex(state.todos, state.events, {
      from: localDate(2025, 7, 1),
      to: localDate(2025, 7, 31),
    });
    expect(index.get('2025-07-09')!.todos).toHaveLength(1);
    expect(index.get('2025-07-09')!.events).toHaveLength(1);
  });
});
