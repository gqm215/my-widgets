import { PALETTE_COLORS, type PaletteKey } from '@/design/palette';

/**
 * 编辑器工具条语法插入纯函数（B3-T2）。
 *
 * 纯文本变换：不触碰 DOM、不感知 React——调用方把 textarea 的当前值与选区交给
 * applyInsert，拿回新值与新选区后自行写回受控组件（走既有防抖保存链）。
 * 存储仍是源码 Markdown（D6），此处只在原文上插入语法字符。
 */

export type ToolbarAction =
  | 'bold'
  | 'italic'
  | 'highlight'
  | 'list'
  | 'task'
  | 'inlineMath'
  | 'blockMath'
  /** 六色高亮（B3-T1b 白名单类名）：color:vermilion / rattan / teal / blue / lotus / gray */
  | `color:${PaletteKey}`;

export interface InsertResult {
  /** 新的完整文本 */
  text: string;
  /** 应用后的选区起点 */
  selStart: number;
  /** 应用后的选区终点 */
  selEnd: number;
}

/** 包裹型动作的语法对 */
interface WrapSpec {
  prefix: string;
  suffix: string;
}

/** 包裹型动作 → 语法对（颜色类名唯一事实源：palette.ts className） */
function getWrapSpec(action: ToolbarAction): WrapSpec | null {
  if (action.startsWith('color:')) {
    const color = PALETTE_COLORS.find((c) => c.key === action.slice(6));
    if (!color) return null; // 非 palette 键（防御性），动作忽略
    return { prefix: `<mark class="${color.className}">`, suffix: '</mark>' };
  }
  switch (action) {
    case 'bold':
      return { prefix: '**', suffix: '**' };
    case 'italic':
      return { prefix: '__', suffix: '__' };
    case 'highlight':
      return { prefix: '==', suffix: '==' };
    case 'inlineMath':
      return { prefix: '$', suffix: '$' };
    default:
      return null;
  }
}

/**
 * 包裹型动作：选中文本 → 前缀+选区+后缀（选区保持在内容上）；
 * 无选中 → 插入完整语法对，光标落在两段之间；选区外侧已是同款语法对
 * （重复触发防抖）→ 解除包裹，选区回到解除后的内容上。
 */
function applyWrap(spec: WrapSpec, text: string, selStart: number, selEnd: number): InsertResult {
  const { prefix, suffix } = spec;
  const alreadyWrapped =
    selStart >= prefix.length &&
    text.slice(selStart - prefix.length, selStart) === prefix &&
    text.slice(selEnd, selEnd + suffix.length) === suffix;
  if (alreadyWrapped) {
    const start = selStart - prefix.length;
    const unwrapped =
      text.slice(0, start) + text.slice(selStart, selEnd) + text.slice(selEnd + suffix.length);
    return { text: unwrapped, selStart: start, selEnd: start + (selEnd - selStart) };
  }
  const next =
    text.slice(0, selStart) + prefix + text.slice(selStart, selEnd) + suffix + text.slice(selEnd);
  return { text: next, selStart: selStart + prefix.length, selEnd: selEnd + prefix.length };
}

/**
 * 行前缀型动作（无序列表 / 待办）：在选区所在行行首插入前缀；
 * 行首已有相同前缀 → 幂等不重复（选区与文本原样返回）。
 */
function applyLinePrefix(
  prefix: string,
  text: string,
  selStart: number,
  selEnd: number,
): InsertResult {
  const lineStart = text.lastIndexOf('\n', selStart - 1) + 1;
  if (text.slice(lineStart, lineStart + prefix.length) === prefix) {
    return { text, selStart, selEnd };
  }
  const next = text.slice(0, lineStart) + prefix + text.slice(lineStart);
  return { text: next, selStart: selStart + prefix.length, selEnd: selEnd + prefix.length };
}

/** 语法插入入口：按动作返回新文本与新选区 */
export function applyInsert(
  action: ToolbarAction,
  text: string,
  selStart: number,
  selEnd: number,
): InsertResult {
  if (action === 'list') return applyLinePrefix('- ', text, selStart, selEnd);
  if (action === 'task') return applyLinePrefix('- [ ] ', text, selStart, selEnd);
  if (action === 'blockMath') return applyWrap({ prefix: '$$\n', suffix: '\n$$' }, text, selStart, selEnd);
  const spec = getWrapSpec(action);
  if (!spec) return { text, selStart, selEnd };
  return applyWrap(spec, text, selStart, selEnd);
}
