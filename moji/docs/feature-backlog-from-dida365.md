# 墨集功能需求 · 以滴答清单「功能介绍」为蓝本

> 参考源：`学习功能.pdf`（滴答清单 2026/11/14 官网功能介绍页，6 页截图）。
> 本文档**不是界面赏析**，是把 PDF 里看到的功能点，按 moji 的架构约束（纯前端 / 无后端 / 无账号 / localStorage / 离线优先）重新分类后，输出的**面向 moji 的功能需求清单**。
> 现有功能与架构见 `README.md`、`docs/arch.md`。

---

## 〇、分类原则

moji 当前约束：

- 数据层只有 localStorage（`version: 1`），无后端、无账号、无云同步
- 分发形态：PWA / Electron / Tauri / Node SEA 单文件
- 实体：Note / Memo / Todo / Event / Tag，共五个

PDF 功能点按可行性分三类：

| 标记 | 含义 | 示例 |
|---|---|---|
| ✅ 可做 | 纯前端即可实现，无需后端 | 清单分组、四象限、⌘K 指令菜单 |
| ⚠️ 有限做 | 可做但需要降级或额外工程 | 多端同步（只能靠导入导出）、第三方导入（文件级） |
| ❌ 做不了 | 架构根本不支撑 | 共享协作、微信添加、自然语言时间识别（云端） |

---

## 一、PDF 功能点分类总览

### 1.1 可做（✅）

| # | PDF 功能 | moji 现状 | 改造方向 | 涉及实体 |
|---|---|---|---|---|
| F1 | 清单（List）分组 | ❌ 无分组概念，Todo 直接平铺 | Todo 增加 `listId`，侧栏新增「清单」分组容器，每条清单含彩色标识、数量角标 | 新增 List 实体；Todo 加 listId |
| F2 | 清单层级 | ❌ | 二级清单（父清单 → 子清单），用于「旅行准备物品 → 人物证件/电子设备」这类结构 | List 加 parentId |
| F3 | 过滤器（本周/本月/未安排/高优先级） | ❌ 只有状态/优先级筛选 | 侧栏预设智能视图，带数量角标；与用户自建清单并列 | 新增 Filter 实体（或配置化） |
| F4 | 任务详情三栏布局 | ❌ 当前 Todos 页只列表 + 弹窗编辑 | 桌面端：左栏清单/过滤器 → 中栏任务列表 → 右栏详情（日期/所属清单/描述/标签） | 页面重构，不改实体 |
| F5 | 任务详情支持 Markdown + 图片 | ❌ Todo.description 是纯文本 | description 改用 Markdown 渲染；图片存 base64 或对象 URL，首次实现放 base64 | Todo.description 语义扩展 |
| F6 | 多个提醒时间 | ❌ Event/Todo 都只有单个时间点 | Todo 新增 reminders 数组；Event 新增 reminders 数组；每个 reminder 有 offset/type | Todo/Event 加 reminders |
| F7 | 提醒通知（Web Notification API） | ❌ 无通知 | 利用 PWA + Web Notification API，定时轮询或 setTimeout 触发；桌面壳（Electron/Tauri）也接入原生通知 | 新增 reminder 轮询/调度模块 |
| F8 | 重复提醒 / 艾宾浩斯 | ❌ Event.repeat 只支持 none/daily/weekly/monthly，Todo 无重复 | Todo 加 repeat；Event 保留；艾宾浩斯复习曲线作为 repeat 的一种特殊策略 | Todo 加 repeat；Event.repeat 扩展 |
| F9 | 倒数纪念日 / 生日 | ❌ | 新增 Anniversary 实体：标题、日期（可配置每年重复）、倒数天数、关联 Event 自动创建 | 新增 Anniversary 实体 |
| F10 | 四象限视图 | ❌ | 按 `importance × urgency` 把 Todo 分四块（重要紧急 / 重要不紧急 / 紧急不重要 / 不重要不紧急），每块可勾选 Todo | 新增 Todo.importance；新页面 / 新视图 |
| F11 | 专注计时 / 番茄钟 | ❌ | 圆形进度环 + 倒计时；完成后自动标记 Todo 或创建 Event；计时数据可记录到本周报 | 新增 FocusSession 实体；新页签/小组件 |
| F12 | ⌘K / Ctrl+K 指令菜单 | ❌ 当前只有顶栏搜索 | 快捷键呼出 Command Palette：新建（笔记/备忘/待办/日程）、跳转、切换视图、搜索 | 新增 useCommandPalette hook + 新组件 |
| F13 | 清单模板 | ❌ | 预置几组清单模板（旅行准备、周计划、购物、入职），一键导入；模板数据随应用打包 | 新增模板 JSON + 导入 store action |
| F14 | 日历日视图 | ❌ 当前只有月/周 | 新增日视图：时间轴 0:00–24:00，跨时段日程按块排布 | Calendar 页新增视图切换 |
| F15 | 日历日程视图 | ❌ | 按时间线性排列所有 Event，不含甘特，但可按清单/标签筛选 | Calendar 页新增视图切换 |

