use tauri::{Emitter, Manager};

#[tauri::command]
fn plugin_set_data(app: tauri::AppHandle, data: serde_json::Value) {
    app.emit_to("main", "widget-data", data).ok();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_denylist(&["plugin-runner"])
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![plugin_set_data])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();

            let init_script = r#"
                window.widget = {
                    setData: (data) => window.__TAURI__.core.invoke('plugin_set_data', { data }),
                    onRefresh: (fn) => { fn(); setInterval(fn, 5000); }
                };
            "#;

            tauri::WebviewWindowBuilder::new(
                app,
                "plugin-runner",
                tauri::WebviewUrl::App("plugin-runner.html".into()),
            )
            .initialization_script(init_script)
            .visible(false)
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
