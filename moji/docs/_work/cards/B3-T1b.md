# 【任务卡】B3-T1b

> 段位：B3 笔记增强 · 后半（高亮与 6 色渲染）。状态：**待领**（B3-T1a 交回 MarkdownView 后派发）。
> 决策依据：D17 暂定拍板（2026-11-14）、已拍板笔记增强项（L1 高亮/颜色白名单）。

## 目标

`==文字==` 高亮与 6 色类名白名单渲染接入共享 MarkdownView：仅放行 `mark/span` + 6 个 `c-*` 类名，拒绝任意 style/事件属性/脚本；暗色自适应；verify + build 全绿。

## 允许修改文件

- package.json（如需 rehype-raw + rehype-sanitize 或自研轻量处理，优先自研避免依赖膨胀——Worker 评估后在交接说明取舍）
- src/components/markdown/MarkdownView.tsx（追加高亮/颜色渲染）
- src/components/markdown/__tests__/*（含 XSS 用例）
- src/index.css / tailwind.config.js（`c-*` 类的亮暗样式；palette.ts 令牌已在 B2-F1 落地，只消费不改）
- docs/design.md（§4.11 或笔记相关节补高亮/颜色规范）

## 禁止事项

- 不改 src/design/palette.ts（B2-F1 产出，只 import）
- 不启用无白名单的 rehype-raw 裸 HTML；不新增 UI/工具条（B3-T2）
- 不改 Notes 编辑器逻辑、Todo 详情逻辑（渲染层之上不动）
- 不改决策文档

## 实现要点

1. `==文字==` → `<mark>`（默认高亮，无色名；亮色 paper-accent 底 / 暗色 ink-700 底），自研 remark 文本节点插件或等价轻量实现，不跨节点误伤。
2. `<mark class="c-*">` / `<span class="c-*">` 白名单：仅 6 个类名（palette.ts 的 className 集合），其余类名剥除；`style`/`onerror`/`onclick`/`script`/`iframe` 等一律剥离；未知标签剥离标签保文本。
3. `c-*` 亮暗样式：文字色/高亮底色按 D17 暗色 light 变体自适应（CSS 类实现，不改存储）。
4. 测试（重点 XSS）：`<script>alert(1)</script>`、`<img onerror=...>`、`style="..."`、非白名单类名、大小写混淆 —— 全部剥离断言；6 类名渲染正确；`==高亮==` 正反用例；旧笔记（无 HTML）渲染回归不变。

## 验收

1. verify + build 全绿；覆盖率只升不降（下限 = 派卡时 STATE §5 最新记录）
2. XSS 用例全过（渲染输出无脚本/无内联事件/无 style）
3. 交接：变更文件清单 + 白名单实现方案说明（自研 vs sanitize 库取舍）+ 自验结果 + 未决问题