### 1.2 有限做（⚠️）

| # | PDF 功能 | 限制说明 | 改造方向 |
|---|---|---|---|
| F16 | 多端同步 | localStorage 只能在**同浏览器同站点**下共享；跨设备/跨浏览器不成立 | 用「导出 → 导入」文件作为同步手段；Electron/Tauri 壳可以加可选的本地 LAN 同步（mDNS + WebSocket，需新增模块），但不做云 |
| F17 | 第三方导入（Evernote / Notion） | PDF 说「订阅」，但订阅需要云端 API；文件级导入可行 | 支持导入 Evernote `.enex` XML 和 Notion `.zip`（Notion 导出为 Markdown + CSV）；只导入 Note/Event，忽略无法映射的字段 |
| F18 | 锁屏固定（iOS 通知置顶） | 这是 iOS 系统能力，Web 端只能靠 Notification API | PWA/桌面壳用系统原生通知，能置顶多少交给系统 |
| F19 | 农历 / 节日 | PDF 日历顶部露出农历 | 加 `lunar-javascript` 库；日历顶部日期同时显示公历 + 农历（可选开关） |

### 1.3 做不了（❌）

| PDF 功能 | 原因 |
|---|---|
| 共享协作 / 团队待办 / 指派 | 需要后端鉴权、实时状态同步、权限模型 |
| 微信添加 | 需要微信 OAuth + 公众号/小程序对接 |
| 语音添加 | 需要 Web Speech API（Web 端其实能做，但效果差；PDF 截图里是移动端 APP 内置能力） |
| 自然语言时间识别（服务器端） | PDF 里的「智能识别时间」是滴答云端能力；本地可以做一个简单的关键词匹配（"明天"/"下午3点"/"周五"），但精度有限 |
| 高级会员 / 教育优惠 / 礼品卡 | 需要账号系统、支付、订阅 |
| URL Scheme 跳转外部 | moji 是纯前端应用，对外不需要开放 URL Scheme；内跳转已经有 React Router |

---

## 二、功能需求明细（可做 ✅ 部分）

以下按**数据模型改动 → UI 入口 → 交互流程 → 依赖**结构展开。

### F1 · 清单（List）分组

**数据模型**

```ts
// 新增实体，types/index.ts
interface List {
  id: string;
  name: string;
  color: string;      // 与 Tag.color 复用同色板
  parentId?: string;   // F2 用，暂留空
  createdAt: string;
}

// Todo 加字段
interface Todo {
  // ...现有字段
  listId?: string;   // 归属清单；undefined = 未分配
}
```

**UI 入口**：Sidebar 新增「清单」分组，与「笔记 / 备忘 / 待办 / 日程 / 日历 / 周报」并列；每项清单显示彩色圆点 + 名称 + 数量角标（该清单未完成 Todo 数）。

**交互流程**

