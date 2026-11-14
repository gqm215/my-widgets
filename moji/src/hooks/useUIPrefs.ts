import { useCallback, useEffect, useState } from 'react';

/**
 * 视图偏好（D8）：设备级 UI 偏好，独立 localStorage 键 `moji-ui-prefs`。
 *
 * - 不进 AppState、不参与数据导出（偏好是设备级的，数据是内容级的）
 * - 读写全程容错：非 JSON / 非对象 / 缺字段 / 字段类型非法一律回落默认
 * - 与 useTheme 同模式：state 为源，持久化在 effect 中完成
 */

export interface UIPrefs {
  /** 隐藏底部「已完成 / 已放弃」折叠分组（完全不显示） */
  hiddenCompleted: boolean;
}

export const UI_PREFS_KEY = 'moji-ui-prefs';

export const DEFAULT_UI_PREFS: UIPrefs = { hiddenCompleted: false };

function toBool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** 容错解析偏好 JSON；任何不合法形态都回落默认值 */
export function parseUIPrefs(raw: string | null): UIPrefs {
  if (!raw) return { ...DEFAULT_UI_PREFS };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ...DEFAULT_UI_PREFS };
    }
    const obj = parsed as Record<string, unknown>;
    return {
      hiddenCompleted: toBool(obj.hiddenCompleted, DEFAULT_UI_PREFS.hiddenCompleted),
    };
  } catch {
    return { ...DEFAULT_UI_PREFS };
  }
}

/** 视图偏好 hook：隐藏已完成开关等设备级 UI 偏好 */
export function useUIPrefs() {
  const [prefs, setPrefs] = useState<UIPrefs>(() =>
    parseUIPrefs(localStorage.getItem(UI_PREFS_KEY))
  );

  useEffect(() => {
    try {
      localStorage.setItem(UI_PREFS_KEY, JSON.stringify(prefs));
    } catch {
      // 存储不可用时保持内存态可用（与全局存储策略一致）
    }
  }, [prefs]);

  const updatePrefs = useCallback((patch: Partial<UIPrefs>) => {
    setPrefs((prev) => ({ ...prev, ...patch }));
  }, []);

  return { prefs, updatePrefs };
}
