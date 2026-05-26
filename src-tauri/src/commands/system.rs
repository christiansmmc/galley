use crate::error::{AppError, AppResult};

/// Open an external URL in the user's default browser.
///
/// Tauri 2 does not follow `<a target="_blank">` from inside the webview; the
/// shell/opener plugins would solve this but add a dep. We have exactly one
/// external link in the app (the GitHub token creation page), so a tiny
/// xdg-open shim is enough.
///
/// Validates the URL scheme (http/https only) to avoid `xdg-open file://...`
/// style escapes via a hijacked frontend.
#[tauri::command]
pub fn open_external_url(url: String) -> AppResult<()> {
    open_url(&url)
}

/// Open an http(s) URL in the default browser, validating the scheme first.
///
/// Shared by the `open_external_url` command and the OAuth device-flow login,
/// which needs to send the user to GitHub's verification page.
pub fn open_url(url: &str) -> AppResult<()> {
    if !(url.starts_with("https://") || url.starts_with("http://")) {
        return Err(AppError::Internal(format!("refused non-http(s) url: {url}")));
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(url)
            .spawn()
            .map_err(|e| AppError::Internal(format!("xdg-open failed: {e}")))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(url)
            .spawn()
            .map_err(|e| AppError::Internal(format!("open failed: {e}")))?;
    }
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("cmd")
            .args(["/C", "start", "", url])
            .spawn()
            .map_err(|e| AppError::Internal(format!("start failed: {e}")))?;
    }
    Ok(())
}