1. 侧栏点清单 → Todos 页按该清单过滤显示
2. 新建清单：侧栏「+」→ 弹窗（名称 + 颜色）
3. 编辑清单：侧栏右键 → 改名 / 改色 / 删除（级联：该清单下所有 Todo 的 listId 清空）
4. 移动 Todo 到清单：Todo 详情面板下拉选择

**依赖**：store 新增 List CRUD + Todo.updateTodo 级联清空 listId；Sidebar 新增清单列表组件。

### F2 · 清单层级

**数据模型**：List 加 `parentId?: string`。

**约束**：只支持两级（父 → 子），不支持更深嵌套；侧栏子清单缩进显示。

### F3 · 过滤器（预设智能视图）

**数据模型**

```ts
// 配置化存储，不需要新实体；放在 settings 或 utils/filters.ts
type FilterKey = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'unscheduled' | 'highPriority' | 'overdue';
// 每个 FilterKey 对应一个纯函数 (todos, events, now) => boolean
```

**UI 入口**：Sidebar 清单分组上方，新增「智能视图」小节，列出预设视图，每项带数量角标。与清单分组并列，同一层级，点击切换过滤器 / 切换清单。

**数量角标**：进入 Sidebar 时实时计算并缓存（按 today、thisWeek、thisMonth 三个时间窗，其余按逻辑）。

### F4 · 任务详情三栏布局

**页面重构**：Todos 页改为三栏网格（与滴答清单截图一致）

```
[清单 / 过滤器] | [任务列表] | [任务详情]
   Left           Middle       Right
```

**响应式**：桌面（≥1024px）三栏；平板（768–1023px）合并中+右为两栏；移动端（<768px）单列 + 抽屉。

**任务详情内容**

- 时间：截止日期（Todo.dueDate）+ 提醒（Todo.reminders，F6 做）
- 归属：所属清单（Todo.listId）+ 标签（Todo 增加 tags 字段，见下方）
- 描述：Markdown 渲染区 + 编辑入口（react-markdown + remark-gfm，与 Note 页复用）
- 图片：拖拽上传或粘贴（base64 存 localStorage，F5 做）
- 优先级：高 / 中 / 低 快速切换
- 完成状态：勾选框

**数据模型改动**：Todo 加 `tags: string[]`（当前只有 Note 有 tags，Todo 需要）。**注意**：现有 Tag 实体是全局定义的，Todo.tags 存的是标签**名称**字符串，与 Note.tags 一致（当前 store 级联逻辑基于名称匹配）。

### F5 · 任务详情支持 Markdown + 图片

**Markdown**：直接复用 Note 页的 `react-markdown + remark-gfm` 配置，不新增依赖。

**图片存储策略**

- **一期**：base64 内联到 Todo.description Markdown 中（`![](data:image/png;base64,xxx)`）。优点是简单、导出导出时一起走；缺点是 localStorage 上限 5MB，大图多张会撑爆。
- **二期**：新增 TodoImages 实体，单独存 `{ id: string, todoId: string, dataUrl: string, createdAt: string }`，description 里存 `![xxx](./images/<id>)` 占位，渲染时替换。这样 description 保持小体积。

**依赖**：`remark-gfm` 已在 package.json；图片上传组件新建一个复用的。

### F6 · 多个提醒时间

**数据模型**

```ts
interface Reminder {
  id: string;
  // 触发时刻：绝对时间（ISO）或相对偏移（秒）
  time: { type: 'absolute'; value: string } | { type: 'offset'; seconds: number };
  message?: string;
  enabled: boolean;
}

// Todo / Event 都加
interface Todo { reminders?: Reminder[] }
interface Event { reminders?: Reminder[] }
```

**存储位置**：reminders 数组直接内联在 Todo/Event 记录里，不新增实体。

### F7 · 提醒通知

**触发机制**：纯前端无后台服务，需要在页面打开时主动调度。

