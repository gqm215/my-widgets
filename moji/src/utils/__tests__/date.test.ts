import { describe, it, expect } from 'vitest';
import {
  toDate,
  toDayKey,
  parseDayKey,
  combineDateTime,
  formatDay,
  formatTime,
  isSameDayKey,
} from '@/utils/date';

/** 用本地时区构造 Date，避免测试机时区差异影响断言 */
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

function localKeyToParts(key: string): number[] {
  return key.split('-').map(Number);
}

describe('toDate', () => {
  it('Date 原样返回', () => {
    const date = localDate(2025, 7, 9, 12, 30);
    expect(toDate(date)?.getTime()).toBe(date.getTime());
  });

  it('ISO 字符串解析为 Date', () => {
    const date = localDate(2025, 7, 9, 12, 30);
    expect(toDate(date.toISOString())?.getTime()).toBe(date.getTime());
  });

  it('日键按本地零点解析', () => {
    const parsed = toDate('2025-07-09');
    expect(parsed?.getFullYear()).toBe(2025);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(9);
    expect(parsed?.getHours()).toBe(0);
  });

  it('空值与非法值返回 null', () => {
    expect(toDate(null)).toBeNull();
    expect(toDate(undefined)).toBeNull();
    expect(toDate('')).toBeNull();
    expect(toDate('   ')).toBeNull();
    expect(toDate('not-a-date')).toBeNull();
    expect(toDate(new Date(NaN))).toBeNull();
    expect(toDate(1234567890 as unknown as string)).toBeNull();
  });

  it('非法日键返回 null', () => {
    expect(toDate('2025-02-30')).toBeNull();
    expect(toDate('2025-13-01')).toBeNull();
  });
});

describe('toDayKey', () => {
  it('Date 转为本地日键', () => {
    expect(toDayKey(localDate(2025, 7, 9, 23, 59, 59))).toBe('2025-07-09');
    expect(toDayKey(localDate(2025, 1, 1, 0, 0, 0))).toBe('2025-01-01');
  });

  it('ISO 字符串按本地时区归日', () => {
    const date = localDate(2025, 7, 9, 0, 30);
    expect(toDayKey(date.toISOString())).toBe('2025-07-09');
  });

  it('日键字符串原样返回', () => {
    expect(toDayKey('2025-07-09')).toBe('2025-07-09');
  });

  it('空值 / 非法值 / 非法日键返回空字符串', () => {
    expect(toDayKey(null)).toBe('');
    expect(toDayKey(undefined)).toBe('');
    expect(toDayKey('')).toBe('');
    expect(toDayKey('not-a-date')).toBe('');
    expect(toDayKey('2025-02-30')).toBe('');
    expect(toDayKey(new Date(NaN))).toBe('');
  });

  it('跨时区的 ISO 会落到本地日', () => {
    // 构造一个「本地 23:30」的时刻，其 ISO 可能落在 UTC 另一天
    const date = localDate(2025, 7, 9, 23, 30);
    expect(toDayKey(date)).toBe('2025-07-09');
    expect(toDayKey(date.toISOString())).toBe('2025-07-09');
  });
});

describe('parseDayKey', () => {
  it('返回本地零点', () => {
    const date = parseDayKey('2025-07-09');
    expect(date.getFullYear()).toBe(2025);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(9);
    expect(date.getHours()).toBe(0);
    expect(date.getMinutes()).toBe(0);
    expect(date.getSeconds()).toBe(0);
    expect(date.getMilliseconds()).toBe(0);
  });

  it('非法 key 返回 Invalid Date', () => {
    expect(Number.isNaN(parseDayKey('bad').getTime())).toBe(true);
    expect(Number.isNaN(parseDayKey('2025-7-9').getTime())).toBe(true);
    expect(Number.isNaN(parseDayKey('2025-02-30').getTime())).toBe(true);
    expect(Number.isNaN(parseDayKey('2025-13-01').getTime())).toBe(true);
    expect(Number.isNaN(parseDayKey('').getTime())).toBe(true);
    expect(Number.isNaN(parseDayKey(null as unknown as string).getTime())).toBe(true);
  });
});

