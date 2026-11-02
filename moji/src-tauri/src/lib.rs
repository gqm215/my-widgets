use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

/// 数据文件名，位于应用数据目录下
const DATA_FILE: &str = "moji-data.json";
/// 悬浮小组件窗口标识
const WIDGET_LABEL: &str = "moji-widget";

/// 最近一次收到的载荷。
///
/// Tauri 的 `invoke` 没有同步版本：关窗后进程立即退出，关窗前发出的保存命令
/// 可能还没执行完。这里缓存最后一份载荷，在退出事件里同步兜底写盘。
struct LatestPayload(Mutex<Option<String>>);

/// 关窗两段式：第一次 CloseRequested 先拦住、让前端把数据落盘，第二次才真正关闭。
struct CloseGuard(AtomicBool);

/// 拼出 `<app_data_dir>/moji-data.json`
fn data_file_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("获取应用数据目录失败：{e}"))?;
    Ok(dir.join(DATA_FILE))
}

/// 主文件、临时文件、上一版备份的路径
fn data_file_variants(app: &AppHandle) -> Result<(PathBuf, PathBuf, PathBuf), String> {
    let file = data_file_path(app)?;
    let tmp = PathBuf::from(format!("{}.tmp", file.display()));
    let backup = PathBuf::from(format!("{}.bak", file.display()));
    Ok((file, tmp, backup))
}

/// 同步写数据文件（原样落盘，不解析内容）。
///
/// 原子写：先写 .tmp，把现有主文件留一份 .bak，再 rename 覆盖。
/// 这样即使写到一半进程被杀，也不会留下半截 JSON。
fn write_payload(app: &AppHandle, payload: &str) -> Result<(), String> {
    let (file, tmp, backup) = data_file_variants(app)?;
    if let Some(parent) = file.parent() {
        std::fs::create_dir_all(parent).map_err(|e| format!("创建数据目录失败：{e}"))?;
    }
    std::fs::write(&tmp, payload).map_err(|e| format!("写入临时文件失败：{e}"))?;
    if file.is_file() {
        if let Err(e) = std::fs::copy(&file, &backup) {
            eprintln!("备份数据文件失败：{e}");
        }
    }
    std::fs::rename(&tmp, &file).map_err(|e| format!("替换数据文件失败：{e}"))
}

/// 读取数据文件内容：主文件缺失 / 损坏时回退到 .bak，并把备份恢复成主文件
#[tauri::command]
fn moji_load(app: AppHandle) -> Result<Option<String>, String> {
    let (file, _tmp, backup) = data_file_variants(&app)?;
    for (candidate, is_backup) in [(&file, false), (&backup, true)] {
        if !candidate.is_file() {
            continue;
        }
        match std::fs::read_to_string(candidate) {
            // 只做 JSON 合法性校验，不解析业务字段
            Ok(content) if serde_json::from_str::<serde_json::Value>(&content).is_ok() => {
                if is_backup {
                    if let Err(e) = std::fs::copy(candidate, &file) {
                        eprintln!("从备份恢复数据文件失败：{e}");
                    } else {
                        eprintln!("主数据文件损坏，已从备份恢复");
                    }
                }
                return Ok(Some(content));
            }
            Ok(_) => eprintln!("数据文件不是合法 JSON，尝试下一个候选：{}", candidate.display()),
            Err(e) => eprintln!("读取数据文件失败 {}：{e}", candidate.display()),
        }
    }
    Ok(None)
}

/// 原样写入数据文件（不解析 JSON），写成功后向所有窗口广播 `moji:changed`
#[tauri::command]
fn moji_save(
    app: AppHandle,
    state: tauri::State<'_, LatestPayload>,
    payload: String,
) -> Result<(), String> {
    write_payload(&app, &payload)?;
    // 记下最后一份载荷，供退出时兜底
    if let Ok(mut guard) = state.0.lock() {
        *guard = Some(payload.clone());
    }
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
    let app = tauri::Builder::default()
        // 单实例：两个进程同时写同一份数据文件会互相覆盖，第二个实例直接把窗口交还给第一个
        .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }))
        .manage(LatestPayload(Mutex::new(None)))
        .manage(CloseGuard(AtomicBool::new(false)))
        .on_window_event(|window, event| {
            let tauri::WindowEvent::CloseRequested { api, .. } = event else {
                return;
            };
            // 只接管主窗口；小组件窗口关掉不影响数据
            if window.label() != "main" {
                return;
            }
            let app = window.app_handle();
            let guard = app.state::<CloseGuard>();
            if guard.0.swap(true, Ordering::SeqCst) {
                // 第二次关闭请求：前端已经落过盘，放行
                return;
            }
            // 第一次：拦住关闭，让前端 flush 后自己调 moji_close_window
            api.prevent_close();
            if let Err(e) = app.emit_to("main", "moji:flush-before-close", ()) {
                eprintln!("请求关闭前落盘失败，直接关闭：{e}");
                let _ = window.close();
                return;
            }
            // 兜底：前端 2 秒内没响应（渲染进程异常）也要能关掉窗口
            let win = window.clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(2000));
                let _ = win.close();
            });
        })
        .invoke_handler(tauri::generate_handler![
            moji_load,
            moji_save,
            moji_close_window,
            moji_toggle_widget
        ])
        .build(tauri::generate_context!())
        .expect("墨集启动失败");

    app.run(|app_handle, event| {
        // 退出前兜底：把最后一份载荷再同步写一次，覆盖「关窗时 invoke 还没执行完」的情况
        if matches!(event, RunEvent::ExitRequested { .. } | RunEvent::Exit) {
            let latest = app_handle
                .state::<LatestPayload>()
                .0
                .lock()
                .ok()
                .and_then(|guard| guard.clone());
            if let Some(payload) = latest {
                if let Err(e) = write_payload(app_handle, &payload) {
                    eprintln!("退出前兜底写盘失败：{e}");
                }
            }
        }
    });
}
