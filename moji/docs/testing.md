# 墨集 · 测试规范（Testing Spec）

> 目标：让每次改造都有可执行的防回归网；覆盖率只升不降；测试失败能直接定位到「哪个页面的哪个行为」。

## 1. 命令

```bash
npm run check          # tsc -b --noEmit 类型检查
npm run lint           # ESLint（0 error / 0 warning 为门禁）
npm test               # 全量单元测试（vitest run）
npm run test:watch     # 监听模式
npm run test:coverage  # 覆盖率（带门槛）
npm run verify         # check + lint + coverage 一条命令
npm run build          # 生产构建（构建后跑一次，验证 PWA/产物）
```

- 日常开发：`npx vitest run src/pages/__tests__/Events.test.tsx` 只跑相关文件。
- 提交前最低要求：`npm run lint && npm test`；改公共逻辑/组件的，跑 `npm run test:coverage`。

## 2. 覆盖率门槛（vitest `coverage.thresholds`）

| 范围 | 语句 | 行 | 函数 | 分支 |
|---|---|---|---|---|
| 全局（`src/**`，排除引导文件） | 70 | 70 | 65 | 55 |
| `src/utils/**` | 90 | 90 | 90 | 85 |
| `src/store/**` | 90 | 90 | 90 | 85 |
| `src/components/ui/**` | 85 | 85 | 85 | 75 |
| `src/hooks/**` | 85 | 85 | 85 | 75 |

排除项仅限无业务逻辑文件：`src/main.tsx`、`src/components/PWARegister.tsx`、`src/test/**`、`src/types/**`、`*.d.ts`。

规则：
- **门槛只升不降**。新增代码导致下降 → 补测试，不下调数字。
- 确实无法测的引导代码 → 改成可注入的纯函数再测（不要加排除）。
- 覆盖率只是底线，关键行为必须显式断言（不靠「行被执行到」）。

## 3. 测试分层

```
utils / store（纯逻辑，最密）
   ↑
hooks / ui 组件（行为与无障碍）
   ↑
pages（页面主流程，seedStore 播种）
   ↑
App（路由壳，页面模块 mock）
```

| 层 | 关注点 | 不该做的事 |
|---|---|---|
| utils/store | 边界、空值、时区、级联、持久化时序 | 渲染、DOM |
| hooks | 副作用清理、可控定时器/媒体查询 | 页面布局 |
| ui | 交互、键盘、焦点、可访问语义 | 业务数据 |
| pages | 用户主流程、空/错误态、URL 参数 | 重复测试纯函数细节 |
| App | 路由表、布局壳、查询参数透传 | 真实页面全流程（页面各自测） |

- 不做端到端浏览器测试（不引入 Playwright）；发布前用第 7 节手工清单兜底。
- 不做 DOM 快照测试：样式类名变动频繁，断言语义而非 className 全串。

## 4. 测试基础设施

### 4.1 `src/test/setup.ts`（每个测试文件自动加载）

- `@testing-library/jest-dom` 断言扩展。
- `localStorage` 内存实现（可读、可清空）。
- **可控 matchMedia**：默认浅色、`min-width: 768/1024/1280` 为 true（桌面）；
  `setMediaQuery(query, matches)` 可切换并触发已注册监听器；`resetMediaQueries()` 复位。
- `ResizeObserver` 桩（笔记虚拟列表）：observe 时回调 `height: 600`。
- `URL.createObjectURL` / `revokeObjectURL`、`window.scrollTo`、`Element.scrollTo/scrollIntoView`、`requestAnimationFrame` 兜底。
- 每个用例后：`flushState()`（取消挂起的防抖写入）→ 恢复真实定时器 → 还原/清空 mock → 清空 localStorage → 复位媒体查询。

### 4.2 `src/test/render.tsx`

```ts
renderWithProviders(ui, { route?: string, ...renderOptions }) // MemoryRouter + ThemeProvider + ToastProvider
resetStore()                        // 清空业务数据（保留 actions），取消挂起写入
seedStore({ notes: [makeNote()] })  // reset + 写入数据分片
flushPromises()                     // 等一轮宏任务
setMediaQuery(query, matches)       // 视口/主题切换（re-export 自 setup）
```

### 4.3 `src/test/fixtures.ts`

`makeNote / makeMemo / makeTodo / makeList / makeEvent / makeTag`（参数为 `Partial<T>` 覆盖，自动生成唯一 id，基准时间 `2025-06-02T09:00:00.000Z`）；`emptyState()`、`seedState(partial)`。

约定：测试固定用基准时间与显式 id，不依赖当前时钟；需要「当前时间」时用 `vi.useFakeTimers()` + `vi.setSystemTime()`。

## 5. 编写约定

