# 桌面壳：Electron 与 Tauri 并存

墨集同时提供两套桌面壳，UI 与业务代码完全共用，差别只在「外壳」：

| 壳 | 产物 | 体积量级 | 说明 |
|---|---|---|---|
| Electron 43 | `release/墨集-<version>.exe`（electron-builder portable） | 大（内置 Chromium） | 生态成熟，调试方便，内置 Node |
| Tauri 2 | `src-tauri/target/release/moji.exe`（+ WebView2） | 小（复用系统 WebView2） | 体积小、启动快，需要 Rust 工具链 |

两者都提供「主窗口 + 桌面小组件」两个窗口，并共用同一份本地数据文件。

## 运行与构建

```bash
# Web / PWA（桌面壳之外也能跑，数据走 localStorage）
npm run dev

# Electron
npm run electron:dev      # 需先有点击素材：会自动拉起 vite
npm run electron:build    # portable exe → release/

# Tauri
npm run tauri:dev
npm run tauri:build       # 单文件 exe → src-tauri/target/release/
```

## 数据与联动（桥接契约）

渲染层不直接接触文件系统，而是通过 `src/platform/bridge.ts` 定义的 `MojiBridge` 与外壳通信：

```ts
interface MojiBridge {
  shell: 'electron' | 'tauri';
  load(): Promise<string | null>;              // 读取数据文件（原始 JSON 文本）
  save(payload: string): Promise<void>;        // 写入（调用方已做 300ms 防抖）
  onChange(cb: (payload: string | null) => void): () => void;  // 其他窗口写入时回调
  closeWindow(): void;                         // 小组件的关闭按钮
  toggleWidget(): void;                        // 主窗口显示 / 隐藏小组件
}
```

- **Electron**：`electron/preload.cjs` 用 contextBridge 注入 `window.mojiBridge`，IPC 名为 `moji:load` / `moji:save` / `moji:close-window` / `moji:toggle-widget`，广播事件 `moji:data-changed`。
- **Tauri**：`src/platform/tauri.ts` 用 `@tauri-apps/api` 包装成同样形状，对应 Rust 命令 `moji_load` / `moji_save` / `moji_close_window` / `moji_toggle_widget`，广播事件 `moji:changed`。
- **Web**：没有桥，数据仍由 `localStorage`（键 `moji-app-data`）负责。

数据文件位置：

- Electron：`<userData>/moji-data.json`
- Tauri：`<app_data_dir>/moji-data.json`

同步流程（`src/platform/persistence.ts`）：

1. 启动 → `bridge.load()` → 灌入 localStorage 与 store（数据文件是唯一真相）
2. 本地编辑 → store 300ms 防抖落盘 → 同时 `bridge.save()` 写文件
3. 其他窗口写入 → `bridge.onChange()` → 静默应用（`runWithoutPersist` 抑制回写，避免回声）

## 桌面小组件

- 入口：顶栏右侧「面板」图标（仅桌面壳渲染）调 `bridge.toggleWidget()`
- 窗口：无边框、透明、置顶、不进任务栏、不可缩放，尺寸约 340×440
- 页面：同一个构建产物加 `?window=widget`，`main.tsx` 据此只渲染 `src/widget/WidgetApp.tsx`
- 内容：今日到期待办，勾选即写回 store，主窗口实时同步
- 拖拽：Electron 用 `-webkit-app-region: drag`，Tauri 用 `data-tauri-drag-region`

## 与 Web 版的差异

- Electron 打包后走 `file://`，History API 不可用，`App.tsx` 在 `file:` 协议下自动切 `HashRouter`
- Tauri 通过自定义协议加载，仍用 `BrowserRouter`
- 小组件窗口给 `<html>` 加 `moji-widget` 类，`index.css` 据此去掉页面底色（否则圆角外露白）

## 版本与发布

- **应用版本** = `package.json` 的 `version`；**数据格式版本** = `src/utils/storage.ts` 的 `STORAGE_VERSION`，两者不要混用
- 语义化版本：MAJOR 破坏性变更（含数据迁移）· MINOR 兼容新功能 · PATCH 修 bug
- 发布：`git tag v1.1.0 && git push origin v1.1.0` → `.github/workflows/release.yml` 跑质量门禁、构建两套产物并挂到 GitHub Release
- 推送 / PR 触发 `.github/workflows/ci.yml`，只跑 `npm run verify`

## 已知限制

- 两套产物都只针对 Windows（portable / 单文件），跨平台打包尚未配置
- Tauri 目前 `--no-bundle`，没有安装包；需要 MSI/NSIS 时去掉该参数并补 bundle 配置
- 两个窗口同时高频编辑靠「最后写入者胜」，没有做冲突合并（单用户场景够用）