```
方案 A（简单）：应用打开时，scan todos/events → 找所有 reminder.time.absolute > now → setTimeout 排队
方案 B（稳健）：Web Notification + Service Worker 后台唤醒（PWA 已配 Service Worker）
方案 C（桌面壳）：Electron/Tauri 主进程独立调度，不依赖浏览器是否打开
```

**一期实现**：A + C。应用打开时 setTimeout 排队；桌面壳主进程负责即使窗口关闭也能提醒。PWA 的 B 方案二期做。

**UI 入口**：Todo / Event 表单 → 提醒区「+ 添加提醒」→ 选择时间（绝对日期 / 相对 X 分钟前 / X 小时前 / X 天前）。

**依赖**：`hooks/useReminders.ts` 新增调度模块；Electron main.cjs / Tauri Rust 侧加提醒调度；桌面壳通知用系统原生（Electron 用 `Notification` API，Tauri 用 `tauri-plugin-notification`）。

### F8 · 重复提醒 / 艾宾浩斯

**数据模型**

```ts
type RepeatType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'everyNDays' | 'everyNWeeks' | 'everyNMonths' | 'ebbinghaus';

// Event.repeat 扩展（已有 none/daily/weekly/monthly，加 yearly + everyN* + ebbinghaus）
// Todo 新增 repeat 字段
interface Todo {
  repeat?: RepeatType;
  repeatInterval?: number;   // everyN* 用
  // ebbinghaus 专属配置：首次触发日、当前复习阶段
  ebbinghausStage?: number;
  ebbinghausStartDate?: string;
}
```

**艾宾浩斯复习曲线**

默认间隔序列：1 / 2 / 4 / 7 / 15 / 30 天。每完成一次 Todo，stage + 1，下次到期日按序列推进。stage 到达末端后重置或停止。

**注意**：当前 Event.repeat 只在展示层展开（`utils/calendar.ts#expandOccurrences`），Todo 的 repeat 采用同样语义——**不改库，只在视图层生成虚拟到期日**。

### F9 · 倒数纪念日

**数据模型**

```ts
interface Anniversary {
  id: string;
  title: string;                  // "奶奶生日" / "结婚纪念日"
  date: string;                   // ISO，年/月/日有值，time 不重要
  repeatYearly: boolean;          // 每年重复
  kind: 'birthday' | 'anniversary' | 'custom';
  associatedEventId?: string;     // 可选：自动创建的 Event id
  createdAt: string;
}
```

**倒数天数计算**

- `repeatYearly=true`：找今年的那个日期，已过则取下一年；返回 `ceil((nextDate - now) / 86400000)`
- `repeatYearly=false`：直接算到 date 的差值

**UI 入口**：

- Today 页新增「即将到来」卡片区，展示倒数 Top 3
- Sidebar 新增「纪念日」入口 → Anniversary 列表页（按日期排序 + 倒数天数）
- Calendar 月视图：纪念日日期显示小圆圈标记，hover/click 弹出

### F10 · 四象限视图

**数据模型**

```ts
// Todo 新增 importance 字段
type Importance = 'important' | 'notImportant';
type Urgency = 'urgent' | 'notUrgent';
interface Todo {
  importance?: Importance;   // 未设置时归到第四象限「不重要不紧急」
}

// urgency 由 dueDate 推导，不存：
// dueDate 在 48h 内 → urgent
// dueDate 超过 48h 或无 dueDate → notUrgent
```

**UI 入口**：Sidebar 新增「四象限」入口 → 新页面，2×2 网格

```
┌─────────────────┬─────────────────┐
│ 重要 且 紧急     │ 重要 不紧急      │
│ （优先处理）     │ （计划完成）     │
├─────────────────┼─────────────────┤
│ 紧急 不重要      │ 不重要 不紧急     │
│ （委托他人）     │ （减少投入）     │
└─────────────────┴─────────────────┘
```

每格内部：Todo 平铺，可勾选完成；右上角显示该格未完成数。

**交互**：把 Todo 拖到不同象限（或用右键菜单 / 下拉切换）→ 自动更新 importance 字段。urgency 由 dueDate 自动推导，不可手动切换（避免矛盾）。

