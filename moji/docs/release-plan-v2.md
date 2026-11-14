# 墨集 v2.0.0 版本更新总计划

> 基线：v1.1.3（2026-11-14）。本次为大版本：数据模型 v1→v2、待办页三栏重构、笔记公式/颜色增强，及后续视图与效率能力。
> 决策依据：`docs/gaps-and-decisions.md`（含已拍板项与倾向）、`docs/dida365-features.md`（经验）、架构讨论三项锁定（页内三栏 / 宽屏常驻+窄屏抽屉 / 先待办核心）。
> 执行方式：见 `docs/workflow-longrun.md`（主控 + ≤2 并行）。

## 〇、总原则

1. **每批可独立交付**：每批结束 `npm run verify` + `npm run build` 全绿，可单独发布 patch/minor，不憋大招。
2. **数据先行，UI 随后**：任何页面工作之前，对应实体的 sanitize/迁移/store 必须先落地并有测试。
3. **旧数据零丢失**：v1→v2 迁移必须有「旧载荷读入 → 新结构 → 再导出」的往返测试。
4. **文档同步是 DoD 的一部分**：arch.md 第 6/7 节、README 功能与数据模型表、design.md、testing.md 随批次更新。
5. **不新增决策债务**：遇到 `gaps-and-decisions.md` 未覆盖的新决策，暂停该任务、升级给主控与用户，不擅自选择。

## 一、批次总览

| 批次 | 名称 | 内容 | 依赖 | 可并行 | 交付版本 |
|---|---|---|---|---|---|
| B0 | 基线保护 | 分支、全量备份、verify 基线 | 无 | — | — |
| B1 | 数据模型 v2 | List 实体、Todo 扩展、迁移、store CRUD | B0 | 否（独占存储层） | 2.0.0-alpha.1 |
| B2 | 待办三栏重构 | 清单栏 + 列表 + 详情、编辑能力、子任务、放弃 | B1 | 可与 B3 并行 | 2.0.0-beta.1 |
| B3 | 笔记增强 L1+L2 | 公式渲染、高亮/6 色、工具条、本地 KaTeX 字体 | B0 | 可与 B2 并行 | 2.0.0-beta.2 |
| B4 | 视图扩展 | 待办四象限/甘特视图、日历日视图+农历 | B2 | 两项可并行 | 2.0.0-rc.1 |
| B5 | 专注与提醒 | Topbar 计时器+全屏专注、Web/桌面通知调度 | B1（B2 更佳） | 两项可并行 | 2.0.0-rc.2 |
| B6 | 生活与效率 | 纪念日卡片、习惯轻量、清单模板、第三方导入评估 | B2 | 两项可并行 | 2.0.0 |
| B7 | 发布 | 手工 QA、CHANGELOG、tag、Release 构建 | B2+B3（最低）/B6（完整） | — | v2.0.0 |

> **最低可发布集 = B0+B1+B2+B3+B7**；B4–B6 可按节奏进入 2.1/2.2，不阻塞 2.0.0。

## 二、批次详案

### B0 · 基线保护

- 建分支 `feat/v2`；导出当前 localStorage 数据备份一份到本地（不进仓库）。
- 跑 `npm run verify`、`npm run build` 记录基线；现有覆盖率数值记入 STATE，后续只升不降。
- **DoD**：基线全绿；备份文件存在。

### B1 · 数据模型 v2（独占存储层，禁止并行）

范围（对应缺口 A/B/C）：

- `types/index.ts`：新增 `List`（id/name/color/icon?/folderId?/createdAt）；Todo 增加 `listId?`、`parentId?`、`status: 'active'|'completed'|'abandoned'`（替代 completed 布尔，迁移见下）、`completedAt?/abandonedAt?`、优先级加 `'none'`。
- `storage.ts`：`STORAGE_VERSION=2`；`sanitizeList`；`sanitizeTodo` 扩展；**迁移**：旧 `completed:true→status:'completed'`，`false→'active'`，priority 原值保留；`snapshot/replaceAll/initialData` 纳入 lists。
- `store/index.ts`：List CRUD（删除清单 → 任务 listId 清空落收集箱，**不删任务**）；`abandonTodo/restoreTodo`；子任务级联（父删子删）；`moveTodoToList`。
- `utils/todoFilters.ts`：今天/最近7天（未来7天+已逾期）/收集箱纯函数 + 逾期判定。
- 测试：迁移往返、级联、状态互斥、过滤器日期边界（跨周/逾期/无日期）。

**DoD**：verify 全绿；v1 旧载荷导入不丢任务；导出含 lists；arch.md/README 数据模型节更新。

### B2 · 待办三栏重构（可与 B3 并行）