1. **文件位置**：与被测文件同目录的 `__tests__/`；页面测试集中在 `src/pages/__tests__/`。
2. **命名**：`describe('页面/组件名')` + `it('中文行为描述')`，如 `it('结束时间早于开始时间时不保存并提示')`。
3. **查询优先级**：`getByRole` / `getByLabelText` / `getByText`，避免 `container.querySelector`（仅用于纯样式断言）。
4. **交互**：统一 `userEvent`（`await userEvent.click(...)`）；需要假定时器时用
   `const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })`。
5. **防抖/定时**：优先真实定时器 + `await waitFor`（300–400ms 可接受）；必须用假定时器时，在断言后 `vi.useRealTimers()`（setup 也会兜底）。
6. **store 播种**：页面测试一律 `seedStore({...})`，不要在测试里点 UI 造大量前置数据；跨用例不共享状态（setup 自动清理）。
7. **异步副作用**：导出/下载断言 `URL.createObjectURL` 与 `<a download>`，用 spy 阻止真实导航。
8. **无障碍**：弹窗测试断言焦点陷阱与 `aria-labelledby`；图标按钮用 `getByRole('button', { name: '删除' })`。
9. **不 mock 被测模块自身**；只 mock 外部副作用（网络、时间、随机、下载）。App 路由测试可 mock 页面模块。

## 6. 重点场景清单（改这些地方必须补/改测试）

| 模块 | 必测场景 |
|---|---|
| `utils/date` | 日键↔Date、非法日期（2 月 30 日）、`combineDateTime` 时分秒、跨时区日键稳定、空值 |
| `utils/storage` | 防抖写入、flush 立即落盘、配额异常不抛出、旧格式迁移、条目级 sanitize、导入失败不改数据 |
| `utils/search` | 四类命中、大小写、标题优先排序、limit、空查询、摘要清洗 |
| `utils/calendar` | 分桶、时长块 top/height（最小 24）、跨小时、循环展开（日/周/月）、区间边界 |
| `utils/report` | 周范围（周一 00:00 ~ 周日 23:59:59.999）、偏移周、截断 60/61 字符、空报告 Markdown |
| `utils/todoFilters` | 今天/最近7天（未来7天+已逾期）/收集箱成员资格、逾期判定、无日期/跨周边界、abandoned 排除、顶层任务过滤 |
| `store` | 增删改、`snapshot`、`updateTag` 改名级联、`deleteTag` 清理、`toggleTodo/updateTodo` 的 completedAt |
| `hooks` | 主题默认/持久化、媒体查询变化、防抖清理 |
| `ui/Modal` | 焦点陷阱、初始焦点、归还焦点、ESC/遮罩、`aria-labelledby`、open=false 不渲染 |
| `ui/Toast` | 类型样式、3s 自动消失、手动关闭、同屏最多 3 条、越界使用抛错 |
| `components/todos` | 三栏响应式（宽屏常驻/窄屏抽屉/遮罩关闭/切宽屏收起）、`?list=/?task=` 还原与清参、清单增删改名与级联文案、逾期红组与折叠分组、空态三分、内联添加、详情编辑双态、prefs 开关与还原 |
| 页面 | 空状态、主流程、校验、筛选/排序、`?new=1`、`?date=`、翻周、导入导出、移动端抽屉 |
| App | 路由表完整、布局壳、移动端菜单/新建入口 |

## 7. 手工 QA 清单（自动化不覆盖）

**环境**：`npm run build && npm run serve`（或 `npm run dev`），Chrome 最新版 + 375×812 视口模拟。

- [ ] 今日：统计卡与列表一致；勾选待办即时反映；「在日历中查看」跳转带日期。
- [ ] 笔记：新建→输入→自动保存（刷新后仍在）；标签添加/移除；收藏排序；删除确认；移动端列表↔编辑器切换。
- [ ] 备忘：回车添加、Shift+回车换行；转待办后原备忘消失；转日程弹窗校验；删除确认。
- [ ] 待办：三栏宽屏并排（未选中详情时列表居中）；内联回车创建；优先级筛选与三种排序；清单新建/改名/删除；详情编辑与放弃/恢复；删除确认（父删级联子任务、删清单任务移收集箱）。
- [ ] 待办三栏（B2 增补）：窄屏清单栏抽屉与详情抽屉（点遮罩关闭；切到宽屏抽屉自动收起）；`/todos?list=work&task=xxx` 刷新后还原现场、非法参数回落收集箱；切换清单时选中任务的保留/清除；删除当前查看清单后视图回落收集箱且任务保留；隐藏已完成开关刷新后保持；导出 JSON 中不含视图偏好（`moji-ui-prefs` 不进导出）。
- [ ] 日程：新建全天/时段；结束早于开始被拦截；编辑已有日程；重复日程在日历/今日按周期出现；删除确认。
- [ ] 日历：月/周切换、前后翻月、今天；选日期看详情；移动端详情抽屉；`/calendar?date=YYYY-MM-DD` 定位。
- [ ] 周报：翻上一周/下一周、未来周禁用；导出 Markdown 文件名与内容对应。
- [ ] 设置：主题切换并刷新后保持；标签改名后笔记筛选跟随；删除使用中标签提示数量；导出 JSON 后导入往返一致；重置确认。
- [ ] 全局：Topbar 搜索下拉（键盘 ↑/↓/Enter/Esc）；「新建」四类跳转；`/search` 结果高亮与跳转。
- [ ] 主题/无障碍：Tab 走查全部可操作项；弹窗焦点不逃逸；暗色模式对比度正常。
- [ ] PWA：`npm run build && npm run serve` 后离线刷新可打开；安装提示与「发现新版本」提示不遮挡操作。
- [ ] 打包（非门禁，按需）：`npm run electron:build` / `npm run pack` 能生成可运行产物。

