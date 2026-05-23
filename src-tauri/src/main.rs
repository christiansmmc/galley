#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod error;

#[tauri::command]
fn healthcheck() -> &'static str {
    "ok"
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![healthcheck])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
