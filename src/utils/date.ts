import { format, isValid } from 'date-fns';

/**
 * 日期工具（墨集日期契约）
 *
 * - Todo.dueDate：本地日键 `yyyy-MM-dd`
 * - Event.startDate / endDate：ISO 字符串
 * - 日键一律按「本地时区」解释，避免 `new Date('2025-01-01')` 按 UTC 解析导致的跨日偏移
 */

export const DAY_KEY_FORMAT = 'yyyy-MM-dd';
export const TIME_FORMAT = 'HH:mm';

/** 是否是 `yyyy-MM-dd` 形式的日键（分组依次为年/月/日） */
const DAY_KEY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
/** 是否是 `HH:mm` 或 `HH:mm:ss` 形式的时间串 */
const TIME_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

/**
 * 把任意输入转成合法 Date；空值与非法值返回 null。
 * 仅接受 Date 与字符串（ISO / 日键），不接受数字，避免把时间戳与 dayIndex 混淆。
 */
export function toDate(value: string | Date | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return isValid(value) ? value : null;
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text) return null;

  // 日键按本地零点解析，避免 UTC 偏移
  if (DAY_KEY_RE.test(text)) {
    const parsed = parseDayKey(text);
    return isValid(parsed) ? parsed : null;
  }

  const parsed = new Date(text);
  return isValid(parsed) ? parsed : null;
}

/**
 * 把 Date / ISO 字符串转成本地日键 `yyyy-MM-dd`。
 * 入参本身是日键时原样返回（校验合法后）；空值、非法值返回 ''。
 */
export function toDayKey(value: string | Date | null | undefined): string {
  if (typeof value === 'string' && DAY_KEY_RE.test(value.trim())) {
    const key = value.trim();
    return isValid(parseDayKey(key)) ? key : '';
  }
  const date = toDate(value);
  if (!date) return '';
  return format(date, DAY_KEY_FORMAT);
}

/**
 * 把本地日键 `yyyy-MM-dd` 解析为本地零点 Date。
 * 非法 key 返回 Invalid Date（调用方可用 Number.isNaN(date.getTime()) 防御）。
 */
export function parseDayKey(key: string): Date {
  if (typeof key !== 'string') return new Date(NaN);
  const match = DAY_KEY_RE.exec(key.trim());
  if (!match) return new Date(NaN);

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 0, 0, 0, 0);

  // 拒绝 2025-02-30 这类会被 Date 自动进位的日期
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(NaN);
  }
  return date;
}

/**
 * 把本地日键 + 本地时间（HH:mm[:ss]，缺省 00:00）组合为 ISO 字符串。
 * 任一参数非法返回 ''。
 */
export function combineDateTime(dayKey: string, time = '00:00'): string {
  const day = parseDayKey(dayKey);
  if (!isValid(day)) return '';

  const match = TIME_RE.exec((time ?? '').trim());
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  if (hours > 23 || minutes > 59 || seconds > 59) return '';

  const date = new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hours,
    minutes,
    seconds,
    0
  );
  if (!isValid(date)) return '';
  return date.toISOString();
}

/** 把 Date / ISO 字符串格式化为本地日键 `yyyy-MM-dd`；非法返回 '' */
export function formatDay(value: string | Date | null | undefined): string {
  return toDayKey(value);
}

/** 把 Date / ISO 字符串格式化为本地时间 `HH:mm`；非法返回 '' */
export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return '';
  return format(date, TIME_FORMAT);
}

/**
 * 判断两个值是否落在同一个本地日。
 * 日键、ISO 字符串、Date 均可；任一为空/非法返回 false。
 */
export function isSameDayKey(
  a: string | Date | null | undefined,
  b: string | Date | null | undefined
): boolean {
  const keyA = toDayKey(a);
  if (!keyA) return false;
  const keyB = toDayKey(b);
  if (!keyB) return false;
  return keyA === keyB;
}