### 7.1 B3 批次手工 QA 增补（笔记增强：公式 / 高亮 / 工具条）

- [ ] 离线：断网打开笔记与待办详情，`$…$` / `$$…$$` 公式与 KaTeX 字体渲染正常（DevTools Network 无外部请求）。
- [ ] 交叉：同页混用「清单改色 × 笔记公式 × `==高亮==` / 六色」，互不干扰。
- [ ] 一致性：同一段内容分别贴入 Notes 预览与待办详情预览，渲染结果一致。
- [ ] 窄屏：双抽屉开合顺畅；编辑器工具条在 375 宽度下可达、可点、换行不遮挡。
- [ ] 暗色：六色文字 / 六色高亮可辨识，无色名 `==高亮==` 墨底可读，墨灰反转（白底偏黑、墨底偏白）观感自然。
- [ ] 快捷键：Ctrl+B / Ctrl+Shift+H 在笔记与待办描述编辑态均生效，且不影响全局既有快捷键。
- [ ] 白名单安全：粘贴含 `<script>` / `onerror` / `style` / 非白名单类名的笔记内容，渲染被剥离、原文存储不变。

## 8. 常见问题排查

| 现象 | 处理 |
|---|---|
| `Not implemented: window.scrollTo` | setup 已桩；新增 API 时同法补 |
| `ResizeObserver is not defined` | 确认 setup 生效；测试文件勿自行覆盖 |
| `act(...)` 警告 | 用 `await waitFor`/`findBy*` 包裹异步；检查未等待的 `userEvent` |
| 假定时器下 userEvent 超时 | `userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` |
| 覆盖率未达标 | 看 `coverage/index.html` 找未覆盖分支，补用例；不要调低门槛 |
| 测试间数据串扰 | 每个用例先 `seedStore()`；setup 已清理 localStorage |
| 下载测试触发导航 | spy `HTMLAnchorElement.prototype.click`，断言 `download` 属性 |
| `ErrorBoundary` 用例打印 `Error: boom` 到 stderr | 预期噪声（jsdom 虚拟控制台输出被捕获的渲染错误），断言仍覆盖兜底与重试行为，忽略即可 |

## 9. 维护流程

1. 新功能/行为变更：先补测试（或同步），再改实现；PR/交付说明列出新增用例。
2. 新增 utils/hook/组件：必须带 `__tests__`；纯展示组件至少覆盖 props 分支与关键语义。
3. 修 bug：先写一个能复现的失败用例，再修复（回归测试永久保留）。
4. 覆盖率排除项、门槛变更需要在本文件记录理由；只允许因「文件不再含业务逻辑」而调整。
5. 每次结构调整后跑 `npm run verify` 与 `npm run build`，确保门禁与产物同时健康。

## 10. 批次用例清单 · B2 待办三栏重构（2026-11）

> B2 三个验收维度（三栏响应式、URL 同步、级联 UI）的用例落点对照。批次收尾后新增行为仍按第 6 节规则补测。

