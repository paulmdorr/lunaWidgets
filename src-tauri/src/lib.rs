use std::collections::HashMap;
use std::fs;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;
use tauri_plugin_http::reqwest;

const MUSTACHE_JS: &str = include_str!("../mustache.min.js");

#[derive(serde::Deserialize)]
struct WidgetManifest {
    name: String,
    width: Option<u32>,
    height: Option<u32>,
    #[serde(default)]
    resizable: bool,
    #[serde(default)]
    transparent: bool,
    #[serde(default)]
    decorations: bool,
}

#[derive(serde::Deserialize)]
struct FetchRequest {
    url: String,
    method: Option<String>,
    headers: Option<HashMap<String, String>>,
    body: Option<String>,
}

#[derive(serde::Serialize)]
struct FetchResponse {
    status: u16,
    body: String,
}

#[tauri::command]
async fn widget_fetch(request: FetchRequest) -> Result<FetchResponse, String> {
    let client = reqwest::Client::new();
    let method = request.method.unwrap_or("GET".to_string());
    let mut req = client.request(
        reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?,
        &request.url,
    );
    if let Some(headers) = request.headers {
        for (k, v) in headers {
            req = req.header(&k, &v);
        }
    }
    if let Some(body) = request.body {
        req = req.body(body);
    }
    let res = req.send().await.map_err(|e| e.to_string())?;
    let status = res.status().as_u16();
    let body = res.text().await.map_err(|e| e.to_string())?;
    Ok(FetchResponse { status, body })
}

#[tauri::command]
fn start_dragging(window: tauri::WebviewWindow) {
    window.start_dragging().ok();
}