### F11 · 专注计时 / 番茄钟

**数据模型**

```ts
interface FocusSession {
  id: string;
  todoId?: string;     // 关联的 Todo（可选）
  startTime: string;   // ISO
  endTime?: string;    // ISO
  duration: number;    // 秒
  mode: 'focus' | 'break';
}

// settings 里加计时配置
interface TimerSettings {
  focusMinutes: number;    // 默认 25
  breakMinutes: number;    // 默认 5
  longBreakMinutes: number;
  longBreakEvery: number;  // 每 N 个 focus 后长休
  autoStartBreak: boolean;
  soundEnabled: boolean;
}
```

**UI 入口**

- Topbar 右侧新增计时入口（圆形进度环 icon + 当前模式名）
- 或 Sidebar 底部小组件
- 点击进入专注视图：倒计时环 + 开始 / 暂停 / 放弃 + 关联 Todo 选择

**完成后**：

- 自动记录 FocusSession
- 可选：将关联 Todo 标记为已完成（需确认）
- 桌面壳 / PWA：计时结束触发系统通知（F7 的提醒机制复用）

### F12 · 指令菜单（⌘K / Ctrl+K）

**触发**：全局监听 `Cmd/Ctrl + K`，打开浮层（模态 + 焦点陷阱，与现有 Modal 组件复用）。

**指令清单**

| 类别 | 指令 | 行为 |
|---|---|---|
| 新建 | 新建笔记 | 跳转 `/notes?new=1` |
| 新建 | 新建备忘 | 跳转 `/memos?new=1` |
| 新建 | 新建待办 | 跳转 `/todos?new=1` |
| 新建 | 新建日程 | 跳转 `/events?new=1` |
| 视图 | 跳转今日 | `/` |
| 视图 | 跳转笔记 | `/notes` |
| 视图 | 跳转待办 | `/todos` |
| 视图 | 跳转日历 | `/calendar` |
| 视图 | 跳转四象限 | `/quadrant`（F10 做） |
| 视图 | 跳转纪念日 | `/anniversaries`（F9 做） |
| 视图 | 跳转专注 | `/focus`（F11 做） |
| 视图 | 跳转周报 | `/report` |
| 操作 | 全局搜索 | 激活 Topbar 搜索框 |
| 操作 | 暗色模式切换 | 切换主题 |
| 操作 | 导出数据 | 触发设置页导出逻辑 |

**交互**：

- 浮层输入框支持模糊搜索指令（"nn" → "新建笔记"，"今日" → "跳转今日"）
- 键盘上/下选择，Enter 执行，Esc 关闭
- 最近执行的指令排顶部（localStorage 记录最近 5 条）

**依赖**：`components/ui/CommandPalette.tsx` 新建；`hooks/useCommandRegistry.ts` 注册指令；Sidebar/Topbar 注册快捷键监听。

### F13 · 清单模板

**模板数据**（随应用打包）

```json
// public/templates/lists.json
[
  {
    "id": "travel",
    "name": "旅行准备物品",
    "color": "#d4a84b",
    "lists": [
      { "name": "人物证件", "todos": ["身份证", "护照", "签证", "驾照"] },
      { "name": "资金", "todos": ["现金", "银行卡", "充电器", "充电宝"] },
      { "name": "洗漱用品", "todos": ["牙刷", "牙膏", "毛巾", "洗面奶"] }
    ]
  },
  {
    "id": "weekly-plan",
    "name": "周计划",
    "color": "#5a9a6e",
    "todos": ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]
  }
]
```

**UI 入口**：Todos 页 Sidebar 顶部「+」菜单 → 从模板创建 → 选择模板 → 确认导入（复制为用户自己的数据，模板本身不写 store）。

### F14 · 日历日视图

**与现有月/周视图并列**，新增「日」选项。布局：0:00–24:00 时间轴，每 30 分钟一格，Event 按时段色块绝对定位（像素换算：1 小时 = viewport 高度 ÷ 24）。

