// 墨集 Electron 主进程
const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let widgetWindow = null;

// 主窗口与小组件共用的 webPreferences：保持隔离，只通过 preload 桥接暴露能力
const sharedWebPreferences = {
  preload: path.join(__dirname, 'preload.cjs'),
  nodeIntegration: false,
  contextIsolation: true,
};

// 本地数据文件路径（主窗口与小组件共享同一份，原样存取 JSON 字符串，不做解析）
// 放在函数里延迟取，确保 app 已 ready 后调用 getPath('userData') 的结果稳定
function getDataFile() {
  return path.join(app.getPath('userData'), 'moji-data.json');
}

/** 数据文件相关路径：主文件、临时文件、上一版备份 */
function dataFilePaths() {
  const file = getDataFile();
  return { file, tmp: `${file}.tmp`, backup: `${file}.bak` };
}

/**
 * 原子写入数据文件：
 * 先写 .tmp，把现有主文件留一份 .bak，再 rename 覆盖。
 * 这样即使写到一半进程被杀，也不会留下半截 JSON。
 */
function writeDataFile(payload) {
  const { file, tmp, backup } = dataFilePaths();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, payload, 'utf8');
  if (fs.existsSync(file)) {
    try {
      fs.copyFileSync(file, backup);
    } catch (error) {
      console.error('[moji] 备份数据文件失败:', error);
    }
  }
  fs.renameSync(tmp, file);
}

/** 载荷是否是合法 JSON（读盘时只做校验，不做业务解析） */
function isJsonPayload(content) {
  if (typeof content !== 'string' || !content.trim().startsWith('{')) return false;
  try {
    JSON.parse(content);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取数据文件：主文件缺失 / 损坏时回退到 .bak，并把备份恢复成主文件。
 * 返回原始字符串（主进程不解析业务字段），都没有则返回 null。
 */
function readDataFile() {
  const { file, backup } = dataFilePaths();
  for (const candidate of [file, backup]) {
    try {
      const content = fs.readFileSync(candidate, 'utf8');
      if (isJsonPayload(content)) {
        if (candidate === backup) {
          try {
            fs.copyFileSync(backup, file);
            console.warn('[moji] 主数据文件损坏，已从备份恢复');
          } catch (error) {
            console.error('[moji] 从备份恢复数据文件失败:', error);
          }
        }
        return content;
      }
      console.error(`[moji] 数据文件不是合法 JSON，尝试下一个候选: ${candidate}`);
    } catch (error) {
      // ENOENT 表示文件还不存在（首次启动），属于正常情况
      if (error.code !== 'ENOENT') {
        console.error(`[moji] 读取数据文件失败 ${candidate}:`, error);
      }
    }
  }
  return null;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    title: '墨集 — 墨色纸韵',
    icon: path.join(__dirname, 'public', 'favicon.svg'),
    webPreferences: { ...sharedWebPreferences },
    autoHideMenuBar: true,
    backgroundColor: '#faf8f5',
    show: false,
  });

  // 隐藏菜单栏
  Menu.setApplicationMenu(null);

  // 生产环境加载打包后的文件，开发环境加载 dev server
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    // 注意：__dirname 是 moji/electron，打包后的页面在 moji/dist 下
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// 桌面小组件：无边框、透明、置顶的小窗口，惰性创建（用户点击才开）
function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 340,
    height: 440,
    minWidth: 300,
    minHeight: 360,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    backgroundColor: '#00000000',
    title: '墨集 — 小组件',
    webPreferences: { ...sharedWebPreferences },
    show: false,
  });

  // 生产环境带 query 参数加载同一个 dist 页面，开发环境走 dev server
  if (app.isPackaged) {
    widgetWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'), {
      query: { window: 'widget' },
    });
  } else {
    widgetWindow.loadURL('http://localhost:5173/?window=widget');
  }

  // 等页面就绪再显示，避免透明窗口先闪一下黑底
  widgetWindow.once('ready-to-show', () => {
    if (widgetWindow && !widgetWindow.isDestroyed()) {
      widgetWindow.show();
    }
  });

  // 小组件关闭只清掉自身的引用，不影响主窗口；所有窗口关闭才退出应用
  widgetWindow.on('closed', () => {
    widgetWindow = null;
  });

  return widgetWindow;
}

// —— IPC：本地数据读写（主进程原样存取，不做 JSON 解析）——

/** 把最新载荷广播给所有已打开的窗口（主窗口 ↔ 桌面小组件联动） */
function broadcastChanged(payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('moji:data-changed', payload);
    }
  }
}

// 读取数据文件（主文件损坏时回退 .bak）；不存在返回 null
ipcMain.handle('moji:load', async () => readDataFile());

// 保存数据文件（原子写 + 备份上一版），写完通知所有已打开窗口，实现主窗口与小组件的联动
ipcMain.handle('moji:save', async (_event, payload) => {
  writeDataFile(payload);
  broadcastChanged(payload);
});

// 同步保存：渲染进程在 beforeunload / pagehide 时用 sendSync 调用。
// 关窗后进程会立刻退出，异步 IPC 的写入还没完成就会被丢掉——这是「改完马上关就丢数据」的根因，
// 所以这里必须同步写完再返回。
ipcMain.on('moji:save-sync', (event, payload) => {
  try {
    writeDataFile(payload);
    broadcastChanged(payload);
    event.returnValue = true;
  } catch (error) {
    console.error('[moji] 同步写入本地数据失败:', error);
    event.returnValue = false;
  }
});

// 关闭当前窗口：根据事件来源找到对应窗口，主窗口 / 小组件互不拖累
ipcMain.on('moji:close-window', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win && !win.isDestroyed()) {
    win.close();
  }
});

// 切换小组件：不存在就创建并显示，已存在就显示 / 隐藏切换
ipcMain.on('moji:toggle-widget', () => {
  if (!widgetWindow || widgetWindow.isDestroyed()) {
    createWidgetWindow();
    return;
  }
  if (widgetWindow.isVisible()) {
    widgetWindow.hide();
  } else {
    // 重新显示时确保仍然置顶
    widgetWindow.setAlwaysOnTop(true);
    widgetWindow.show();
  }
});

// 单实例：两个进程同时写同一份数据文件会互相覆盖，第二个实例直接把窗口交还给第一个
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow || mainWindow.isDestroyed()) {
      createWindow();
      return;
    }
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });

  app.whenReady().then(createWindow);

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
}
