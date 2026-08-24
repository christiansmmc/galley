#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use pr_reviewer::commands::{drafts, filters, prs, repos, reviews, secrets, settings, system, viewed};
use pr_reviewer::AppState;

fn main() {
    // webkit2gtk + Wayland (Fedora/Nobara/GNOME) hits Protocol error 71 in the
    // DMA-BUF renderer on launch. Setting this BEFORE webkit initialises forces
    // the legacy GLES renderer path which is stable on those compositors.
    // Users can override by exporting WEBKIT_DISABLE_DMABUF_RENDERER=0.
    #[cfg(target_os = "linux")]
    {
        if std::env::var_os("WEBKIT_DISABLE_DMABUF_RENDERER").is_none() {
            // Safety: single-threaded at this point; no other thread reads env.
            unsafe { std::env::set_var("WEBKIT_DISABLE_DMABUF_RENDERER", "1"); }
        }
    }

    let _guard = pr_reviewer::logging::init().expect("logging init failed");
    tracing::info!("starting pr-reviewer");

    let state = AppState::new().expect("app state init");

    tauri::Builder::default()
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            prs::list_prs, prs::get_pr, prs::get_pr_diff, prs::get_pr_threads, prs::get_ci_status,
            prs::refresh_pr, prs::get_file_content,
            drafts::draft_comment, drafts::list_drafts, drafts::update_draft, drafts::delete_draft,
            reviews::submit_review, reviews::reply_to_thread, reviews::resolve_thread, reviews::merge_pr,
            repos::list_repos, repos::add_repo, repos::remove_repo,
            repos::validate_repo, repos::list_my_repos, repos::set_repos, repos::repo_pr_counts,
            filters::get_path_filters, filters::set_path_filters,
            settings::get_settings, settings::set_settings,
            secrets::set_pat, secrets::clear_pat, secrets::has_pat, secrets::current_user,
            viewed::list_viewed_files, viewed::mark_viewed,
            system::open_external_url,
        ])
        .setup(|app| {
            // Building the GitHub client costs an OS-keyring read *and* a
            // `GET /user` round-trip against github.com. This used to be a
            // `block_on` right here, which meant `setup()` — and therefore the
            // window — didn't return until the network answered. On a cold or
            // slow link that's seconds of nothing on screen.
            //
            // Spawn it instead: the window paints immediately, and the handful
            // of commands that actually need the client wait for it via
            // `AppState::await_client_init` (see `commands/prs.rs::client`).
            let handle = tauri::Manager::app_handle(app).clone();
            tauri::async_runtime::spawn(async move {
                let state: tauri::State<AppState> = tauri::Manager::state(&handle);
                // The keyring call is blocking file/DBus/Credential-Manager
                // I/O, so keep it off the async worker pool too.
                let pat = tauri::async_runtime::spawn_blocking(pr_reviewer::secrets::get_pat)
                    .await
                    .map_err(|e| format!("keyring task panicked: {e}"));
                match pat {
                    Ok(Ok(Some(pat))) => match pr_reviewer::github::GitHubClient::new(&pat).await {
                        Ok(client) => {
                            *state.client.write().await = Some(client);
                            tracing::info!("GitHub client ready");
                        }
                        Err(e) => tracing::warn!("failed to init GitHub client: {e}"),
                    },
                    Ok(Ok(None)) => tracing::info!("no PAT stored; waiting for the user to set one"),
                    Ok(Err(e)) => tracing::warn!("keyring read failed: {e}"),
                    Err(e) => tracing::warn!("{e}"),
                }
                // Unblocks any command already waiting on the client. Runs on
                // every path above, including the failure ones, so a command
                // never waits out the timeout for an answer we already have.
                state.mark_client_init_done();
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
