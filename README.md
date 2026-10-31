# 墨集 — 墨色纸韵

一站式日程管理工具，融合东方禅意美学。把笔记、备忘、待办、日程、日历与周报收进一个安静、完全离线的界面里。

> 「莫急，且从容。」—— 墨集取意「莫急」，数据只存在你的浏览器里。

## 技术栈

| 类别 | 选型 |
|---|---|
| 框架 | React 18 + TypeScript 5.8 |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3（暗色 `class` 模式） |
| 状态 | Zustand 5 |
| 路由 | React Router 7（页面懒加载） |
| Markdown | react-markdown + remark-gfm |
| 日期 | date-fns 3（zhCN，周一起始） |
| 图标 / 动效 | lucide-react / framer-motion + CSS keyframes |
| 存储 | localStorage（JSON，版本化，300ms 防抖 + 卸载前 flush） |
| 测试 | Vitest 4 + Testing Library（jsdom，v8 覆盖率门槛） |
| PWA | vite-plugin-pwa（可安装、离线可用、版本更新提示） |
| 打包 | Electron 43 / Node SEA（`scripts/`） |

## 功能

- **今日视图** — 今日概览统计、今日待办/日程、日程直跳日历。
- **笔记** — Markdown 编辑 + 实时预览、标签筛选与编辑、收藏分组、`/notes/:id` 路由同步、防抖自动保存、列表虚拟滚动。
- **备忘** — 回车速记、时间戳、一键转待办、转日程（可选全天/时段）、删除确认。
- **待办** — 优先级、截止日期、完成切换、按状态/优先级筛选、按创建/截止/优先级排序。
- **日程** — 全天/时段事件、地点与描述、重复（每天/每周/每月）、编辑与删除确认、结束时间校验。
- **日历** — 月视图（有事项标记）与周视图（时长块）、日期详情（桌面侧栏 / 移动抽屉）、循环日程展开、`?date=` 定位。
- **周报** — 按周汇总待办/笔记/备忘/日程，翻看历史周，一键导出 Markdown。
- **搜索** — 顶部实时搜索下拉（键盘导航）+ 结果页分组与高亮。
- **全局新建** — 顶栏/移动端「+」快速新建四类内容。
- **设置** — 外观切换、标签管理（改名/删除级联到笔记）、数据导出/导入/重置。
- **PWA / 离线** — 可安装、Service Worker 缓存、断网可用、更新提示。
- **响应式与无障碍** — 桌面三栏 / 平板 / 移动单列；键盘可达、弹窗焦点陷阱、减少动效偏好。

## 快速开始

```bash
npm install
npm run dev              # 开发服务器
npm run build            # 生产构建（dist/，含 PWA 产物）
npm run serve            # 预览 dist/（scripts/server.cjs，端口 8099）
npm run test             # 单元测试
npm run test:coverage    # 覆盖率（带门槛）
npm run lint             # ESLint
npm run check            # 类型检查
npm run verify           # check + lint + coverage
npm run electron:dev     # Electron 开发模式
npm run electron:build   # Electron 便携版
npm run pack             # Node SEA 单文件：release/墨集.exe
```

## 项目结构

```
.
├── docs/                 # 架构 arch.md、设计规范 design.md、测试规范 testing.md、历史 PRD
├── electron/             # Electron 主进程（main.cjs）
├── public/               # favicon、PWA 图标、scenes/ 水墨场景
├── scripts/              # 静态服务器（SEA 入口）、SEA 配置与打包步骤
├── src/
│   ├── components/
│   │   ├── layout/       #   Sidebar、Topbar、QuickCreate
│   │   ├── calendar/     #   DayDetailPanel（桌面侧栏 / 移动抽屉）
│   │   ├── ui/           #   Button、Modal、ConfirmDialog、Toast、EmptyState、Input、Textarea、Badge、Card
│   │   ├── ErrorBoundary.tsx
│   │   └── PWARegister.tsx
│   ├── hooks/            # useTheme、useMediaQuery、useDebouncedValue
│   ├── lib/              # cn()
│   ├── pages/            # Today、Notes、Memos、Todos、Events、Calendar、Report、Settings、SearchResults
│   ├── store/            # Zustand AppStore（CRUD + 级联 + snapshot/replaceAll）
│   ├── test/             # setup.ts、render.tsx、fixtures.ts
│   ├── types/            # 类型定义
│   ├── utils/            # date、calendar、search、report、storage
│   ├── App.tsx / main.tsx / index.css
├── dist/                 # 构建产物（gitignore）
└── 配置：vite.config.ts / tsconfig*.json / tailwind.config.js / postcss.config.js / eslint.config.js
```

