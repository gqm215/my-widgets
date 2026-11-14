import { describe, it, expect } from 'vitest';
import {
  PALETTE_COLORS,
  PALETTE_LIGHT_VARIANTS,
  DEFAULT_LIST_COLOR,
} from '@/design/palette';

const HEX_RE = /^#[0-9a-f]{6}$/;

describe('palette 六色唯一事实源', () => {
  it('共六色，key / 中文名 / 语义类名按序一一对应', () => {
    expect(PALETTE_COLORS).toHaveLength(6);
    expect(PALETTE_COLORS.map((c) => c.key)).toEqual([
      'vermilion',
      'rattan',
      'teal',
      'blue',
      'lotus',
      'gray',
    ]);
    expect(PALETTE_COLORS.map((c) => c.name)).toEqual(['朱砂', '藤黄', '青碧', '黛蓝', '藕荷', '墨灰']);
    expect(PALETTE_COLORS.map((c) => c.className)).toEqual([
      'c-vermilion',
      'c-rattan',
      'c-teal',
      'c-blue',
      'c-lotus',
      'c-gray',
    ]);
  });

  it('hex 均为小写六位格式、互不相同且与令牌表同值', () => {
    const hexes = PALETTE_COLORS.map((c) => c.hex);
    hexes.forEach((hex) => expect(hex).toMatch(HEX_RE));
    expect(new Set(hexes).size).toBe(6);
    expect(hexes).toEqual(['#c94043', '#d4a84b', '#5a9e89', '#4a6b8a', '#b48a9a', '#4a4a4a']);
  });

  it('暗色 light 变体全六色覆盖，值与 tailwind {key}-light 令牌一致', () => {
    expect(PALETTE_LIGHT_VARIANTS).toEqual({
      vermilion: '#e85a5d',
      rattan: '#f0c86c',
      teal: '#83bfa9',
      blue: '#7f9ab5',
      lotus: '#c9a1b0',
      gray: '#c2c2c2',
    });
    PALETTE_COLORS.forEach((c) => {
      expect(c.darkHex).toMatch(HEX_RE);
      expect(PALETTE_LIGHT_VARIANTS[c.key]).toBe(c.darkHex);
    });
  });

  it('语义类名唯一且恒为 c-{key}（笔记高亮白名单契约）', () => {
    const classNames = PALETTE_COLORS.map((c) => c.className);
    expect(new Set(classNames).size).toBe(6);
    PALETTE_COLORS.forEach((c) => {
      expect(c.className).toBe(`c-${c.key}`);
    });
  });

  it('新建清单默认色为墨灰', () => {
    expect(DEFAULT_LIST_COLOR).toBe('#4a4a4a');
    expect(PALETTE_COLORS.find((c) => c.key === 'gray')?.hex).toBe(DEFAULT_LIST_COLOR);
  });
});
