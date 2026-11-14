import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// KaTeX 样式与字体资产随本模块打包：经 MarkdownView 的 React.lazy 拆进独立 chunk，
// 字体走本地 assets（离线零外部请求）
import 'katex/dist/katex.min.css';
import { PALETTE_COLORS } from '@/design/palette';
import type {
  HTML as MdastHtml,
  Nodes as MdastNodes,
  Root as MdastRoot,
  Text as MdastText,
} from 'mdast';
import type { Element as HastElement, Nodes as HastNodes, Root as HastRoot } from 'hast';
import type { MarkdownViewProps, MarkdownViewVariant } from './MarkdownView';

/* ---------- 排版档位：逐字保留改造前两处各自的类名（渲染结果零变化） ---------- */

const MD_TEXT = 'text-ink-700 dark:text-ink-100';
const MD_MUTED = 'text-ink-500 dark:text-ink-200';

/** variant 间存在差异的段落级排版（字号/间距），其余元素两处一致 */
const TYPOGRAPHY: Record<
  MarkdownViewVariant,
  { p: string; h1: string; h2: string; h3: string; blockquote: string; pre: string }
> = {
  // Notes.tsx 预览（D6 原始排版）
  note: {
    p: 'mb-4',
    h1: 'text-2xl font-serif font-semibold mb-4 mt-6',
    h2: 'text-xl font-serif font-semibold mb-3 mt-5',
    h3: 'text-lg font-serif font-semibold mb-2 mt-4',
    blockquote: 'mb-4',
    pre: 'p-4 rounded-lg overflow-x-auto mb-4',
  },
  // TaskDetail.tsx 描述预览（B2-T2 紧凑排版，窄面板）
  detail: {
    p: 'mb-3 last:mb-0',
    h1: 'text-xl font-serif font-semibold mb-3 mt-4',
    h2: 'text-lg font-serif font-semibold mb-2 mt-4',
    h3: 'text-base font-serif font-semibold mb-2 mt-3',
    blockquote: 'mb-3',
    pre: 'p-3 rounded-lg overflow-x-auto mb-3',
  },
};

function buildMarkdownComponents(variant: MarkdownViewVariant): Components {
  const t = TYPOGRAPHY[variant];
  return {
    p: ({ children }) => <p className={`${MD_TEXT} ${t.p}`}>{children}</p>,
    h1: ({ children }) => <h1 className={`${MD_TEXT} ${t.h1}`}>{children}</h1>,
    h2: ({ children }) => <h2 className={`${MD_TEXT} ${t.h2}`}>{children}</h2>,
    h3: ({ children }) => <h3 className={`${MD_TEXT} ${t.h3}`}>{children}</h3>,
    li: ({ children }) => <li className={`${MD_TEXT} mb-1`}>{children}</li>,
    blockquote: ({ children }) => (
      <blockquote
        className={`${MD_MUTED} border-l-4 border-ink-300 dark:border-ink-600 pl-4 italic ${t.blockquote}`}
      >
        {children}
      </blockquote>
    ),
    code: ({ children }) => (
      <code className="bg-paper-dark dark:bg-ink-700 text-ink-700 dark:text-ink-100 px-1 py-0.5 rounded text-sm">
        {children}
      </code>
    ),
    pre: ({ children }) => (
      <pre className={`bg-black text-ink-100 ${t.pre}`}>{children}</pre>
    ),
    a: ({ children, href }) => (
      <a
        href={href}
        className="text-rattan dark:text-rattan-light underline"
        target="_blank"
        rel="noreferrer"
      >
        {children}
      </a>
    ),
  };
}

/** 模块级构建一次，两档位映射对象稳定复用 */
const COMPONENTS_BY_VARIANT: Record<MarkdownViewVariant, Components> = {
  note: buildMarkdownComponents('note'),
  detail: buildMarkdownComponents('detail'),
};

/* =====================================================================
 * B3-T1b：==文字== 高亮 + 六色类名白名单（自研轻量处理，不引入
 * rehype-raw / rehype-sanitize 依赖）。
 *
 * 白名单规则：
 * - 仅放行 mark / span 两个标签 + palette.ts 的 6 个 c-* 语义类名；
 * - 除 class 外不解析任何属性（style / onerror / href / src 等 URL 属性
 *   一律不存在于输出，javascript: 协议无从注入）；
 * - 白名单外类名剥除、未知标签剥标签保文本；script/style/iframe 等
 *   危险标签连同内容整体剥除（大小写混淆经 toLowerCase 归一拦截）。
 * ===================================================================== */

/* ---------- 一、remark 插件：==文字== → <mark>（文本节点内配对，不跨节点误伤） ---------- */