## 数据模型

| 实体 | 字段 |
|---|---|
| Note | `id, title, content, tags: string[], isFavorite, createdAt, updatedAt` |
| Memo | `id, content, createdAt` |
| Todo | `id, title, description?, priority: high/medium/low, dueDate?, completed, createdAt, completedAt?` |
| Event | `id, title, description?, location?, startDate, endDate?, isAllDay, repeat: none/daily/weekly/monthly, createdAt` |
| Tag | `id, name, color` |

日期契约：

- `Todo.dueDate` 存**本地日键** `yyyy-MM-dd`（到期日，无时间、不受时区偏移影响）；
- `Event.startDate/endDate` 存 **ISO 字符串**；表单由日期 + 时间组合而来；
- 统一通过 `src/utils/date.ts`（`toDayKey / parseDayKey / combineDateTime`）转换，禁止直接把日键交给 `new Date()`；
- 周起始为周一，周报范围是周一 00:00:00.000 ~ 周日 23:59:59.999。

循环日程仅作展示层展开（虚拟出现不改库），编辑/删除作用于整条序列；不支持例外日期与单次修改。

## 数据与备份

- 持久化键：`moji-app-data`（`{ version: 1, data }`），写入 300ms 防抖，页面关闭/切后台前立即落盘。
- 设置页「导出数据」导出当前 store 快照；「导入数据」会先完整校验（条目级 sanitize + 旧数据迁移），失败时保持原数据不变。
- 首次使用会写入一份欢迎示例数据；「重置数据」可恢复到初始状态。

## 测试与质量门禁

- 分层测试：纯逻辑（utils/store）→ hooks/ui → 页面 → 路由壳；基础设施在 `src/test/`（localStorage/matchMedia/ResizeObserver/URL 桩、`renderWithProviders`、fixtures）。
- 覆盖率门槛（`vitest --coverage`，只升不降）：
  - 全局：语句/行 70%，函数 65%，分支 55%
  - `src/utils/**`、`src/store/**`：90% / 90% / 90% / 85%
  - `src/components/ui/**`、`src/hooks/**`：85% / 85% / 85% / 75%
- 合并前建议执行 `npm run verify`；发布前再跑一次 `npm run build` 并按 [testing.md](./docs/testing.md) 的手工清单走查。

## 设计与文档

- [docs/design.md](./docs/design.md) — 设计令牌、组件/页面规范、响应式、无障碍、文案规范。
- [docs/testing.md](./docs/testing.md) — 测试策略、基础设施、场景清单、手工 QA、排障。
- [docs/arch.md](./docs/arch.md) — 架构、路由、数据流、持久化、打包与扩展指南。
- [docs/prd.md](./docs/prd.md) — 早期产品稿（历史归档，以本 README 与代码为准）。

## 设计风格

- 墨色系（`#1a1a1a` → `#e8e8e8`）+ 宣纸白（`#faf8f5`）
- 朱砂红强调（`#c94043`）、藤黄辅助（`#d4a84b`）、青碧成功色（`#5a9a6e`）
- Noto Serif SC / Noto Sans SC / Crimson Pro（本地回退，不依赖网络字体）
- 纸张阴影、柔和圆角 8–16px、`ease-zen` 曲线、尊重 `prefers-reduced-motion`
