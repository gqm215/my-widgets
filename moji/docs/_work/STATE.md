# 墨集 v2.0.0 · 工作状态（唯一事实源）

> 规则见 `docs/workflow-longrun.md`。任何进度先写这里，再干别的。
> 最近更新：2026-11-14（B0 完成，B1-T1 派卡）

## 1. 当前阶段

- 批次：**B1 数据模型 v2 · 已完成，待用户确认里程碑**（下一步 B2/B3 并行，见阻塞区）
- 分支：`feat/v2`（HEAD 3c21eb3 + 文档收尾提交）
- 目标版本：2.0.0；最低可发布集 B0+B1+B2+B3+B7

## 2. 任务板

| ID | 目标 | 状态 | 认领 | 文件范围 |
|---|---|---|---|---|
| B0-T1 | 建分支、备份数据、跑 verify/build 记录基线 | **已完成** | 主控 | 无代码改动 |
| B1-T1 | List 实体 + Todo v2 扩展 + storage v2 迁移 + 全仓 `completed→status` 机械适配 | **已完成** @ a35ad52 | Worker-1 | types/index.ts、utils/storage.ts(+test)、test/fixtures.ts；机械适配 18 文件 |
| B1-T2 | store：List CRUD、abandon/restore、子任务级联、moveTodoToList | **已完成** @ aa30aa3 | Worker-1 + 主控小修 | store/index.ts(+test) |
| B1-T3 | 智能过滤纯函数（今天/最近7天/收集箱/逾期）+ 边界测试 | **已完成** @ 3c21eb3 | Worker-2 | utils/todoFilters.ts(+test)，覆盖率 100/100/100/100 |
| B1-T4 | 迁移往返测试（已并入 B1-T1）+ arch/README 数据模型节同步 + 批次收尾 build | **已完成** | 主控 | docs（arch.md §6/§7、README 数据模型表） |

> B1 独占存储层：单路派卡，串行执行。B2/B3 卡在对应批次开工前拆细；B4–B6 暂不入板。

## 3. 决策日志

- 2026-11-14：初始化。既定决策以 `docs/gaps-and-decisions.md` 为准（D1–D20 倾向视为已确认，用户开工未提异议）。新决策编号从 D21 起追加。
- 2026-11-14（范围修正，非新决策）：B1-T1 发现 `completed→status`（D3）是类型级破坏变更，波及 11 个源文件 + 6 个测试文件。B1-T1 卡扩为「数据模型 v2 + 消费方最小机械适配」，机械适配仅限编译级修复与 D2 新建默认 `priority:'none'`，不加任何新 UI。
- 2026-11-14（实现约定）：`updateList` patch 语义 = 显式传 `undefined` 的字段即清空（icon 一期可清，D18「空白+色点」路线需要）。
- 2026-11-14（事实记录）：`storage.ts` 的 `version` 只写不校验（loadState 全程 normalizeState 容错）。迁移为版本无关：sanitizeTodo 内从 `completed` 推导 `status`；serializeState 输出 `version: 2`。

## 4. 阻塞与风险

- **待用户拍板（阻塞 B3-T1 开工）**：D17 六色板中**青碧/黛蓝/藕荷**三色在 design.md 无现有令牌，「不新造色」与「定 hex」冲突。需要用户给三色 hex 或授权新增 design.md 令牌。朱砂 #c94043 / 藤黄 #d4a84b / 墨灰 ink-500 #4a4a4a 可直接复用。
- 待用户确认：B1 批次里程碑（见 §5 末条）；alpha tag 事宜默认不打，等 B7 统一。
- 风险提醒：B1 期间 persistSink / 原子写 / 单实例锁机制零触碰（已由 diff 审查确认）。

## 5. 交接摘要（最近 3 条）

- 2026-11-14 · B1-T4（主控）：批次收尾。arch.md §6/§7 + README 数据模型表已同步 v2；build 绿；迁移往返测试已在 B1-T1 内完成（v1 载荷→normalizeState→serializeState→再读入 toEqual 等价）。覆盖率演进：基线 88.03/82.72/85.59/90.17 → **88.82/84.65/86.24/90.70**（只升不降 ✓）。B1 DoD 全部达成。
- 2026-11-14 · B1-T3（Worker-2，已验收）：todoFilters 纯函数 5 个（3c21eb3），新文件覆盖率 100/100/100/100；月末/年末/闰日边界与非法日键防御用例齐备。卡面「空串 parentId」表述矛盾由 Worker 按 `!t.parentId` 裁决——正确（sanitize 层已剥空串），接受。
- 2026-11-14 · B1-T2（Worker-1，主控补 updateList 清空语义与用例，已验收）：store 新增 7 action（aa30aa3）；store 覆盖率 **100/100/100/100**；全仓 481 用例。实现约定：updateList patch 显式 `undefined` = 清空字段。

## 6. 基线锚点（只读参考）

- v1.1.3 @ main 4758891：`npm run verify` ≈ 52s，`npm run build` ≈ 15s。
- 数据文件：`%APPDATA%/墨集/moji-data.json`（Electron userData）。