/** 找出 value 中所有「恰好两个等号」的定界符起始位置（=== / ==== 等长 run 一律字面） */
function findEqDelimiters(value: string): number[] {
  const positions: number[] = [];
  let i = 0;
  while (i < value.length) {
    if (value[i] !== '=') {
      i += 1;
      continue;
    }
    let runEnd = i;
    while (value[runEnd] === '=') runEnd += 1;
    if (runEnd - i === 2) positions.push(i);
    i = runEnd;
  }
  return positions;
}

/** 开侧：定界符后一位存在且非空白；闭侧：定界符前一位存在且非空白
 *  （闭侧仅在配对时调用，定界符前必有内容，无需越界保护） */
function isHighlightOpener(value: string, delim: number): boolean {
  return delim + 2 < value.length && !/\s/.test(value[delim + 2]);
}
function isHighlightCloser(value: string, delim: number): boolean {
  return !/\s/.test(value[delim - 1]);
}

/** 最小配对（CommonMark 强调语义）：闭侧消耗最近未配对的开侧；闭侧不再兼任
 *  下一段的开侧（==甲==与==乙== 只高亮甲/乙，中间字面保持）。开侧未遇合法
 *  闭侧则保持字面。定界符是「恰好两个等号」的 run，配对内容必非空。 */
function findHighlightPairs(value: string, delimiters: number[]): Array<[number, number]> {
  const pairs: Array<[number, number]> = [];
  let pendingOpen = -1;
  for (const delim of delimiters) {
    if (pendingOpen >= 0 && isHighlightCloser(value, delim)) {
      pairs.push([pendingOpen, delim]);
      pendingOpen = -1;
    } else if (pendingOpen < 0 && isHighlightOpener(value, delim)) {
      pendingOpen = delim;
    }
  }
  return pairs;
}

/** 把文本节点按配对切成 [html(<mark>) / text / html(</mark>)] 序列；无配对返回 null */
function splitTextByHighlight(value: string): Array<MdastText | MdastHtml> | null {
  const pairs = findHighlightPairs(value, findEqDelimiters(value));
  if (pairs.length === 0) return null;
  const parts: Array<MdastText | MdastHtml> = [];
  let cursor = 0;
  for (const [open, close] of pairs) {
    if (open > cursor) parts.push({ type: 'text', value: value.slice(cursor, open) });
    parts.push({ type: 'html', value: '<mark>' });
    parts.push({ type: 'text', value: value.slice(open + 2, close) });
    parts.push({ type: 'html', value: '</mark>' });
    cursor = close + 2;
  }
  if (cursor < value.length) parts.push({ type: 'text', value: value.slice(cursor) });
  return parts;
}

type MdastParent = { children: MdastNodes[] };

function isMdastParent(node: MdastNodes): node is MdastNodes & MdastParent {
  return Array.isArray((node as MdastNodes & MdastParent).children);
}

/**
 * 跨节点补配对：remark-math 是解析期扩展（micromark 扩展先于任何 transformer），
 * `==$x$==` 到达本插件时已被切成 [text '==', inlineMath, text '==']。
 * 本通道在同父节点的子序列内补齐这类配对：开侧 = 以 == 结尾的 text 节点
 * （后随内联内容节点），闭侧 = 以 == 开头的 text 节点；中间内容保持原样
 * （公式/行内代码等被整体包进 mark）。不同段落属于不同父节点，不会跨段误配。
 *
 * 两阶段执行：先只收集候选并贪心配对（不改动数组，未配对开侧保持字面不误伤），
 * 再按下标降序统一改造（splice 不影响未处理的更小下标）。
 * 开侧要求 == 与本节点前文紧邻（保守防误伤）；闭侧只要求 == 恰为两个等号
 * （与单节点配对的闭侧规则一致：只看定界符前是否紧邻内容，后随文本自由）。
 */
interface CrossPair {
  openIdx: number;
  openExact: boolean;
  closeIdx: number;
  closeExact: boolean;
}

