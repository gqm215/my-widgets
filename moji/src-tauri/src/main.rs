// 发行版不额外弹出控制台窗口，请勿删除此行
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    moji_lib::run();
}
