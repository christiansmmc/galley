#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn healthcheck() -> &'static str {
    "ok"
}

fn main() {
    let _guard = pr_reviewer::logging::init().expect("logging init failed");
    tracing::info!("starting pr-reviewer");
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![healthcheck])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