function applyCrossNodeHighlight(children: MdastNodes[]): void {
  const pairs: CrossPair[] = [];
  let pending: { index: number; exact: boolean } | null = null;
  for (let i = 0; i < children.length; i += 1) {
    const child = children[i];
    if (child.type !== 'text') continue;
    const v = (child as MdastText).value;
    if (pending === null) {
      if (v === '==') {
        pending = { index: i, exact: true };
      } else if (v.length > 2 && v.endsWith('==') && !/[\s=]/.test(v[v.length - 3])) {
        pending = { index: i, exact: false };
      }
    } else if (v === '==') {
      pairs.push({ openIdx: pending.index, openExact: pending.exact, closeIdx: i, closeExact: true });
      pending = null;
    } else if (v.startsWith('==') && v[2] !== '=') {
      pairs.push({ openIdx: pending.index, openExact: pending.exact, closeIdx: i, closeExact: false });
      pending = null;
    }
  }
  for (let p = pairs.length - 1; p >= 0; p -= 1) {
    const { openIdx, openExact, closeIdx, closeExact } = pairs[p];
    if (closeExact) {
      children[closeIdx] = { type: 'html', value: '</mark>' };
    } else {
      const v = (children[closeIdx] as MdastText).value;
      children.splice(
        closeIdx,
        1,
        { type: 'html', value: '</mark>' },
        { type: 'text', value: v.slice(2) },
      );
    }
    if (openExact) {
      children[openIdx] = { type: 'html', value: '<mark>' };
    } else {
      const v = (children[openIdx] as MdastText).value;
      children.splice(
        openIdx,
        1,
        { type: 'text', value: v.slice(0, v.length - 2) },
        { type: 'html', value: '<mark>' },
      );
    }
  }
}

/** 深度优先替换：仅处理 text 节点（code/inlineCode/math 等携带原语义的节点天然免疫） */
function walkMdastForHighlight(node: MdastNodes): void {
  if (!isMdastParent(node)) return;
  const children = node.children as MdastNodes[];
  for (let i = children.length - 1; i >= 0; i -= 1) {
    const child = children[i];
    if (child.type === 'text') {
      const parts = splitTextByHighlight((child as MdastText).value);
      if (parts) children.splice(i, 1, ...parts);
    } else {
      walkMdastForHighlight(child);
    }
  }
  applyCrossNodeHighlight(children);
}

/** remark 插件：==文字== 高亮。须排在 remark-gfm 之前、可处理 math 切分后的节点序列，
 *  使 ==$公式$==、`==`行内代码`==` 等结构都能配对成 mark 并保留内层语义。 */
function remarkHighlightFromEquals() {
  return (tree: MdastRoot) => {
    walkMdastForHighlight(tree);
  };
}

/* ---------- 二、rehype 插件：raw HTML 白名单重建 ---------- */

const ALLOWED_TAGS = new Set(['mark', 'span']);
/** 白名单类名唯一来源：palette.ts（不硬编码） */
const ALLOWED_CLASSES = new Set(PALETTE_COLORS.map((c) => c.className));
/** 危险标签：剥标签同时剥内容（其内容非普通散文：脚本/样式/子文档/外链内容等） */
const DROP_CONTENT_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'template',
  'title',
  'textarea',
  'noscript',
  'noembed',
  'noframes',
  'xmp',
  'plaintext',
  'listing',
  'svg',
  'math',
]);

type HtmlToken =
  | { kind: 'text'; value: string }
  | { kind: 'comment' }
  | { kind: 'open'; tag: string; classes: string[]; selfClosing: boolean }
  | { kind: 'close'; tag: string };

/**
 * 迷你 HTML 分词器：只识别注释 / 声明 / 处理指令 / 开闭标签 / 文本，
 * 标签名统一小写（大小写混淆防护）；属性只提取 class。
 * 注释、CDATA、DOCTYPE、处理指令整体丢弃，文本原样保留（React 转义渲染）。
 */
const HTML_TOKEN_RE =
  /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<![a-zA-Z][^>]*>|<\?[\s\S]*?\?>|<\/([a-zA-Z][a-zA-Z0-9_-]*)\s*>|<([a-zA-Z][a-zA-Z0-9_-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;

function tokenizeHtml(source: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let lastIndex = 0;
  HTML_TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = HTML_TOKEN_RE.exec(source)) !== null) {
    if (match.index > lastIndex) {
      tokens.push({ kind: 'text', value: source.slice(lastIndex, match.index) });
    }
    if (match[1] !== undefined) {
      tokens.push({ kind: 'close', tag: match[1].toLowerCase() });
    } else if (match[2] !== undefined) {
      // 属性串（分组恒参与匹配，最短为空串）；只提取 class，其余属性一概不产出
      const attrs = match[3];
      const selfClosing = /\/\s*$/.test(attrs);
      const classMatch = /\bclass\s*=\s*("[^"]*"|'[^']*'|[^\s"'<>]+)/i.exec(attrs);
      const classValue = (classMatch?.[1] ?? '')
        .replace(/^"(.*)"$/, '$1')
        .replace(/^'(.*)'$/, '$1');
      const classes = classValue.split(/\s+/).filter(Boolean);
      tokens.push({ kind: 'open', tag: match[2].toLowerCase(), classes, selfClosing });
    } else {
      tokens.push({ kind: 'comment' });
    }
    lastIndex = HTML_TOKEN_RE.lastIndex;
  }
  if (lastIndex < source.length) {
    tokens.push({ kind: 'text', value: source.slice(lastIndex) });
  }
  return tokens;
}

