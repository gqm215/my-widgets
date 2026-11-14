import { Suspense, lazy } from 'react';

/**
 * 共享 Markdown 渲染视图（B3-T1a）。
 *
 * 抽取自 Notes.tsx / TaskDetail.tsx 各自持有的 react-markdown 组件映射（B2-T2 遗留项），
 * 渲染链：react-markdown + remark-gfm（D6 现状）+ remark-math / rehype-katex（B3 公式）。
 * 不启用 rehype-raw（B3 白名单渲染另批处理；高亮/6 色等 D17 拍板后在 B3-T1b 追加）。
 *
 * 公式语法：`$行内$` / `$$块级$$`；存储原文，导出/搜索/同步零改动。
 *
 * 懒加载：本文件是同步薄壳（可被页面安全静态引入），react-markdown 全链路与
 * KaTeX（含字体资产）经 React.lazy 拆进独立 chunk，首屏主包不含 katex。
 *
 * variant：改造前 Notes（D6 原始排版）与 TaskDetail（B2-T2 紧凑排版）两份映射的
 * 字号/间距类名并不逐字相同（详情栏为窄面板设计），为满足「渲染结果与改造前一致」
 * 逐字保留两套类名，按调用方选择档位。
 */
export type MarkdownViewVariant = 'note' | 'detail';

export interface MarkdownViewProps {
  /** Markdown 原文（空内容由调用方提供占位文案，与改造前用法一致） */
  children?: string;
  /** 排版档位：'note' 笔记预览（默认）/'detail' 任务详情紧凑排版 */
  variant?: MarkdownViewVariant;
}

// 公式链与渲染器整体懒加载：katex 及其依赖进独立 chunk，不进首屏主包
const MarkdownViewImpl = lazy(() => import('./MarkdownViewImpl'));

export default function MarkdownView({ children, variant = 'note' }: MarkdownViewProps) {
  return (
    <Suspense fallback={null}>
      <MarkdownViewImpl variant={variant}>{children}</MarkdownViewImpl>
    </Suspense>
  );
}
