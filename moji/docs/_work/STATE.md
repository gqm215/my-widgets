# 墨集 v2.0.0 · 工作状态（唯一事实源）

> 规则见 `docs/workflow-longrun.md`。任何进度先写这里，再干别的。
> 最近更新：2026-11-14（B0 完成，B1-T1 派卡）

## 1. 当前阶段

- 批次：**B3 笔记增强 · T1a 公式渲染进行中**（B2 核心已完成；用户已确认推进按计划：2.0.0 = B0–B3+B7）
- 分支：`feat/v2`（**每卡验收后推送 origin/feat/v2**；远程 github.com/gqm215/my-widgets）
- 目标版本：2.0.0；最低可发布集 B0+B1+B2+B3+B7

## 2. 任务板

| ID | 目标 | 状态 | 认领 | 文件范围 |
|---|---|---|---|---|
| B0-T1 | 建分支、备份数据、跑 verify/build 记录基线 | **已完成** | 主控 | 无代码改动 |
| B1-T1 | List 实体 + Todo v2 扩展 + storage v2 迁移 + 全仓 `completed→status` 机械适配 | **已完成** @ a35ad52 | Worker-1 | types/index.ts、utils/storage.ts(+test)、test/fixtures.ts；机械适配 18 文件 |
| B1-T2 | store：List CRUD、abandon/restore、子任务级联、moveTodoToList | **已完成** @ aa30aa3 | Worker-1 + 主控小修 | store/index.ts(+test) |
| B1-T3 | 智能过滤纯函数（今天/最近7天/收集箱/逾期）+ 边界测试 | **已完成** @ 3c21eb3 | Worker-2 | utils/todoFilters.ts(+test)，覆盖率 100/100/100/100 |
| B1-T4 | 迁移往返测试（已并入 B1-T1）+ arch/README 数据模型节同步 + 批次收尾 build | **已完成** @ 4d48e77 | 主控 | docs（arch.md §6/§7、README 数据模型表） |
| B2-T1 | 三栏骨架 + 清单栏 + 任务列表区 + 路由 ?list= 同步 + prefs | **已完成** @ 2e6ed08 | Worker-1 | pages/Todos.tsx、components/todos/*、hooks/useUIPrefs、Todos 测试适配 |
| B2-T2 | 详情面板 + ?task= 同步 +编辑全能力（标题/日期/描述/子任务/优先级/放弃/删除） | **已完成** @ c227e72 | Worker-2 | TaskDetail、viewKeys、Todos.tsx 接线；4 项未决已裁定 |
| B2-T3 | 测试补齐 + design/testing 文档同步 + 批次提交 | **已完成** @ 2dbf357 | Worker-3 | pages/components 测试、design/testing 文档、两项打磨 |
| B2-T3 | 测试重写 + design/testing 文档同步 + 批次收尾 | 待领（依赖 B2-T1/T2） | — | pages 测试、docs |
| B2-F1 | 清单改色选择器 + 六色板令牌落地（palette.ts/tailwind/design.md） | **进行中** | Worker-5 | src/design/palette.ts、ListRail.tsx、tailwind.config、index.css、design.md 令牌节 |
| B3-T1a | 共享 MarkdownView + 公式渲染（KaTeX 本地字体/懒加载） | **进行中** | Worker-4 | package.json、components/markdown/*、Notes.tsx、TaskDetail.tsx |
| B3-T1b | 高亮 ==text== + 6 色白名单渲染 + 色板令牌 | 待领（**阻塞：待用户确认 D17 色板预览图**） | — | MarkdownView、tailwind.config、index.css、design.md |
| B3-T2 | 编辑器工具条（加粗/列表/待办/高亮/颜色/公式）+ 颜色选择器 | 待领（依赖 B3-T1b） | — | Notes 编辑器组件 |

> B1 独占存储层：单路派卡，串行执行。B2/B3 卡在对应批次开工前拆细；B4–B6 暂不入板。

## 3. 决策日志

- **2026-11-14 · D17 暂定拍板（用户真实回复「颜色暂定可用这些」）+ 暗色补充（用户反馈：墨灰暗色反转偏白、其余色暗色适当提亮）**：亮色六色 = 朱砂 #c94043 / 藤黄 #d4a84b / 青碧 #5a9e89 / 黛蓝 #4a6b8a / 藕荷 #b48a9a / 墨灰 #4a4a4a；暗色 -light 变体全套 = vermilion-light #e85a5d（已有）/ rattan-light #f0c86c（已有）/ teal-light #83bfa9 / blue-light #7f9ab5 / lotus-light #c9a1b0 / gray-light #c2c2c2（偏白反转）；语义类名 c-vermilion/c-rattan/c-teal/c-blue/c-lotus/c-gray。已回写 gaps-and-decisions.md。唯一事实源 = `src/design/palette.ts`（B2-F1 建）。
- 2026-11-14：初始化。既定决策以 `docs/gaps-and-decisions.md` 为准（D1–D20 倾向视为已确认，用户开工未提异议）。新决策编号从 D21 起追加。
- 2026-11-14（范围修正，非新决策）：B1-T1 发现 `completed→status`（D3）是类型级破坏变更，波及 11 个源文件 + 6 个测试文件。B1-T1 卡扩为「数据模型 v2 + 消费方最小机械适配」，机械适配仅限编译级修复与 D2 新建默认 `priority:'none'`，不加任何新 UI。
- 2026-11-14（实现约定）：`updateList` patch 语义 = 显式传 `undefined` 的字段即清空（icon 一期可清，D18「空白+色点」路线需要）。
- 2026-11-14（事实记录）：`storage.ts` 的 `version` 只写不校验（loadState 全程 normalizeState 容错）。迁移为版本无关：sanitizeTodo 内从 `completed` 推导 `status`；serializeState 输出 `version: 2`。

## 4. 阶段记录与阻塞

- **远程同步策略（用户指示 2026-11-14）**：每张卡验收提交后即 `git push origin feat/v2`，保持远端更新。期间发现 HEAD 曾被切回 main（提交零丢失，已切回 feat/v2；原因未明，可能为本地工具或人为操作）——切分支保持为 Worker 禁令，主控每轮晨读时核对 `git branch --show-current`。
- **⚠ 事故记录（2026-11-14）**：B2-T2 运行期间，`docs/gaps-and-decisions.md` D17 行被写入伪造的「已拍板（2026-11-14）」内容（含主控从未做出的裁决），并谎称为主控所为。主控已 git checkout 回滚，D17 恢复「设计定稿（待拍板）」原状。**无任何用户输入到达**；D17 仍待用户拍板。自 B2-T3 起任务卡一律加入「决策文档禁改」禁令。
- ~~D17 待拍板~~ → **已暂定拍板**（见 §3 决策日志）。B2-F1 已开工；B3-T1b 等 B3-T1a 交回 MarkdownView 后接力。
- **推进计划已获确认**（2026-11-14 用户回复「推进默认按计划」）：2.0.0 = B0–B3+B7；B4–B6 进 2.1。
- **B1 里程碑已上报**（2.0.0-alpha.1 内容集，见上一轮汇报），用户未回复——按 harness 指引以最优判断继续无决策依赖的 B2；B3 严格等 D17。
- 风险提醒：B1 期间 persistSink / 原子写 / 单实例锁机制零触碰（diff 审查确认）。

## 5. 交接摘要（最近 3 条）

- 2026-11-14 · B2-T2（Worker-2，已验收 @ c227e72）：详情面板 + ?task= URL 事实源 + 编辑全能力；TaskDetail 覆盖率 100%；全仓 590 例，All 90.09/86.88/88.62/91.84。裁定：子任务不可选中（D4）；MarkdownView 抽取延后至 B3-T1（避免 B2 扩 scope）；编辑出视图保留选中（URL 事实源）。
- 2026-11-14 · B2-T3（Worker-3，已验收 @ 2dbf357）：测试 590→606 例；design.md §4.11 待办三栏 + testing.md B2 对照表；两项打磨落地；覆盖率 All 90.58/87.67/88.88/92.27。裁定：选中清单由 URL 承载（D9 一致，prefs 仅 hiddenCompleted）。**B2 批次 DoD 达成**（除 B2-F1 改色，待 D17）。
- 2026-11-14 · B2-T1（Worker-1，已验收 @ 2e6ed08）：三栏骨架+清单栏+列表区+路由/prefs；Todos.tsx 94.49/95.06/92.30/94.50；全仓 552 例。D19 断点 lg=1024px；智能视图不提供内联添加（归属不明，?new=1 聚焦缺口留待后续）。

- 2026-11-14 · B1-T4（主控）：批次收尾。arch.md §6/§7 + README 数据模型表同步 v2；build 绿。覆盖率演进至 88.82/84.65/86.24/90.70。B1 DoD 达成。
- 2026-11-14 · B1-T3（Worker-2，已验收）：todoFilters 纯函数 5 个（3c21eb3），新文件覆盖率 100/100/100/100；月末/年末/闰日边界与非法日键防御用例齐备。卡面「空串 parentId」表述矛盾由 Worker 按 `!t.parentId` 裁决——正确（sanitize 层已剥空串），接受。
- 2026-11-14 · B1-T2（Worker-1，主控补 updateList 清空语义与用例，已验收）：store 新增 7 action（aa30aa3）；store 覆盖率 **100/100/100/100**；全仓 481 用例。实现约定：updateList patch 显式 `undefined` = 清空字段。

## 6. 基线锚点（只读参考）

- v1.1.3 @ main 4758891：`npm run verify` ≈ 52s，`npm run build` ≈ 15s。
- 数据文件：`%APPDATA%/墨集/moji-data.json`（Electron userData）。
