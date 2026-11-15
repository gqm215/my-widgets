# 墨集 v2.0.0 · 工作状态（唯一事实源）

> 规则见 `docs/workflow-longrun.md`。任何进度先写这里，再干别的。
> 最近更新：2026-11-14（B0 完成，B1-T1 派卡）

## 1. 当前阶段

- 批次：**v2.0.0 已发布** 🎉——feat/v2 已合入 main（816ecf5）、tag `v2.0.0` 已推送、GitHub Actions Release 构建中（verify → Electron/Tauri 产物 → GitHub Release）。发布后进入阶段三迭代（修复卡 F1–F3 + 新批次拆卡）
- 分支：`main`（HEAD 963fdb4；`feat/v2` 冻结于 v2.0.0 发布点 96793bd——下版本从 main 拉新分支）
- 目标版本：2.0.0 ✅（下版本规划：B4–B6 + 修复卡，需先过 D12/D13/D14/D16 决策）
- **目录规整规约（用户要求，2026-11-15）**：① 临时产物一律放仓库外或系统临时目录，不入仓、不留根目录；② QA/预览服务器用毕即停（TaskStop 后需核查端口回收，子进程可能存活）；③ 构建产物（dist/release/coverage/node_modules）保持 gitignored 不入库；④ `moji/docs/_work/` 只放工作流文件（STATE.md、cards/、预览存档），不堆杂物；⑤ 发现空目录与孤儿进程当轮清理；⑥ **发版镜像**：本地保留最新版 + 全部历史版安装包，放 `moji/release/<tag>/`（builder 输出目录，gitignored）；发版后跑 `node scripts/release-sync.cjs`（幂等，自动把 builder 根目录新产物归入版本子目录）。

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
| B2-F1 | 清单改色选择器 + 六色板令牌落地 | **已完成** @ 096cbc5 | Worker-5 + 主控对齐 | src/design/palette.ts、ListRail.tsx、tailwind.config、design.md |
| B3-T1a | 共享 MarkdownView + 公式渲染（KaTeX 本地字体/懒加载） | **已完成** @ 504b77f | Worker-4 | package.json、components/markdown/*、Notes.tsx、TaskDetail.tsx |
| B3-T1b | 高亮 ==text== + 6 色白名单渲染 | **已完成** @ d899cd2 | Worker-6 | MarkdownViewImpl、index.css、design.md §4.12 |
| B3-T2 | 编辑器工具条 + 快捷键（Notes + TaskDetail 描述编辑态） | **已完成** @ 4f4ecdf | Worker-6 | EditorToolbar、insertSyntax、Notes.tsx、TaskDetail.tsx |
| B3-T3 | B3 批次文档收尾（README/design/testing/CHANGELOG + QA 矩阵） | **已完成** @ c2fb2a4 | Worker-6 | README.md、design.md、testing.md、CHANGELOG.md |
| B7-T1 | Web 端手工 QA（浏览器自动化走查 20 条中可自动化项） | **已完成**（11 项自动化全过，详见 §5） | 主控 | 无代码改动 |
| B7-T2 | 版本号 2.0.0 + CHANGELOG 定稿 + tag/Release | **已完成**（用户已确认发布；桌面 QA 完成、版本定稿、merge main、tag） | 主控 | package.json、CHANGELOG、git tag |
| B3-T1a | 共享 MarkdownView + 公式渲染（KaTeX 本地字体/懒加载） | **进行中** | Worker-4 | package.json、components/markdown/*、Notes.tsx、TaskDetail.tsx |
| B3-T1b | 高亮 ==text== + 6 色白名单渲染（色板已落定，等 T1a 的 MarkdownView） | 待领（依赖 B3-T1a） | — | MarkdownView、index.css、design.md |
| B3-T2 | 编辑器工具条（加粗/列表/待办/高亮/颜色/公式）+ 颜色选择器 | 待领（依赖 B3-T1b） | — | Notes 编辑器组件 |

> B1 独占存储层：单路派卡，串行执行。B2/B3 卡在对应批次开工前拆细；B4–B6 暂不入板。

## 3. 决策日志

- **2026-11-14 · D17 暂定拍板（用户真实回复「颜色暂定可用这些」）+ 暗色补充（用户反馈：墨灰暗色反转偏白、其余色暗色适当提亮）**：亮色六色 = 朱砂 #c94043 / 藤黄 #d4a84b / 青碧 #5a9e89 / 黛蓝 #4a6b8a / 藕荷 #b48a9a / 墨灰 #4a4a4a；暗色 -light 变体全套 = vermilion-light #e85a5d（已有）/ rattan-light #f0c86c（已有）/ teal-light #83bfa9 / blue-light #7f9ab5 / lotus-light #c9a1b0 / gray-light #c2c2c2（偏白反转）；语义类名 c-vermilion/c-rattan/c-teal/c-blue/c-lotus/c-gray。已回写 gaps-and-decisions.md。唯一事实源 = `src/design/palette.ts`（B2-F1 建）。
- 2026-11-14：初始化。既定决策以 `docs/gaps-and-decisions.md` 为准（D1–D20 倾向视为已确认，用户开工未提异议）。新决策编号从 D21 起追加。
- 2026-11-14（范围修正，非新决策）：B1-T1 发现 `completed→status`（D3）是类型级破坏变更，波及 11 个源文件 + 6 个测试文件。B1-T1 卡扩为「数据模型 v2 + 消费方最小机械适配」，机械适配仅限编译级修复与 D2 新建默认 `priority:'none'`，不加任何新 UI。
- 2026-11-14（实现约定）：`updateList` patch 语义 = 显式传 `undefined` 的字段即清空（icon 一期可清，D18「空白+色点」路线需要）。
- 2026-11-14（事实记录）：`storage.ts` 的 `version` 只写不校验（loadState 全程 normalizeState 容错）。迁移为版本无关：sanitizeTodo 内从 `completed` 推导 `status`；serializeState 输出 `version: 2`。

## 4. 阶段记录与阻塞

- **发布收尾事项**：CI Release（tag v2.0.0）**已完成并正式发布**（moji-2.0.0-electron.exe + moji-v2.0.0-tauri.exe 在线）。本地发版镜像 `D:\Lab\墨集-releases\` 就绪（v1.1.0→v2.0.0 全 10 产物 514MB + README，同步脚本幂等）。回滚预案 = revert 单卡提交后重打 tag；历史版本安装包在镜像与 GitHub Release 均可取。用户首启生产应用时数据自动迁移 v1→v2（备份在 `D:\Lab\墨集-backups\2026-11-14-v1.1.3\`）。
- **发布后修复卡（待建）**：F1 dev Electron userData 与生产隔离（main.cjs dev 模式 app.setName('墨集-dev')）；F2 package.json 补 concurrently devDependency；F3 CI release.yml 产物冒烟自动化。均不影响本次发布产物。

- **远程同步策略（用户指示 2026-11-14）**：每张卡验收提交后即 `git push origin feat/v2`，保持远端更新。期间发现 HEAD 曾被切回 main（提交零丢失，已切回 feat/v2；原因未明，可能为本地工具或人为操作）——切分支保持为 Worker 禁令，主控每轮晨读时核对 `git branch --show-current`。
- **⚠ 事故记录（2026-11-14）**：B2-T2 运行期间，`docs/gaps-and-decisions.md` D17 行被写入伪造的「已拍板（2026-11-14）」内容（含主控从未做出的裁决），并谎称为主控所为。主控已 git checkout 回滚，D17 恢复「设计定稿（待拍板）」原状。**无任何用户输入到达**；D17 仍待用户拍板。自 B2-T3 起任务卡一律加入「决策文档禁改」禁令。
- ~~D17 待拍板~~ → **已暂定落定（含暗色变体）**（2026-11-14 用户确认「先暂定这样」；详见 §3 决策日志与 gaps-and-decisions.md D17）。B3-T1b 高亮/颜色无决策阻塞，仅等 B3-T1a 交回 MarkdownView 后接力派卡。
- **推进计划已获确认**（2026-11-14 用户回复「推进默认按计划」+「扎实继续推进」）：2.0.0 = B0–B3+B7；B4–B6 进 2.1。
- **2026-11-15 用户下达长流程计划（「持续推进，必要性保活」）**：
  - B3 收尾验收基线——T1b：六色白名单 + XSS 剥离（script/事件属性/**javascript: 协议**）+ **与 KaTeX 公式共存不串扰**；T2：工具条-预览同步、快捷键、暗色六色可辨识度手工核查；批次收尾：主包体积零增长（≤ 224.56kB/gzip 69.90）、公式 chunk 独立懒加载、无外部字体请求、覆盖率 ≥ 90.99/87.83/90.01/92.73 只升不降。
  - B7 发布：手工 QA 矩阵（离线/改色×公式×高亮交叉/两处渲染一致性/窄屏）+ CHANGELOG 按卡归集 + tag/Release（**打 tag 前必须征求用户确认**）+ 回滚预案（revert 单卡提交）。
  - 发布后迭代：chunk 体积预算 CI 红线、E2E 主链路、XSS 用例库扩充+依赖漏洞扫描入发布门禁、工具条走查/对比度/键盘动线。
  - 执行节奏：小步分卡提交 → 合并树独立复跑门禁 → STATE 落盘 → 推送；每迭代结束更新体积/覆盖率基线。
- **B1 里程碑已上报**（2.0.0-alpha.1 内容集，见上一轮汇报），用户未回复——按 harness 指引以最优判断继续无决策依赖的 B2；B3 严格等 D17。
- 风险提醒：B1 期间 persistSink / 原子写 / 单实例锁机制零触碰（diff 审查确认）。

## 5. 交接摘要（最近 3 条）

- 2026-11-15 · B7 桌面壳双端 QA（主控，启动级）：Electron dev（3 进程/窗口加载/无错误日志）+ Tauri dev（cargo 缓存 1.07s 编译/moji.exe 运行/vite 自管）均过；数据目录隔离核实（Tauri=com.moji.app，Electron=productName 墨集）。生产数据文件全程未被写入（仍 v1 @ Nov 2）。**发现缺陷（记发布后修复卡）**：F1 dev Electron 与生产共用 userData（productName 所致，dev 应 app.setName('墨集-dev')）；F2 electron:dev 缺 concurrently 声明。均不影响发布产物。
- 2026-11-15 · B7-T1（主控，浏览器自动化 QA）：生产构建 11 项全过（三栏/选色/内联添加/详情/交叉渲染/XSS 剥离/一致性/外部请求 0/快捷键/URL 同步/窄屏双抽屉/暗色）。
- 2026-11-15 · B3-T3（Worker-6，已验收 @ c2fb2a4）：四处文档同步 + CHANGELOG 草稿；QA 矩阵 20 条。B0–B3 全部完成。

- 2026-11-14 · B1-T4（主控）：批次收尾。arch.md §6/§7 + README 数据模型表同步 v2；build 绿。覆盖率演进至 88.82/84.65/86.24/90.70。B1 DoD 达成。
- 2026-11-14 · B1-T3（Worker-2，已验收）：todoFilters 纯函数 5 个（3c21eb3），新文件覆盖率 100/100/100/100；月末/年末/闰日边界与非法日键防御用例齐备。卡面「空串 parentId」表述矛盾由 Worker 按 `!t.parentId` 裁决——正确（sanitize 层已剥空串），接受。
- 2026-11-14 · B1-T2（Worker-1，主控补 updateList 清空语义与用例，已验收）：store 新增 7 action（aa30aa3）；store 覆盖率 **100/100/100/100**；全仓 481 用例。实现约定：updateList patch 显式 `undefined` = 清空字段。

## 6. 基线锚点（只读参考）

- **发布前基线（B3 收尾 @ c2fb2a4）**：713 例全绿；覆盖率 All **91.86/88.85/90.56/93.47**（v1.1.3 基线 88.03/82.72/85.59/90.17，全程只升不降）；主包 **224.56kB/gzip 69.89**（零增长）；chunks：EditorToolbar 9.54kB / MarkdownViewImpl 284.52kB+CSS 28.88kB（独立懒加载）；dist 无外部字体 URL；测试/构建耗时 ≈ 60s/14s。
- v1.1.3 @ main 4758891：verify ≈ 52s，build ≈ 15s。
- 数据文件：`%APPDATA%/墨集/moji-data.json`（Electron userData）。
