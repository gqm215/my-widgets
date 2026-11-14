import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DEFAULT_UI_PREFS, UI_PREFS_KEY, parseUIPrefs, useUIPrefs } from '@/hooks/useUIPrefs';

describe('parseUIPrefs', () => {
  it('空值返回默认', () => {
    expect(parseUIPrefs(null)).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('')).toEqual(DEFAULT_UI_PREFS);
  });

  it('解析合法 JSON', () => {
    expect(parseUIPrefs('{"hiddenCompleted":true}')).toEqual({ hiddenCompleted: true });
    expect(parseUIPrefs('{"hiddenCompleted":false}')).toEqual({ hiddenCompleted: false });
  });

  it('非法 JSON 回落默认', () => {
    expect(parseUIPrefs('not-json{')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('{{{')).toEqual(DEFAULT_UI_PREFS);
  });

  it('非对象 JSON（数组/字符串/数字/null）回落默认', () => {
    expect(parseUIPrefs('[]')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('"x"')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('42')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('null')).toEqual(DEFAULT_UI_PREFS);
  });

  it('字段缺失或类型非法回落对应默认', () => {
    expect(parseUIPrefs('{}')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('{"hiddenCompleted":"yes"}')).toEqual(DEFAULT_UI_PREFS);
    expect(parseUIPrefs('{"hiddenCompleted":1}')).toEqual(DEFAULT_UI_PREFS);
  });

  it('未知字段被忽略', () => {
    expect(parseUIPrefs('{"hiddenCompleted":true,"other":1}')).toEqual({ hiddenCompleted: true });
  });
});

describe('useUIPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('无存储时返回默认值', () => {
    const { result } = renderHook(() => useUIPrefs());
    expect(result.current.prefs).toEqual(DEFAULT_UI_PREFS);
  });

  it('读取已持久化的偏好', () => {
    localStorage.setItem(UI_PREFS_KEY, JSON.stringify({ hiddenCompleted: true }));
    const { result } = renderHook(() => useUIPrefs());
    expect(result.current.prefs.hiddenCompleted).toBe(true);
  });

  it('损坏数据回落默认', () => {
    localStorage.setItem(UI_PREFS_KEY, '{{{');
    const { result } = renderHook(() => useUIPrefs());
    expect(result.current.prefs).toEqual(DEFAULT_UI_PREFS);
  });

  it('updatePrefs 更新并持久化到 moji-ui-prefs', () => {
    const { result } = renderHook(() => useUIPrefs());
    act(() => result.current.updatePrefs({ hiddenCompleted: true }));
    expect(result.current.prefs.hiddenCompleted).toBe(true);
    expect(JSON.parse(localStorage.getItem(UI_PREFS_KEY) ?? '')).toEqual({ hiddenCompleted: true });
    act(() => result.current.updatePrefs({ hiddenCompleted: false }));
    expect(result.current.prefs.hiddenCompleted).toBe(false);
    expect(JSON.parse(localStorage.getItem(UI_PREFS_KEY) ?? '')).toEqual({ hiddenCompleted: false });
  });

  it('存储不可用时保持内存态可用', () => {
    const { result } = renderHook(() => useUIPrefs());
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });
    act(() => result.current.updatePrefs({ hiddenCompleted: true }));
    expect(result.current.prefs.hiddenCompleted).toBe(true);
  });
});
