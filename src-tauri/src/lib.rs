use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_denylist(&["plugin-runner"])
                .build(),
        )
        .plugin(tauri_plugin_http::init())
        .register_uri_scheme_protocol("widget", |app, request| {
            let base_dir = app.app_handle().path().app_data_dir().unwrap();
            let path = request.uri().path().to_string();
            let file_path = base_dir.join(&path[1..]);

            let content_type = if path.ends_with(".html") {
                "text/html"
            } else if path.ends_with(".js") {
                "application/javascript"
            } else {
                "text/plain"
            };

            match std::fs::read(&file_path) {
                Ok(bytes) => tauri::http::Response::builder()
                    .header("Content-Type", content_type)
                    .body(bytes)
                    .unwrap(),
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body(vec![])
                    .unwrap(),
            }
        })
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();

            let base_dir = app.path().app_data_dir().unwrap();
            let widget_js =
                std::fs::read_to_string(base_dir.join("widgets/notion-board/widget.js"))
                    .unwrap_or_default();

            let widget_api = r#"
                window.__dataHandler = null;
                window.__actionHandlers = {};
                window.widget = {
                    setData: (data) => { if (window.__dataHandler) window.__dataHandler(data); },
                    onData: (fn) => { window.__dataHandler = fn; },
                    onRefresh: (fn) => { fn(); setInterval(fn, 5000); },
                    action: (name, payload) => {
                        const handler = window.__actionHandlers[name];
                        if (handler) handler(payload);
                    },
                    onAction: (name, fn) => { window.__actionHandlers[name] = fn; }
                };
            "#;

            let init_script = format!("{widget_api}{widget_js}");

            tauri::WebviewWindowBuilder::new(
                app,
                "widget-1",
                tauri::WebviewUrl::CustomProtocol(
                    "widget://localhost/widgets/notion-board/template.html"
                        .parse()
                        .unwrap(),
                ),
            )
            .initialization_script(init_script)
            .disable_drag_drop_handler()
            .visible(true)
            .build()?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
