import type { Event, Todo } from '@/types';
import { toDayKey } from '@/utils/date';

/** 周视图每小时高度（px） */
export const HOUR_HEIGHT = 48;
/** 时间块最小高度（px） */
export const MIN_EVENT_HEIGHT = 24;
/** 缺失结束时间时的默认时长（分钟） */
const DEFAULT_DURATION_MINUTES = 60;

export interface DayIndexEntry {
  todos: Todo[];
  events: Event[];
}

export interface EventLayout {
  top: number;
  height: number;
}

function isValidDate(value: Date): boolean {
  return !Number.isNaN(value.getTime());
}

/** 取一天中的分钟数（含秒的小数部分） */
function minutesFromMidnight(date: Date): number {
  return (
    date.getHours() * 60 +
    date.getMinutes() +
    date.getSeconds() / 60 +
    date.getMilliseconds() / 60000
  );
}

function parseDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * 计算时间块在周视图中的位置（相对当天 0 点，单位 px）。
 * endDate 缺失 / 非法 / 早于 startDate 时按 start + 60min 处理。
 */
export function layoutTimedEvent(ev: Event): EventLayout {
  const start = parseDate(ev.startDate);
  if (!start) return { top: 0, height: MIN_EVENT_HEIGHT };

  let end = parseDate(ev.endDate);
  if (!end || end.getTime() <= start.getTime()) {
    end = new Date(start.getTime() + DEFAULT_DURATION_MINUTES * 60 * 1000);
  }

  const top = (minutesFromMidnight(start) / 60) * HOUR_HEIGHT;
  const durationMinutes = (end.getTime() - start.getTime()) / (60 * 1000);
  const height = Math.max(MIN_EVENT_HEIGHT, (durationMinutes / 60) * HOUR_HEIGHT);

  // 允许事件跨越午夜：top 限制在一天内；高度不裁剪，由页面容器 overflow 处理
  return { top, height };
}

/**
 * 把重复日程展开为落在 [from, to] 区间内的虚拟出现。
 *
 * - 非重复事件：与区间有交集则保留（原对象）
 * - 重复事件：同 id 浅拷贝，仅替换 startDate / endDate，保留原时分秒
 * - 区间判定：occStart <= to && (occEnd ?? occStart) >= from
 * - monthly 保留「每月同一天」，短月不存在该日时跳过该月
 */
export function expandOccurrences(events: Event[], from: Date, to: Date): Event[] {
  const rangeStart = from instanceof Date && isValidDate(from) ? from : null;
  const rangeEnd = to instanceof Date && isValidDate(to) ? to : null;
  if (!rangeStart || !rangeEnd || rangeStart.getTime() > rangeEnd.getTime()) return [];

  const result: Event[] = [];

  for (const event of events) {
    const baseStart = parseDate(event.startDate);
    if (!baseStart) continue;

    const baseEnd = parseDate(event.endDate);
    const durationMs =
      baseEnd && baseEnd.getTime() > baseStart.getTime()
        ? baseEnd.getTime() - baseStart.getTime()
        : null;

    const repeat = event.repeat ?? 'none';
    if (repeat === 'none') {
      const occEnd = durationMs === null ? baseStart : new Date(baseStart.getTime() + durationMs);
      if (baseStart.getTime() <= rangeEnd.getTime() && occEnd.getTime() >= rangeStart.getTime()) {
        result.push(event);
      }
      continue;
    }

    const occurrences = expandOne(baseStart, repeat, rangeStart, rangeEnd);
    for (const occurrence of occurrences) {
      const occEnd =
        durationMs === null ? occurrence : new Date(occurrence.getTime() + durationMs);

      // 区间取交集：occStart <= to 且 occEnd >= from
      if (occurrence.getTime() > rangeEnd.getTime()) continue;
      if (occEnd.getTime() < rangeStart.getTime()) continue;

      // 虚拟出现 = 原事件浅拷贝，仅替换 startDate / endDate，保留原时分秒
      const virtual: Event = {
        ...event,
        startDate: occurrence.toISOString(),
      };
      if (durationMs === null) {
        delete virtual.endDate;
      } else {
        virtual.endDate = occEnd.toISOString();
      }
      result.push(virtual);
    }
  }

  return result;
}

