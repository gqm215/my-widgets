// 墨集 Electron 预加载脚本
// contextIsolation: true 下只通过 contextBridge 暴露最小能力，渲染进程不直接接触 ipcRenderer
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('mojiBridge', {
  // 标记当前桌面壳类型，前端据此区分 Electron / Tauri / 浏览器
  shell: 'electron',

  // 读取本地数据（返回 JSON 字符串或 null）
  load: () => ipcRenderer.invoke('moji:load'),

  // 保存本地数据（原样传字符串，主进程负责落盘并广播变更）
  save: (payload) => ipcRenderer.invoke('moji:save', payload),

  // 同步保存：只在关窗 / 卸载前调用，保证进程退出前数据已写盘
  saveSync: (payload) => ipcRenderer.sendSync('moji:save-sync', payload),

  // 监听数据变更（主进程广播），返回取消监听的函数
  onChange: (cb) => {
    const h = (_e, payload) => cb(payload);
    ipcRenderer.on('moji:data-changed', h);
    return () => ipcRenderer.removeListener('moji:data-changed', h);
  },

  // 关闭当前窗口（主窗口与小组件互不影响）
  closeWindow: () => ipcRenderer.send('moji:close-window'),

  // 显示 / 隐藏桌面小组件
  toggleWidget: () => ipcRenderer.send('moji:toggle-widget'),
});
