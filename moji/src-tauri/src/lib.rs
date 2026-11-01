use std::path::PathBuf;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};

/// 数据文件名，位于应用数据目录下
const DATA_FILE: &str = "moji-data.json";
/// 悬浮小组件窗口标识
const WIDGET_LABEL: &str = "moji-widget";

/// 拼出 `<app_data_dir>/moji-data.json`
fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败：{e}"))?;
    Ok(dir.join(DATA_FILE))
}

/// 读取数据文件内容；文件不存在时返回 None
#[tauri::command]
fn moji_load(app: AppHandle) -> Result<Option<String>, String> {
    let path = data_file_path(&app)?;
    if !path.is_file() {
        return Ok(None);
    }
    std::fs::read_to_string(&path)
        .map(Some)
        .map_err(|e| format!("读取数据文件失败：{e}"))
}

/// 原样写入数据文件（不解析 JSON），写成功后向所有窗口广播 `moji:changed`
#[tauri::command]
fn moji_save(app: AppHandle, payload: String) -> Result<(), String> {
    let path = data_file_path(&app)?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建数据目录失败：{e}"))?;
    }
    std::fs::write(&path, &payload).map_err(|e| format!("写入数据文件失败：{e}"))?;
    // 数据已经落盘，广播失败只记录日志，不当作保存失败
    if let Err(e) = app.emit("moji:changed", payload) {
        eprintln!("广播 moji:changed 失败：{e}");
    }
    Ok(())
}

/// 关闭调用方窗口
#[tauri::command]
fn moji_close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| format!("关闭窗口失败：{e}"))
}

/// 切换悬浮小组件：已存在则显隐切换，不存在则按浮窗规格创建
#[tauri::command]
fn moji_toggle_widget(app: AppHandle) -> Result<(), String> {
    if let Some(win) = app.get_webview_window(WIDGET_LABEL) {
        let visible = win
            .is_visible()
            .map_err(|e| format!("读取小组件可见性失败：{e}"))?;
        if visible {
            win.hide().map_err(|e| format!("隐藏小组件失败：{e}"))?;
        } else {
            win.show().map_err(|e| format!("显示小组件失败：{e}"))?;
            win.set_focus().map_err(|e| format!("聚焦小组件失败：{e}"))?;
            win.set_always_on_top(true)
                .map_err(|e| format!("小组件置顶失败：{e}"))?;
        }
        return Ok(());
    }

    WebviewWindowBuilder::new(
        &app,
        WIDGET_LABEL,
        WebviewUrl::App("index.html?window=widget".into()),
    )
    .title("墨集 · 浮窗")
    .inner_size(340.0, 440.0)
    .transparent(true)
    .decorations(false)
    .always_on_top(true)
    .skip_taskbar(true)
    .resizable(false)
    .shadow(false)
    .build()
    .map_err(|e| format!("创建小组件窗口失败：{e}"))?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            moji_load,
            moji_save,
            moji_close_window,
            moji_toggle_widget
        ])
        .run(tauri::generate_context!())
        .expect("墨集启动失败");
}
