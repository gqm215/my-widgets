# 墨集 v2.0.0 · 工作状态（唯一事实源）

> 规则见 `docs/workflow-longrun.md`。任何进度先写这里，再干别的。
> 最近更新：2026-11-14（B0 完成，B1-T1 派卡）

## 1. 当前阶段

- 批次：**B1 数据模型 v2**（B0 已完成）
- 分支：`feat/v2`（已建，基于 main@4758891）
- 目标版本：2.0.0-alpha.1（B1 交付）；最低可发布集 B0+B1+B2+B3+B7

## 2. 任务板

| ID | 目标 | 状态 | 认领 | 文件范围 |
|---|---|---|---|---|
| B0-T1 | 建分支、备份数据、跑 verify/build 记录基线 | **已完成** | 主控 | 无代码改动 |
| B1-T1 | List 实体 + Todo v2 扩展 + storage v2 迁移 + 全仓 `completed→status` 机械适配 | **已完成** @ a35ad52 | Worker-1 | types/index.ts、utils/storage.ts(+test)、test/fixtures.ts；机械适配 18 文件 |
| B1-T2 | store：List CRUD、abandon/restore、子任务级联、moveTodoToList | 待领（依赖 B1-T1） | — | store/index.ts(+test) |
| B1-T3 | 智能过滤纯函数（今天/最近7天/收集箱/逾期）+ 边界测试 | 待领（依赖 B1-T1） | — | utils/todoFilters.ts(+test) |
| B1-T4 | 迁移往返测试 + arch/README 数据模型节同步 | 待领（依赖 B1-T1/T2） | — | storage/store 测试、docs |

> B1 独占存储层：单路派卡，串行执行。B2/B3 卡在对应批次开工前拆细；B4–B6 暂不入板。

## 3. 决策日志

- 2026-11-14：初始化。既定决策以 `docs/gaps-and-decisions.md` 为准（D1–D20 倾向视为已确认，用户开工未提异议）。新决策编号从 D21 起追加。
- 2026-11-14（范围修正，非新决策）：B1-T1 发现 `completed→status`（D3）是类型级破坏变更，波及 11 个源文件 + 6 个测试文件。B1-T1 卡扩为「数据模型 v2 + 消费方最小机械适配」，机械适配仅限编译级修复与 D2 新建默认 `priority:'none'`，不加任何新 UI。
- 2026-11-14（事实记录）：`storage.ts` 的 `version` 字段只写不校验（loadState 全程走 normalizeState 容错）。迁移实现为版本无关：sanitizeTodo 内从 `completed` 推导 `status`；serializeState 输出 `version: 2`。

## 4. 阻塞与风险

- 无阻塞。基线覆盖率已记录（§5）。
- 风险提醒：B1-T1 不得触碰 persistSink / 原子写 / 单实例锁机制（1.1.3 刚修复，勿回归）。

## 5. 交接摘要（最近 3 条）

- 2026-11-14 · B1-T1（Worker-1，已验收）：数据模型 v2 落地（a35ad52）。List/Todo v2/storage v2 迁移（版本无关，sanitizeTodo 内 completed→status）+ 全仓机械适配 18 文件；store 双不变量（completedAt⇔completed、abandonedAt⇔abandoned）；覆盖率 All **88.27/83.25/85.64/90.31** ≥ 基线。边角记录：toggleTodo 对 abandoned 任务会直接翻为 completed，B1-T2 落 abandon/restore 后由 UI 收敛。
- 2026-11-14 · B0-T1（主控）：分支 `feat/v2` 已建；数据备份 `D:\Lab\墨集-backups\2026-11-14-v1.1.3\`（moji-data.json/.backup/.bak，v1 真实数据 3.2KB）；verify/build 基线全绿，覆盖率基线 All **88.03/82.72/85.59/90.17**。**后续覆盖率只升不降。**
- 2026-11-14：计划文档（release-plan/workflow/gaps/dida365/backlog）+ STATE 入库 feat/v2（37e5693）。

## 6. 基线锚点（只读参考）

- v1.1.3 @ main 4758891：`npm run verify` ≈ 52s，`npm run build` ≈ 15s。
- 数据文件：`%APPDATA%/墨集/moji-data.json`（Electron userData）。