| 行为域 | 用例落点 | 覆盖内容 |
|---|---|---|
| `viewKeys` 纯函数 | `src/components/todos/__tests__/viewKeys.test.ts` | `?list=` 缺失/非法/已删回落 inbox；`?task=` 空白/不存在/子任务回落无选中；首尾空白裁剪 |
| 三栏响应式 | `src/pages/__tests__/Todos.test.tsx` | 宽屏清单栏+详情栏常驻（三栏并排）；窄屏清单栏抽屉开关与遮罩关闭；窄屏详情抽屉（关闭按钮/遮罩均清 `?task=`）；窄屏开抽屉切宽屏自动收起 |
| URL 同步 `?list=` | 同上 | `?list=today/bogus` 初始化与回落写回；点清单栏切换写参；`?new=1` 聚焦内联添加并清参；当前清单被删除回落收集箱并写回 `list=inbox` |
| URL 同步 `?task=` | 同上 | `?task=` 还原选中渲染详情；指向不存在任务/子任务清参；切视图选中不属于新视图清参、属于则保留；删除选中任务清参 + 级联文案 |
| 清单栏（ListRail） | 同上 | 新建（回车创建默认墨灰/Esc 取消/空名不创建）；改名（回车保存/Esc 取消/空名视为取消）；删除确认文案「任务移入收集箱」且任务保留；智能清单角标只计 active 顶层；「+」菜单空白清单入口 + 模板禁用项 + Esc/外点关闭 |
| 列表区（TaskList/TaskRow） | 同上 | 内联回车连续创建（收集箱无 listId、清单视图归属当前清单、空标题不落库）；逾期红组置顶；已完成/已放弃折叠分组默认收起与展开；勾选完成/勾回；放弃任务进入折叠分组；优先级筛选（含无优档）与筛空空态；三种排序（优先级序/截止沉底）；进行中全隐藏空态；行内优先级小旗（高/中优 + sr-only 文本）与日期图标纯展示 |
| 详情（TaskDetail） | `src/components/todos/__tests__/TaskDetail.test.tsx` + 页面接线 | 标题 blur/Enter/Esc/空标题；截止日期写入/清空；优先级 4 档；描述编辑/预览双态（GFM/全要素渲染/清空移除字段/失焦保存）；子任务增删勾；放弃/恢复/标记为进行中；子任务受限展示；提醒占位；页面级删除确认与 Toast |
| prefs（D8） | `src/pages/__tests__/Todos.test.tsx` | `hiddenCompleted` 开关立即生效并写 `moji-ui-prefs`；重挂载从 localStorage 还原 |

## 11. 批次用例清单 · B3 笔记增强（2026-11）

> B3 三个交付（共享 Markdown 渲染、`==高亮==` 与六色白名单、编辑器工具条）的用例落点对照。批次收尾后新增行为仍按第 6 节规则补测。

| 行为域 | 用例落点 | 覆盖内容 |
|---|---|---|
| 共享 Markdown 渲染（公式） | `src/components/markdown/__tests__/MarkdownView.test.tsx`（7 例） | 行内 `$…$` / 块级 `$$…$$` 渲染 KaTeX 且定界符消失；孤立 `$` 字面保留；无公式内容回归（与改造前逐字一致、两档位类名锁定）；Notes / TaskDetail 两处用法冒烟 |
| `==高亮==` 与六色白名单 | `src/components/markdown/__tests__/HighlightWhitelist.test.tsx`（50 例） | 高亮 15 正反例（最小配对 / `===` `====` 字面 / 空格不配对 / 代码块免疫）；跨节点补配对（`==$公式$==`、包裹行内代码、多对）；KaTeX 共存互不吞并；六色 mark / span 类名逐一渲染；混合类名剥除与去重；XSS 全套（script 段内/块级、大小写混淆、onerror、style、iframe、svg、注释/CDATA/PI/DOCTYPE、未闭合、游离闭合）；`javascript:` 协议剥离（原始标签 4 变体 + Markdown 链接 2 变体 + https 回归）；index.css ↔ palette.ts 一致性守卫 |
| 语法插入纯函数 | `src/components/markdown/__tests__/insertSyntax.test.ts`（22 例） | 包裹（选区保持内容上）/ 无选中插入对光标居中 / 重复触发解除（往返对称）；六色类名取自 palette、非法键与未知动作防御；行前缀幂等；块级公式包裹与解除 |
| 编辑器工具条 | `src/components/markdown/__tests__/EditorToolbar.test.tsx`（19 例） | 8 按钮插入与选区落点；重复触发解除；行前缀幂等不唤醒保存链；颜色面板（展开 / aria-pressed / 色点 hex / 保持展开 / Esc / 外点 / toggle）；快捷键 Ctrl+B、Ctrl+Shift+H（含大小写）与无冲突；选中浮现 `data-has-selection`；空 ref 防御 |
| 两处接线与预览同步 | `EditorToolbar.test.tsx` 接线冒烟 + `src/pages/__tests__/Notes.test.tsx` + `src/components/todos/__tests__/TaskDetail.test.tsx` | Notes 编辑器工具条 → 插入高亮/六色 → 防抖保存 → 预览出现 `mark`（含 `c-teal` 类）；TaskDetail 编辑态工具条在场、预览态隐藏且渲染 `mark`；描述原文存取不变形 |
| 存储原文保真（B3 前提） | `src/utils/__tests__/storage.test.ts`（58 例回归） | 公式 / 高亮 / 白名单只解释于渲染层：语法以原文进存储、导出/搜索/同步零改动；v1→v2 迁移与 sanitize 回归保持绿 |