describe('combineDateTime', () => {
  it('组合本地日键与时间为 ISO', () => {
    const iso = combineDateTime('2025-07-09', '09:30');
    expect(iso).toBe(localDate(2025, 7, 9, 9, 30).toISOString());
  });

  it('缺省时间为 00:00', () => {
    expect(combineDateTime('2025-07-09')).toBe(localDate(2025, 7, 9).toISOString());
  });

  it('支持 HH:mm:ss', () => {
    expect(combineDateTime('2025-07-09', '09:30:15')).toBe(
      localDate(2025, 7, 9, 9, 30, 15).toISOString()
    );
  });

  it('非法日键返回空字符串', () => {
    expect(combineDateTime('bad', '09:30')).toBe('');
    expect(combineDateTime('2025-02-30', '09:30')).toBe('');
  });

  it('非法时间返回空字符串', () => {
    expect(combineDateTime('2025-07-09', '9')).toBe('');
    expect(combineDateTime('2025-07-09', '24:00')).toBe('');
    expect(combineDateTime('2025-07-09', '12:60')).toBe('');
    expect(combineDateTime('2025-07-09', '12:00:60')).toBe('');
    expect(combineDateTime('2025-07-09', '')).toBe('');
  });
});

describe('formatDay', () => {
  it('格式化 Date 与 ISO 为 yyyy-MM-dd', () => {
    const date = localDate(2025, 7, 9, 18, 45);
    expect(formatDay(date)).toBe('2025-07-09');
    expect(formatDay(date.toISOString())).toBe('2025-07-09');
  });

  it('非法输入返回空字符串', () => {
    expect(formatDay('')).toBe('');
    expect(formatDay('bad')).toBe('');
    expect(formatDay(null as unknown as string)).toBe('');
  });
});

describe('formatTime', () => {
  it('格式化为 HH:mm', () => {
    const date = localDate(2025, 7, 9, 9, 5);
    expect(formatTime(date)).toBe('09:05');
    expect(formatTime(date.toISOString())).toBe('09:05');
    expect(formatTime(localDate(2025, 7, 9, 23, 59))).toBe('23:59');
  });

  it('日键按本地零点处理', () => {
    expect(formatTime('2025-07-09')).toBe('00:00');
  });

  it('非法输入返回空字符串', () => {
    expect(formatTime('')).toBe('');
    expect(formatTime('bad')).toBe('');
    expect(formatTime(null as unknown as string)).toBe('');
  });
});

describe('isSameDayKey', () => {
  it('同一天不同时刻返回 true', () => {
    expect(isSameDayKey(localDate(2025, 7, 9, 0, 1), localDate(2025, 7, 9, 23, 59))).toBe(true);
    expect(isSameDayKey('2025-07-09', localDate(2025, 7, 9, 12))).toBe(true);
  });

  it('不同天返回 false', () => {
    expect(isSameDayKey('2025-07-09', '2025-07-10')).toBe(false);
    expect(isSameDayKey(localDate(2025, 7, 8), '2025-07-09')).toBe(false);
  });

  it('任一为空或非法返回 false', () => {
    expect(isSameDayKey(null, '2025-07-09')).toBe(false);
    expect(isSameDayKey('2025-07-09', undefined)).toBe(false);
    expect(isSameDayKey('bad', '2025-07-09')).toBe(false);
    expect(isSameDayKey('', '')).toBe(false);
  });
});

describe('日键与时区边界', () => {
  it('toDayKey 与 parseDayKey 往返一致', () => {
    ['2025-01-01', '2025-02-28', '2025-12-31', '2024-02-29'].forEach((key) => {
      const date = parseDayKey(key);
      expect(Number.isNaN(date.getTime())).toBe(false);
      expect(toDayKey(date)).toBe(key);
      const [year, month, day] = localKeyToParts(key);
      expect(date.getFullYear()).toBe(year);
      expect(date.getMonth() + 1).toBe(month);
      expect(date.getDate()).toBe(day);
    });
  });

  it('combineDateTime 与 toDayKey / formatTime 互相印证', () => {
    const iso = combineDateTime('2025-07-09', '23:45');
    expect(toDayKey(iso)).toBe('2025-07-09');
    expect(formatTime(iso)).toBe('23:45');
  });
});
