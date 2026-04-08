use tauri::{Emitter, Manager};

#[tauri::command]
fn plugin_set_data(app: tauri::AppHandle, data: serde_json::Value) {
    app.emit_to("template", "widget-data", data).ok();
}

#[tauri::command]
fn plugin_action(app: tauri::AppHandle, name: String, payload: serde_json::Value) {
    app.emit_to(
        "plugin-runner",
        "plugin-action",
        serde_json::json!({ "name": name, "payload": payload }),
    )
    .ok();
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
        .invoke_handler(tauri::generate_handler![plugin_set_data, plugin_action])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();

            let init_script = r#"
                window.__actionHandlers = {};
                window.widget = {
                    setData: (data) => window.__TAURI__.core.invoke('plugin_set_data', { data }),
                    onRefresh: (fn) => { fn(); setInterval(fn, 5000); },
                    onAction: (name, fn) => { window.__actionHandlers[name] = fn; }
                };
                window.__TAURI__.event.listen('plugin-action', (e) => {
                    const handler = window.__actionHandlers[e.payload.name];
                    if (handler) handler(e.payload.payload);
                });
            "#;

            let template_init_script = r#"
                window.widget = {
                    action: (name, payload) => window.__TAURI__.core.invoke('plugin_action', { name, payload }),
                    onData: (fn) => window.__TAURI__.event.listen('widget-data', (e) => fn(e.payload))
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

            tauri::WebviewWindowBuilder::new(
                app,
                "template",
                tauri::WebviewUrl::App("template.html".into()),
            )
            .initialization_script(template_init_script)
            .disable_drag_drop_handler()
            .visible(true)
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
