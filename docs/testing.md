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

`makeNote / makeMemo / makeTodo / makeEvent / makeTag`（参数为 `Partial<T>` 覆盖，自动生成唯一 id，基准时间 `2025-06-02T09:00:00.000Z`）；`emptyState()`、`seedState(partial)`。

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
| `store` | 增删改、`snapshot`、`updateTag` 改名级联、`deleteTag` 清理、`toggleTodo/updateTodo` 的 completedAt |
| `hooks` | 主题默认/持久化、媒体查询变化、防抖清理 |
| `ui/Modal` | 焦点陷阱、初始焦点、归还焦点、ESC/遮罩、`aria-labelledby`、open=false 不渲染 |
| `ui/Toast` | 类型样式、3s 自动消失、手动关闭、同屏最多 3 条、越界使用抛错 |
| 页面 | 空状态、主流程、校验、筛选/排序、`?new=1`、`?date=`、翻周、导入导出、移动端抽屉 |
| App | 路由表完整、布局壳、移动端菜单/新建入口 |

## 7. 手工 QA 清单（自动化不覆盖）

**环境**：`npm run build && npm run serve`（或 `npm run dev`），Chrome 最新版 + 375×812 视口模拟。

- [ ] 今日：统计卡与列表一致；勾选待办即时反映；「在日历中查看」跳转带日期。
- [ ] 笔记：新建→输入→自动保存（刷新后仍在）；标签添加/移除；收藏排序；删除确认；移动端列表↔编辑器切换。
- [ ] 备忘：回车添加、Shift+回车换行；转待办后原备忘消失；转日程弹窗校验；删除确认。
- [ ] 待办：状态/优先级筛选、三种排序；新建弹窗 ESC/点遮罩关闭；删除确认。
- [ ] 日程：新建全天/时段；结束早于开始被拦截；编辑已有日程；重复日程在日历/今日按周期出现；删除确认。
- [ ] 日历：月/周切换、前后翻月、今天；选日期看详情；移动端详情抽屉；`/calendar?date=YYYY-MM-DD` 定位。
- [ ] 周报：翻上一周/下一周、未来周禁用；导出 Markdown 文件名与内容对应。
- [ ] 设置：主题切换并刷新后保持；标签改名后笔记筛选跟随；删除使用中标签提示数量；导出 JSON 后导入往返一致；重置确认。
- [ ] 全局：Topbar 搜索下拉（键盘 ↑/↓/Enter/Esc）；「新建」四类跳转；`/search` 结果高亮与跳转。
- [ ] 主题/无障碍：Tab 走查全部可操作项；弹窗焦点不逃逸；暗色模式对比度正常。
- [ ] PWA：`npm run build && npm run serve` 后离线刷新可打开；安装提示与「发现新版本」提示不遮挡操作。
- [ ] 打包（非门禁，按需）：`npm run electron:build` / `npm run pack` 能生成可运行产物。

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