### F15 · 日历日程视图

**线性时间列表**：按 `startDate` 升序排列所有 Event，每个条目显示时间 + 标题 + 描述摘要 + 清单标签；支持按清单/标签/完成状态筛选。

---

## 三、有限做（⚠️）部分

### F16 · 多端同步

**文件级同步**（一期）：

- 设置页「导出数据」已有，文件名 `moji-backup-YYYY-MM-DD.json`
- 「导入数据」已有，全量校验后替换
- 这两个能力组合就是手动同步：A 端导出 → 文件传到 B 端 → B 端导入
- 局限：单向覆盖，没有 merge；两端都改了会丢失一端

**LAN 同步**（二期，可选）：

- 新增 `scripts/sync-server.cjs`：Node 启动一个 mDNS + WebSocket 服务
- 桌面壳（Electron/Tauri）扫描局域网发现其他设备，建立连接
- 变更增量推送（store 每次 commit 时广播 patch），冲突策略：后到覆盖先到 + 提示

**不做云同步**：没有账号体系，不值得引入后端。

### F17 · 第三方导入

**Evernote `.enex`**：XML 格式，`note` → `Note`，转换 HTML → Markdown（用 `turndown` 或 `html-to-markdown`）。

**Notion `.zip`**：解压后 Markdown 文件 + CSV 数据库；Markdown 文件 → `Note`；CSV 行 → `Todo`（title / description / dueDate / priority 列）。

**UI 入口**：设置页「导入数据」已有，新增文件类型识别；支持 `.enex` / `.zip` / `.json`（moji 自己的格式）。

### F18 · 锁屏固定

交给系统：PWA 和桌面壳都用原生 Notification API，能置顶多少由系统决定；前端只能发送通知请求。

### F19 · 农历 / 节日

**库**：`lunar-javascript`（~80KB，纯 JS，无外部依赖）。

**UI**：

- Calendar 月视图每个日期格右下角小字显示农历
- 当日视图 Today 头部显示「公历 2026 年 11 月 14 日 · 农历十月初五」
- 设置页开关：显示农历 / 显示传统节日 / 显示节气

---

## 四、架构影响点

### 4.1 types/index.ts 需要扩展的实体

| 实体 | 改动 |
|---|---|
| 新增 | `List`、`Anniversary`、`FocusSession`、`Reminder` |
| Todo | + `listId?`、`tags: string[]`、`importance?`、`repeat?`、`reminders?: Reminder[]` |
| Event | + `reminders?: Reminder[]`、`repeat` 扩展 |
| AppState | + `lists`、`anniversaries`、`focusSessions`、`settings` |

### 4.2 storage.ts 需要同步更新

- `sanitizeList` / `sanitizeAnniversary` / `sanitizeFocusSession`
- `normalizeState`：对旧版本文件自动补默认值
- 持久化 `version` 升到 `2`（旧 `version: 1` 自动迁移）

### 4.3 store/index.ts 新增 actions

```ts
// List
addList / updateList / deleteList / moveTodoBetweenLists

// Anniversary
addAnniversary / updateAnniversary / deleteAnniversary

// FocusSession
startFocusSession / endFocusSession / cancelFocusSession

// Reminder 调度（内部模块，不一定暴露为 store action）
scheduleReminders / dismissReminder
```

### 4.4 页面新增 / 重构

| 动作 | 页面 | 路由 |
|---|---|---|
| 重构 | Todos 页：三栏布局 | 保持 `/todos` |
| 新增 | 四象限视图 | `/quadrant` |
| 新增 | 纪念日列表 | `/anniversaries` |
| 新增 | 专注计时 | `/focus` |
| 新增 | 指令菜单组件 | 全局浮层，无路由 |
| 扩展 | Calendar 页：日视图 + 日程视图切换 | 保持 `/calendar` |

### 4.5 Sidebar 新增入口

- 清单分组 + 智能视图（F1 + F3）
- 纪念日（F9）
- 四象限（F10）
- 专注（F11）

