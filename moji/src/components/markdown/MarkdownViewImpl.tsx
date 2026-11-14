import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
// KaTeX 样式与字体资产随本模块打包：经 MarkdownView 的 React.lazy 拆进独立 chunk，
// 字体走本地 assets（离线零外部请求）
import 'katex/dist/katex.min.css';
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

/**
 * 重实现：react-markdown 全链路 + 公式插件 + KaTeX CSS（字体本地打包）。
 * 仅经 MarkdownView 的 React.lazy 动态加载，不进首屏主包。
 */
export default function MarkdownViewImpl({ children, variant = 'note' }: MarkdownViewProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={COMPONENTS_BY_VARIANT[variant]}
    >
      {children}
    </ReactMarkdown>
  );
}