- 三栏骨架：宽屏（清单栏+列表+详情常驻）、窄屏双抽屉；未选中详情时列表居中留白。
- 清单栏：收集箱/今天/最近7天 + 清单列表（色点+角标+新建/改名/删色）；「+」菜单预留模板入口（B6 填内容）。
- 列表：顶部内联添加框（回车连续建）、子任务缩进折叠、底部「已完成」折叠分组、逾期红色分组、优先级筛选小控件、排序保留。
- 详情：标题/日期与提醒占位（B5 接提醒）/描述（Markdown，工具条选中浮现）/子任务编辑/优先级 4 档/放弃/删除。
- 路由：`/todos?list=&task=` 双向同步（含智能视图 id）。
- 编辑能力补做：现状页面无编辑，全部新交互。
- 视图偏好存 `moji-ui-prefs`（隐藏已完成、选中清单），不进导出。
- 测试：页面测试重写；三栏响应式、URL 同步、级联 UI。

**DoD**：verify+build 全绿；移动端抽屉可用；旧「状态筛选」移除、优先级筛选保留；design.md/testing.md 更新。

### B3 · 笔记增强 L1+L2（可与 B2 并行）

- L1：`remark-math` + `rehype-katex` 接入 react-markdown；KaTeX **字体本地打包**、公式 chunk 懒加载；高亮 `==text==` 与 `<mark class="c-*">` / `<span class="c-*">` 白名单渲染（仅 6 色类名，拒绝任意 style）。
- 色板：朱砂/藤黄/青碧/黛蓝/藕荷/墨灰，暗色自适应，令牌入 tailwind.config + index.css。
- L2：编辑器工具条（加粗/列表/待办/高亮/颜色/行内公式/块级公式），向 textarea 插语法；颜色选择器 6 色。
- 安全：不启用 rehype-raw 全量 HTML；若必须支持类名 HTML，用白名单 sanitize。
- 测试：渲染纯函数（含 XSS 用例：onerror/style/script 被剥离）、工具条插入语法、暗色快照。

**DoD**：verify+build 全绿；离线打开公式正常（无网络字体请求）；旧笔记内容不变；README 功能更新。

### B4 · 视图扩展（B2 后）

- 待办四象限：先解决 D12（importance 独立字段 vs 复用 priority），再实现 2×2 视图切换。
- 待办甘特：清单内时间段横条、完成态透明度、今天高亮。
- 日历日视图 + 清单过滤 + 农历（D16：lunar-javascript 体积评估后定）。

### B5 · 专注与提醒（B1 后，B2 后体验最佳）

- 专注：Topbar 计时器 + 全屏圆环浮层、关联 Todo、专注笔记；FocusSession 实体（新数据集合，走 B1 同款 sanitize/迁移流程）。
- 提醒：Todo/Event reminders 数据结构、Web Notification + Electron/Tauri 原生通知、权限请求时机（D13 先拍板）。

### B6 · 生活与效率

- 纪念日：Anniversary 实体 + Today 卡片 + 日历标记。
- 习惯：Today 轻量打卡（D15 先拍板是否独立页）。
- 清单模板：内置 JSON + 清单栏「+」导入。
- 第三方导入：Evernote .enex / Notion .zip 评估后定。

### B7 · 发布

- 按 testing.md 手工 QA 全清单走查（含离线、暗色、移动端、桌面壳双端）。
- 更新 CHANGELOG 与版本号；`git tag v2.0.0` 触发 release.yml 构建 Electron/Tauri 产物。
- 发布说明突出：数据模型 v2 自动迁移、三栏待办、公式与颜色。

## 三、风险与对策

| 风险 | 对策 |
|---|---|
| v1→v2 迁移丢数据 | B1 往返测试 + B0 备份；迁移失败回退 initialData 前保留原载荷 |
| Todos 页测试大面积失效 | B2 预算内重写，不试图修补旧断言 |
| KaTeX 字体破坏离线 | B3 验收含断网手工 QA；构建产物检查无外部字体 URL |
| 存储层并行冲突 | B1 独占；B2/B3 文件集不重叠才可并行（主控审查） |
| 决策中途漂移 | 新决策一律回写 gaps-and-decisions.md 后再动手 |

## 四、版本 DoD（2.0.0）

- [ ] B0–B3 全绿，verify + build 通过，覆盖率不低于基线
- [ ] v1 数据自动迁移，导入导出含清单，桌面壳同步正常
- [ ] 三栏待办 + 编辑 + 子任务 + 放弃 + 4 档优先级可用
- [ ] 笔记公式/高亮/6 色离线可用
- [ ] arch/README/design/testing 四文档同步
- [ ] 手工 QA 全清单通过，tag 与 Release 产物就绪
