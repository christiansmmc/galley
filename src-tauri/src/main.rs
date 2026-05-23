#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pr_reviewer::commands::{drafts, filters, prs, repos, reviews, secrets, settings, viewed};
use pr_reviewer::AppState;

fn main() {
    let _guard = pr_reviewer::logging::init().expect("logging init failed");
    tracing::info!("starting pr-reviewer");

    let state = AppState::new().expect("app state init");

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            prs::list_prs, prs::get_pr, prs::get_pr_diff, prs::get_pr_threads, prs::refresh_pr,
            drafts::draft_comment, drafts::list_drafts, drafts::update_draft, drafts::delete_draft,
            reviews::submit_review, reviews::reply_to_thread, reviews::resolve_thread,
            repos::list_repos, repos::add_repo, repos::remove_repo,
            filters::get_path_filters, filters::set_path_filters,
            settings::get_settings, settings::set_settings,
            secrets::set_pat, secrets::clear_pat, secrets::has_pat,
            viewed::list_viewed_files, viewed::mark_viewed,
        ])
        .setup(|app| {
            tauri::async_runtime::block_on(async move {
                let state: tauri::State<AppState> = tauri::Manager::state(app);
                if let Ok(Some(pat)) = pr_reviewer::secrets::get_pat() {
                    match pr_reviewer::github::GitHubClient::new(&pat).await {
                        Ok(client) => *state.client.write().await = Some(client),
                        Err(e) => tracing::warn!("failed to init GitHub client: {e}"),
                    }
                }
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
