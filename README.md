# 墨集 — 墨色纸韵

一站式日程管理工具，融合东方禅意美学。将笔记、备忘、待办、日程与日历功能集于一身，为追求专注与美感的用户创造沉浸式管理体验。

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | React 18 + TypeScript 5.8 |
| 构建 | Vite 6 |
| 样式 | Tailwind CSS 3 |
| 状态管理 | Zustand 5 |
| 路由 | React Router 7 |
| Markdown | react-markdown + remark-gfm |
| 日期 | date-fns 3 |
| 图标 | lucide-react |
| 存储 | localStorage（JSON，防抖写入） |

## 功能模块

- **今日视图** — 概览统计卡片 + 今日待办/日程列表
- **笔记** — Markdown 编辑器 + 实时预览双栏、标签筛选、收藏、路由参数化
- **备忘** — 快捷速记、时间戳、一键转为待办
- **待办** — 优先级/截止日期、完成切换、按状态/优先级筛选排序
- **日程** — 事件创建、全天/时间段、日历联动
- **日历** — 月视图网格 + 周视图时间轴、日期详情面板
- **设置** — 数据导出/导入/重置、浅色/深色主题切换
- **搜索** — 全局搜索笔记/备忘/待办/日程
- **响应式** — 桌面三栏 / 移动端底部导航适配

## 快速开始

```bash
npm install
npm run dev      # 开发服务器
npm run build    # 生产构建
npm run lint     # 代码检查
npm run check    # 类型检查
```

## 项目结构

```
src/
├── components/
│   ├── layout/      # Sidebar, Topbar
│   └── ui/          # Button, Modal, ConfirmDialog, EmptyState
├── hooks/           # useTheme (主题上下文)
├── lib/             # cn() 工具函数
├── pages/           # Today, Notes, Memos, Todos, Events, Calendar, Settings
├── store/           # Zustand store (AppStore)
├── types/           # TypeScript 类型定义
├── utils/           # storage.ts (读写/导入/重置/防抖)
├── App.tsx          # 根组件 + 路由
├── main.tsx         # 入口
└── index.css        # 全局样式 + 暗色模式 + 动画
```

## 数据模型

- **Note** — id, title, content, tags, isFavorite, createdAt, updatedAt
- **Memo** — id, content, createdAt
- **Todo** — id, title, description, priority, dueDate, completed, createdAt, completedAt
- **Event** — id, title, description, location, startDate, endDate, isAllDay, repeat, createdAt
- **Tag** — id, name, color

## 设计风格

- 墨色系（#1a1a1a → #e8e8e8）+ 宣纸白（#faf8f5）
- 朱砂红强调色（#c94043）、藤黄辅助色（#d4a84b）
- Noto Serif SC / Noto Sans SC / Crimson Pro 字体
- 纸张阴影 + 柔和圆角 8px
