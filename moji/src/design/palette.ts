/**
 * 清单色板唯一事实源（六色，与 docs/design.md §2.1 令牌表及 tailwind.config.js 同值）。
 *
 * - 清单新建/改色选择器仅提供本数组六色；存量数据中六色之外的颜色照常显示色点。
 * - `className` 为语义类名（c-*），是笔记高亮类名白名单的唯一来源（B3-T1b 消费）。
 * - `darkHex` 为暗色模式提亮 hex（纸白偏深、墨底偏白，D17 暗色补充）：
 *   teal/blue/lotus/gray 为新增令牌（teal-light 等），vermilion/rattan 沿用 tailwind
 *   既有 `vermilion-light` / `rattan-light`。
 */

export type PaletteKey = 'vermilion' | 'rattan' | 'teal' | 'blue' | 'lotus' | 'gray';

export interface PaletteColor {
  /** 语义键 */
  key: PaletteKey;
  /** 中文名 */
  name: string;
  /** 纸白模式 hex（与 tailwind 同名令牌同值） */
  hex: string;
  /** 语义类名，笔记高亮白名单唯一来源 */
  className: string;
  /** 暗色模式提亮 hex（与 tailwind {key}-light 令牌同值） */
  darkHex: string;
}

export const PALETTE_COLORS: readonly PaletteColor[] = [
  { key: 'vermilion', name: '朱砂', hex: '#c94043', className: 'c-vermilion', darkHex: '#e85a5d' },
  { key: 'rattan', name: '藤黄', hex: '#d4a84b', className: 'c-rattan', darkHex: '#f0c86c' },
  { key: 'teal', name: '青碧', hex: '#5a9e89', className: 'c-teal', darkHex: '#83bfa9' },
  { key: 'blue', name: '黛蓝', hex: '#4a6b8a', className: 'c-blue', darkHex: '#7f9ab5' },
  { key: 'lotus', name: '藕荷', hex: '#b48a9a', className: 'c-lotus', darkHex: '#c9a1b0' },
  { key: 'gray', name: '墨灰', hex: '#4a4a4a', className: 'c-gray', darkHex: '#c2c2c2' },
];

/** 暗色 light 变体映射（key → 提亮 hex，全六色覆盖） */
export const PALETTE_LIGHT_VARIANTS: Readonly<Record<PaletteKey, string>> = Object.fromEntries(
  PALETTE_COLORS.map((c) => [c.key, c.darkHex]),
) as Record<PaletteKey, string>;

/** 新建清单默认色：墨灰 */
export const DEFAULT_LIST_COLOR: string = PALETTE_COLORS.find((c) => c.key === 'gray')!.hex;
