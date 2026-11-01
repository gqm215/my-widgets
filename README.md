# my-widgets

一组自用的小工具合集。每个工具一个独立目录，平铺在仓库根目录下，互不干扰、各自安装各自构建。

## 工具列表

| 目录 | 名称 | 说明 | 技术栈 |
|---|---|---|---|
| [`moji/`](./moji/) | 墨集 — 墨色纸韵 | 一站式日程管理：笔记 / 备忘 / 待办 / 日程 / 日历 / 周报，数据纯本地、可离线 | React 18 + TypeScript + Vite + Zustand + Tailwind |

> 新增工具时，在根目录下平铺一个 `<工具名>/` 目录，并在这张表里加一行。

## 约定

- **每个工具目录自成一体**：自带 `package.json`，独立安装、构建、测试。
  ```bash
  cd moji
  npm install
  npm run dev
  ```
- **忽略规则集中在根 `.gitignore`**：`node_modules`、`dist`、`coverage`、`release` 等规则不带前导斜杠，对任意深度生效，工具目录不必重复写。
- **文档跟着工具走**：每个工具自己的 README 与设计 / 测试文档放在各自目录内（如 [`moji/docs/`](./moji/docs/)），根目录只保留本索引。
- **产物不进仓库**：构建输出与安装包留在本地或被忽略，需要分发时走 GitHub Releases。

## 目录结构

```
.
├── moji/          # 墨集：React + Vite 的日程管理工具（含 electron / SEA 打包）
│   ├── README.md  #   工具说明：功能、快速开始、数据模型
│   ├── docs/      #   架构、设计规范、测试规范、历史 PRD
│   ├── src/       #   源码
│   ├── scripts/   #   静态服务器、Node SEA 打包步骤
│   └── electron/  #   Electron 主进程
├── README.md      # 本文件：仓库索引
└── .gitignore     # 全仓库通用忽略规则
```
