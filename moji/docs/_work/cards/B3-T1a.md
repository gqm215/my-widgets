# 【任务卡】B3-T1a

> 段位：B3 笔记增强 · 前半（公式渲染）。**无色板依赖，可与 D17 确认并行**。
> 状态：**进行中**（Worker-4）。

## 目标

公式渲染接入共享 Markdown 渲染链：remark-math + rehype-katex、KaTeX 字体本地打包、懒加载拆 chunk，离线零外部请求，verify + build 全绿。

## 背景

B2-T2 遗留项：Notes.tsx 与 TaskDetail.tsx 各持一份 react-markdown 组件映射（约 30 行重复）。本卡抽取共享 `MarkdownView` 组件并加公式能力；后续 B3-T1b（高亮/6 色，待 D17 拍板）在同一组件上追加白名单渲染。拍板决策：公式语法 `$行内$` / `$$块级$$`，存储原文，导出/搜索/同步零改动。

## 允许修改文件

- package.json（仅新增依赖：remark-math、rehype-katex、katex 及必要类型）
- src/components/markdown/MarkdownView.tsx（新建，共享渲染组件）
- src/pages/Notes.tsx（改用 MarkdownView，删除本地组件映射）
- src/components/todos/TaskDetail.tsx（改用 MarkdownView）
- vite.config.*（如需 manualChunks 拆公式 chunk）
- src/components/markdown/__tests__/（新建测试）；受影响的现有测试最小适配

## 禁止事项

- 不做高亮/颜色渲染（等 D17）、不做编辑器工具条（B3-T2）
- 不启用 rehype-raw；不引入其他 Markdown 插件（含 remark-gfm 保留现状）
- 不动清单栏/列表区/详情面板交互逻辑（TaskDetail 仅换渲染组件）
- 不改 types/store/storage/utils/hooks；不改决策文档（gaps-and-decisions.md / STATE.md 禁改）

## 实现要点

1. 抽取 `MarkdownView`：props 与现用法对齐（children 文本）；Notes 与 TaskDetail 都改为 import 共享组件，行为零变化（现有测试全绿）。
2. 公式：remark-math + rehype-katex；KaTeX CSS（katex/dist/katex.min.css）import 放在 MarkdownView 模块内，确保字体资产随其 chunk 走。
3. 懒加载：MarkdownView 用 React.lazy / 动态 import 拆独立 chunk，主包不含 katex；验证 build 产物 chunk 划分并在交接说明体积。
4. 离线验证：`npm run build` 后 grep dist 产物确认无外部字体 URL（如 fonts.gstatic / cdn）；katex 字体文件进 assets。
5. 测试：行内 `$E=mc^2$`、块级 `$$...$$` 渲染断言；无公式内容渲染回归不变；MarkdownView 在 Notes/TaskDetail 两处用法冒烟。
6. 兼容性边界：旧笔记内容（无公式）渲染结果必须与改造前一致（回归用例锁住）。

## 验收

1. verify + build 全绿；覆盖率四项不低于 STATE §5 中 B2-T3 记录值（以 STATE 为准）
2. dist 产物无外部字体/样式 URL
3. 交接：变更文件清单 + chunk 划分与体积说明 + 自验结果 + 未决问题