/** 过滤出白名单类名（保序去重）；白名单外类名一律剥除 */
function filterAllowedClasses(classes: string[]): string[] {
  const allowed: string[] = [];
  for (const cls of classes) {
    if (ALLOWED_CLASSES.has(cls) && !allowed.includes(cls)) allowed.push(cls);
  }
  return allowed;
}

function lastIndexOfTag(stack: HastElement[], tag: string): number {
  for (let i = stack.length - 1; i >= 0; i -= 1) {
    if (stack[i].tagName === tag) return i;
  }
  return -1;
}

/**
 * 单个父节点的子序列状态机：raw 节点分词后重建为白名单元素 / 纯文本，
 * 其余 markdown 产物节点按所处状态流入输出或当前开着的白名单元素。
 * 兄弟节点层面的状态（如段落内 <script>text</script> 中间的文本节点）
 * 也被统一处理——危险标签开闭之间的所有兄弟内容一并丢弃。
 */
function rebuildChildrenWithWhitelist(children: HastNodes[]): HastNodes[] {
  const out: HastNodes[] = [];
  /** 已输出、等待闭合的白名单元素栈 */
  const stack: HastElement[] = [];
  /** 正在整体剥除内容的危险标签名；null = 不在剥除区 */
  let dropping: string | null = null;

  const append = (node: HastNodes) => {
    const top = stack[stack.length - 1];
    if (top) (top.children as HastNodes[]).push(node);
    else out.push(node);
  };

  const handleToken = (token: HtmlToken) => {
    if (dropping !== null) {
      if (token.kind === 'close' && token.tag === dropping) dropping = null;
      return;
    }
    if (token.kind === 'text') {
      append({ type: 'text', value: token.value });
      return;
    }
    if (token.kind === 'comment') return;
    if (token.kind === 'open') {
      if (DROP_CONTENT_TAGS.has(token.tag)) {
        dropping = token.tag;
        return;
      }
      if (!ALLOWED_TAGS.has(token.tag)) return; // 未知标签：剥标签保文本
      const element: HastElement = {
        type: 'element',
        tagName: token.tag,
        properties: {},
        children: [],
      };
      const allowed = filterAllowedClasses(token.classes);
      if (allowed.length > 0) element.properties = { className: allowed };
      append(element);
      if (!token.selfClosing) stack.push(element);
      return;
    }
    // close：白名单标签配对弹出（未配对内层一并自动闭合）；其余闭合忽略
    if (ALLOWED_TAGS.has(token.tag)) {
      const idx = lastIndexOfTag(stack, token.tag);
      if (idx >= 0) stack.length = idx;
    }
  };

  for (const child of children) {
    if (child.type === 'raw') {
      for (const token of tokenizeHtml(child.value)) handleToken(token);
    } else if (dropping !== null) {
      // 危险标签内容区（如段落内 <script> 与 </script> 之间的兄弟文本节点）
    } else {
      append(child);
    }
  }
  return out;
}

type HastParent = { children: HastNodes[] };

function isHastParent(node: HastNodes): node is HastNodes & HastParent {
  return Array.isArray((node as HastNodes & HastParent).children);
}

/** 深度优先：每个父节点子序列重建一次（重建产物只含 text/白名单元素，幂等） */
function walkHastForWhitelist(node: HastNodes): void {
  if (!isHastParent(node)) return;
  const parent = node as HastNodes & HastParent;
  parent.children = rebuildChildrenWithWhitelist(parent.children);
  for (const child of parent.children) walkHastForWhitelist(child);
}

/** rehype 插件：raw HTML 白名单重建。须排在 rehype-katex 之前，
 *  使 <mark class="c-*">包裹的行内公式先入元素再被 KaTeX 二次渲染。 */
function rehypeWhitelistRawHtml() {
  return (tree: HastRoot) => {
    walkHastForWhitelist(tree);
  };
}

/**
 * 重实现：react-markdown 全链路 + 公式插件 + KaTeX CSS（字体本地打包）。
 * 仅经 MarkdownView 的 React.lazy 动态加载，不进首屏主包。
 *
 * B3-T1b 渲染链顺序：==高亮==（remark，最先）→ gfm → math →
 * raw HTML 白名单（rehype，先于 KaTeX）→ KaTeX。
 */
export default function MarkdownViewImpl({ children, variant = 'note' }: MarkdownViewProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkHighlightFromEquals, remarkGfm, remarkMath]}
      rehypePlugins={[rehypeWhitelistRawHtml, rehypeKatex]}
      components={COMPONENTS_BY_VARIANT[variant]}
    >
      {children}
    </ReactMarkdown>
  );
}