/** 生成单个重复事件在区间内的所有出现起点（本地时间语义） */
function expandOne(
  baseStart: Date,
  repeat: Event['repeat'],
  from: Date,
  to: Date
): Date[] {
  const occurrences: Date[] = [];
  const MAX_ITERATIONS = 5000;

  switch (repeat) {
    case 'daily': {
      const stepMs = 24 * 60 * 60 * 1000;
      // 从区间前 1 天开始，覆盖跨天事件
      let index = Math.max(
        0,
        Math.floor((from.getTime() - baseStart.getTime()) / stepMs) - 1
      );
      for (let i = 0; i < MAX_ITERATIONS; i += 1) {
        const occurrence = addDays(baseStart, index);
        if (occurrence.getTime() > to.getTime()) break;
        occurrences.push(occurrence);
        index += 1;
      }
      break;
    }
    case 'weekly': {
      const stepMs = 7 * 24 * 60 * 60 * 1000;
      let index = Math.max(
        0,
        Math.floor((from.getTime() - baseStart.getTime()) / stepMs) - 1
      );
      for (let i = 0; i < MAX_ITERATIONS; i += 1) {
        const occurrence = addDays(baseStart, index * 7);
        if (occurrence.getTime() > to.getTime()) break;
        occurrences.push(occurrence);
        index += 1;
      }
      break;
    }
    case 'monthly': {
      // 以 baseStart 的「月 + 日 + 时刻」为模板逐月推进
      const baseYear = baseStart.getFullYear();
      const baseMonth = baseStart.getMonth();
      const baseDay = baseStart.getDate();

      let monthIndex = Math.max(
        0,
        (from.getFullYear() - baseYear) * 12 +
          (from.getMonth() - baseMonth) -
          1
      );
      for (let i = 0; i < MAX_ITERATIONS; i += 1) {
        const year = baseYear + Math.floor((baseMonth + monthIndex) / 12);
        const month = (baseMonth + monthIndex) % 12;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        // 短月没有该日（如 31 日）时跳过该月
        if (baseDay <= daysInMonth) {
          const occurrence = new Date(
            year,
            month,
            baseDay,
            baseStart.getHours(),
            baseStart.getMinutes(),
            baseStart.getSeconds(),
            baseStart.getMilliseconds()
          );
          if (occurrence.getTime() > to.getTime()) break;
          occurrences.push(occurrence);
        }
        monthIndex += 1;
      }
      break;
    }
    default:
      break;
  }

  return occurrences;
}

/** 本地日期加天数（保留时分秒，避免 UTC 偏移） */
function addDays(date: Date, days: number): Date {
  const next = new Date(date.getTime());
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * 构建日历日索引：
 * - 日程先按 [range.from, range.to] 展开重复出现，再按 startDate 的本地日键分桶
 * - 待办按 dueDate 的本地日键分桶（无 dueDate 忽略）
 */
export function buildDayIndex(
  todos: Todo[],
  events: Event[],
  range: { from: Date; to: Date }
): Map<string, DayIndexEntry> {
  const index = new Map<string, DayIndexEntry>();

  const ensure = (key: string): DayIndexEntry => {
    const existing = index.get(key);
    if (existing) return existing;
    const created: DayIndexEntry = { todos: [], events: [] };
    index.set(key, created);
    return created;
  };

  const expanded = expandOccurrences(events ?? [], range.from, range.to);
  for (const event of expanded) {
    const key = toDayKey(event.startDate);
    if (!key) continue;
    ensure(key).events.push(event);
  }

  for (const todo of todos ?? []) {
    if (!todo.dueDate) continue;
    const key = toDayKey(todo.dueDate);
    if (!key) continue;
    ensure(key).todos.push(todo);
  }

  return index;
}
