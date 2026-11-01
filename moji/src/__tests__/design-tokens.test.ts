import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

// tailwind.config.js 是纯 JS 配置（本仓库 tsconfig 未开 strict，可隐式 any 导入）
import tailwindConfig from '../../tailwind.config.js';

/**
 * 设计令牌回归测试。
 *
 * 背景：`dark:text-ink-200`、`dark:border-ink-600` 这类类名一旦在 tailwind 配置里
 * 不存在，Tailwind 会**静默丢弃**它们——暗色模式下文字就掉回亮色主题的颜色，
 * 在深色背景上几乎不可见（v1.1.0 的周报页就踩过这个坑）。
 *
 * 这里把「源码里用到的颜色令牌」和「配置里定义的令牌」对一遍，缺失即失败。
 */

const PROJECT_ROOT = process.cwd();
const SRC_ROOT = resolve(PROJECT_ROOT, 'src');
const SOURCE_EXTENSIONS = ['.ts', '.tsx'];

type ColorValue = string | Record<string, string>;

const colorConfig = (tailwindConfig as { theme: { extend: { colors: Record<string, ColorValue> } } }).theme
  .extend.colors;

/** 把 tailwind 配置里的颜色展平成全集：ink-800 / vermilion / vermilion-light / paper-dark … */
function collectDefinedTokens(): Set<string> {
  const tokens = new Set<string>();
  for (const [name, value] of Object.entries(colorConfig)) {
    if (typeof value === 'string') {
      tokens.add(name);
      continue;
    }
    for (const shade of Object.keys(value)) {
      tokens.add(`${name}-${shade}`);
    }
  }
  return tokens;
}

function collectSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = resolve(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      files.push(...collectSourceFiles(full));
      continue;
    }
    if (SOURCE_EXTENSIONS.some((ext) => entry.endsWith(ext))) files.push(full);
  }
  return files;
}

/** 颜色族（对应 tailwind 配置里的顶层键） */
const COLOR_FAMILIES = ['ink', 'paper', 'vermilion', 'rattan', 'success', 'warning', 'danger'];
// 注意：族名要做成非捕获分组再拼后缀，否则 `a|b|c-700` 的后缀只会作用在最后一个分支上。
// 前缀不含 shadow —— `shadow-paper-xl` 是 boxShadow 的名字，不是颜色令牌。
const TOKEN_PATTERN = new RegExp(
  `(?:text|bg|border|ring|from|via|to|fill|stroke|placeholder|divide|decoration|accent|caret)-(?:[a-z]+:)*((?:${COLOR_FAMILIES.join('|')})[a-z0-9-]*)`,
  'g',
);

describe('设计令牌', () => {
  it('源码里用到的颜色令牌都在 tailwind 配置里定义过', () => {
    const defined = collectDefinedTokens();
    const violations: string[] = [];

    for (const file of collectSourceFiles(SRC_ROOT)) {
      const relative = file.slice(PROJECT_ROOT.length + 1);
      const content = readFileSync(file, 'utf8');
      for (const match of content.matchAll(TOKEN_PATTERN)) {
        // 去掉可能带上的透明度和数字后缀（如 ink-800/60 已在正则里截住）
        const token = match[1];
        if (!defined.has(token)) {
          violations.push(`${relative}: ${match[0]} → 未定义令牌 "${token}"`);
        }
      }
    }

    expect(violations).toEqual([]);
  });

  it('ink 色阶连续（200 / 600 这类中间档不允许缺失）', () => {
    const inkShades = Object.keys(colorConfig.ink as Record<string, string>)
      .map(Number)
      .sort((a, b) => a - b);

    expect(inkShades).toEqual([100, 200, 300, 400, 500, 600, 700, 800, 900]);
  });
});