---

## 五、建议实施顺序

按**数据模型依赖关系**和**用户可见价值**排序：

| 批次 | 功能 | 原因 |
|---|---|---|
| 1 | **数据模型 v2 迁移**（List、Todo.listId、Todo.tags、Todo.importance） | 后续所有功能的地基；不先搞定数据模型，新页面都是空壳 |
| 2 | **F1 清单分组 + F3 过滤器** | 用户感知最强；直接替代之前 Todo 平铺的低效；Sidebar + Todos 页三栏同步落地 |
| 3 | **F4 三栏布局 + F5 Markdown 详情 + 图片** | 与 F1/F3 配套；完成后 Todos 页就有滴答清单截图的核心体验 |
| 4 | **F12 指令菜单（⌘K）** | 纯 UI 层，数据模型无依赖；可以插在任何批次之间 |
| 5 | **F9 倒数纪念日** | 新增独立实体 + 新页面；依赖批次 1 的基础设施但不依赖 F1-F4 |
| 6 | **F10 四象限** | 依赖批次 1 的 Todo.importance；页面独立，开发效率高 |
| 7 | **F11 专注计时** | 新增实体 + 计时逻辑；可独立开发 |
| 8 | **F6 多提醒 + F7 通知调度** | 涉及跨平台（Web + Electron + Tauri）；依赖批次 1 的 Todo/Event 扩展；调度逻辑需要单独测试 |
| 9 | **F8 重复 / 艾宾浩斯** | 依赖批次 8 的提醒；Event.repeat 已经有基础，Todo.repeat 增量 |
| 10 | **F13 清单模板 + F17 第三方导入** | 数据迁移类，无数据模型依赖；可放在任何位置 |
| 11 | **F14 + F15 日历视图扩展** | 纯前端展示，依赖 Calendar 现有基础设施 |
| 12 | **F19 农历 + F16 LAN 同步** | 边缘增强项，放最后 |

---

## 六、测试门禁继承

所有新实体与新页面，继续遵守 `docs/testing.md` 和 `arch.md` 第 10 节的覆盖率门槛：

| 模块 | 语句 / 行 | 函数 | 分支 |
|---|---|---|---|
| `src/store/**`（含新 List/Anniversary/FocusSession actions） | ≥ 90% | ≥ 90% | ≥ 85% |
| `src/utils/**`（含 reminder 调度、艾宾浩斯算法） | ≥ 90% | ≥ 90% | ≥ 85% |
| `src/components/ui/`（含 CommandPalette） | ≥ 85% | ≥ 85% | ≥ 75% |
| 新增页面（Quadrant / Anniversaries / Focus） | 遵循全局 ≥ 70% / 函数 ≥ 65% / 分支 ≥ 55% | | |

新实体的 sanitize / normalize / CRUD 必须补 store 测试；reminder 调度必须 mock 掉 `setTimeout` / Notification API。

---

## 七、与滴答清单的本质差异

最后需要明确：moji 做这些功能时，不会复制滴答清单的**某些**东西，因为它刻意保持轻量。

| 滴答清单有 | moji 刻意不做 | 原因 |
|---|---|---|
| 云同步 + 多端实时 | ❌ | 无账号，架构根本不支撑；用文件导入导出手动同步足够 |
| 协作 / 团队 | ❌ | 需要后端鉴权；moji 定位是个人工具 |
| 服务器端自然语言解析 | ❌ | 可以做关键词匹配做本地版，但不承诺精度 |
| 高级会员订阅 | ❌ | 免费开源项目 |
| 消息推送（APNs/FCM） | ❌ | 纯前端只能用 Web Notification，后台唤醒依赖 Service Worker |
| 微信 / 外部 App 入口 | ❌ | 封闭生态对接成本高，与离线定位冲突 |

moji 做 F1–F15 是为了把滴答清单「功能好用」的一面吸收进来，同时保留自己「数据只在本地、禅意美学、离线优先」的核心。
