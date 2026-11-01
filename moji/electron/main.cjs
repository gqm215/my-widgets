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

// 读取数据文件：不存在或读取异常都返回 null
ipcMain.handle('moji:load', async () => {
  const file = getDataFile();
  try {
    return await fs.promises.readFile(file, 'utf8');
  } catch (error) {
    // ENOENT 表示文件还不存在（首次启动），属于正常情况
    if (error && error.code !== 'ENOENT') {
      console.error('[moji] 读取本地数据失败:', error);
    }
    return null;
  }
});

// 保存数据文件：写完通知所有已打开窗口，实现主窗口与小组件的联动
ipcMain.handle('moji:save', async (_event, payload) => {
  const file = getDataFile();
  await fs.promises.mkdir(path.dirname(file), { recursive: true });
  await fs.promises.writeFile(file, payload, 'utf8');

  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) {
      win.webContents.send('moji:data-changed', payload);
    }
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

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