fn copy_dir_all(src: &std::path::Path, dst: &std::path::Path) -> std::io::Result<()> {
    fs::create_dir_all(dst)?;
    for entry in fs::read_dir(src)? {
        let entry = entry?;
        let dst_path = dst.join(entry.file_name());
        if entry.path().is_dir() {
            copy_dir_all(&entry.path(), &dst_path)?;
        } else {
            fs::copy(entry.path(), dst_path)?;
        }
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![widget_fetch, start_dragging])
        .register_uri_scheme_protocol("widget", |app, request| {
            let base_dir = app.app_handle().path().app_data_dir().unwrap();
            let path = request.uri().path().to_string();

            // Auto-generate the HTML shell — no template.html needed on disk
            if path.ends_with("/template.html") {
                let html = concat!(
                    "<!doctype html><html><head>",
                    "<meta charset=\"UTF-8\"/>",
                    "<link rel=\"stylesheet\" href=\"style.css\"/>",
                    "</head><body><div id=\"app\"></div></body></html>"
                );
                return tauri::http::Response::builder()
                    .header("Content-Type", "text/html")
                    .header("Access-Control-Allow-Origin", "*")
                    .body(html.as_bytes().to_vec())
                    .unwrap();
            }

            let file_path = base_dir.join(&path[1..]);

            let content_type = if path.ends_with(".js") {
                "application/javascript"
            } else if path.ends_with(".css") {
                "text/css"
            } else {
                "text/plain"
            };

            match fs::read(&file_path) {
                Ok(bytes) => tauri::http::Response::builder()
                    .header("Content-Type", content_type)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(bytes)
                    .unwrap(),
                Err(_) => tauri::http::Response::builder()
                    .status(404)
                    .body(vec![])
                    .unwrap(),
            }
        })
        .setup(|app| {
            let widget_api = r#"
                window.__actionHandlers = {};
                window.__state = {};
                window.__renderFn = null;
                window.widget = {
                    onRefresh: (fn) => { fn(); setInterval(fn, 5000); },
                    action: (name, payload) => {
                        const handler = window.__actionHandlers[name];
                        if (handler) handler(payload);
                    },
                    onAction: (name, fn) => { window.__actionHandlers[name] = fn; },
                    useState: (initial) => { window.__state = {...initial}; return window.__state; },
                    setState: (partial) => {
                        window.__state = {...window.__state, ...partial};
                        if (window.__renderFn && document.readyState !== 'loading') {
                            window.__renderFn(window.__state);
                        }
                    },
                    render: (callback) => {
                        const tmpl = typeof callback === 'string' ? callback : window.__widgetTemplate;
                        const after = typeof callback === 'function' ? callback : null;
                        window.__renderFn = (s) => {
                            if (!tmpl) return;
                            document.getElementById('app').innerHTML = Mustache.render(tmpl, s);
                            if (after) after();
                        };
                        if (document.readyState === 'loading') {
                            document.addEventListener('DOMContentLoaded', () => window.__renderFn(window.__state));
                        } else {
                            window.__renderFn(window.__state);
                        }
                    },
                    fetch: async (url, options = {}) => {
                        const result = await window.__TAURI__.core.invoke('widget_fetch', {
                            request: {
                                url,
                                method: options.method || 'GET',
                                headers: options.headers || {},
                                body: options.body || null,
                            }
                        });
                        return {
                            ok: result.status >= 200 && result.status < 300,
                            status: result.status,
                            json: () => Promise.resolve(JSON.parse(result.body)),
                            text: () => Promise.resolve(result.body),
                        };
                    }
                };
                document.addEventListener('mousedown', e => {
                    if (e.ctrlKey) window.__TAURI__.core.invoke('start_dragging');
                });
            "#;

            let base_dir = app.path().app_data_dir().unwrap();
            let widgets_dir = base_dir.join("widgets");

            if !widgets_dir.exists() {
                let resource_widgets = app.path().resource_dir().unwrap().join("widgets");
                copy_dir_all(&resource_widgets, &widgets_dir).ok();
            }

            if let Ok(entries) = fs::read_dir(base_dir.join("widgets/")) {
                for entry in entries {
                    if let Ok(entry) = entry {
                        let path = entry.path();
                        if !path.is_dir() {
                            continue;
                        }

                        let filename = entry.file_name();
                        let widget_dir = filename.to_str().unwrap();

                        let manifest: WidgetManifest = fs::read_to_string(
                            base_dir.join(format!("widgets/{widget_dir}/widget.json")),
                        )
                        .ok()
                        .and_then(|s| serde_json::from_str(&s).ok())
                        .unwrap_or(WidgetManifest {
                            name: "Widget".to_string(),
                            width: None,
                            height: None,
                            resizable: true,
                            transparent: false,
                            decorations: true,
                        });

                        let widget_js = fs::read_to_string(
                            base_dir.join(format!("widgets/{widget_dir}/widget.js")),
                        )
                        .unwrap_or_default();

                        let config_json = fs::read_to_string(
                            base_dir.join(format!("widgets/{widget_dir}/config.json")),
                        )
                        .unwrap_or("{}".to_string());

                        let widget_template = fs::read_to_string(
                            base_dir.join(format!("widgets/{widget_dir}/template.mustache")),
                        )
                        .unwrap_or_default();
                        let template_json = serde_json::to_string(&widget_template)
                            .unwrap_or_else(|_| "\"\"".to_string());

                        let init_script = format!(
                            "{MUSTACHE_JS}\n{widget_api}window.__widgetTemplate = {template_json};\nwindow.__config = {config_json};\n{widget_js}"
                        );

                        let mut builder = tauri::WebviewWindowBuilder::new(
                            app,
                            widget_dir,
                            tauri::WebviewUrl::CustomProtocol(
                                format!("widget://localhost/widgets/{widget_dir}/template.html")
                                    .parse()
                                    .unwrap(),
                            ),
                        )
                        .initialization_script(&init_script)
                        .disable_drag_drop_handler()
                        .title(manifest.name)
                        .resizable(manifest.resizable)
                        .transparent(manifest.transparent)
                        .decorations(manifest.decorations)
                        .visible(true)
                        .shadow(false)
                        .skip_taskbar(true);

                        if let Some(w) = manifest.width {
                            if let Some(h) = manifest.height {
                                builder = builder.inner_size(w as f64, h as f64);
                            }
                        }

                        let window = builder.build()?;
                        window.set_always_on_bottom(true)?;
                    }
                }
            }

            let reload = MenuItemBuilder::new("Reload Widgets")
                .id("reload")
                .build(app)?;
            let quit = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let menu = MenuBuilder::new(app).items(&[&reload, &quit]).build()?;

            TrayIconBuilder::new()
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "reload" => {
                        for (_, window) in app.webview_windows() {
                            window.reload().ok();
                        }
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        for (_, window) in app.webview_windows() {
                            window.show().ok();
                        }
                    }
                })
                .build(app)?;

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
