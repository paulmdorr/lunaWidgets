use std::fs;
use tauri::menu::{MenuBuilder, MenuItemBuilder};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::Manager;

mod commands;

const MUSTACHE_JS: &str = include_str!("imports/mustache.min.js");
const WIDGET_API: &str = include_str!("imports/widget-api.js");

// Structs

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

// Protocol handler

fn serve_widget_file(base_dir: &std::path::Path, path: &str) -> tauri::http::Response<Vec<u8>> {
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

    let content_type = if path.ends_with(".js") {
        "application/javascript"
    } else if path.ends_with(".css") {
        "text/css"
    } else if path.ends_with(".mustache") {
        "text/plain"
    } else if path.ends_with(".json") {
        "application/json"
    } else {
        "text/plain"
    };

    match fs::read(base_dir.join(&path[1..])) {
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
}

// Widget loading

fn build_init_script() -> String {
    format!(
        r#"{MUSTACHE_JS}
{WIDGET_API}
(async () => {{
    const base = window.location.href.replace('template.html', '');
    const [configRes, templateRes, widgetRes] = await Promise.all([
        fetch(base + 'config.json').catch(() => null),
        fetch(base + 'template.mustache').catch(() => null),
        fetch(base + 'widget.js').catch(() => null),
    ]);
    window.__config = configRes?.ok ? await configRes.json() : {{}};
    window.__widgetTemplate = templateRes?.ok ? await templateRes.text() : '';
    const __js = widgetRes?.ok ? await widgetRes.text() : '';
    if (__js) new Function(__js)();
}})();
"#
    )
}

fn load_widgets(app: &tauri::AppHandle) {
    let base_dir = app.path().app_data_dir().unwrap();

    if let Ok(entries) = fs::read_dir(base_dir.join("widgets/")) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }

            let filename = entry.file_name();
            let widget_dir = filename.to_str().unwrap();

            let manifest: WidgetManifest =
                fs::read_to_string(base_dir.join(format!("widgets/{widget_dir}/widget.json")))
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

            let init_script = build_init_script();

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

            if let Ok(window) = builder.build() {
                window.set_always_on_bottom(true).ok();
            }
        }
    }
}

// Utilities

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

// App entry point

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(std::sync::Mutex::new(commands::system::SysState::new()))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![
            commands::http::widget_fetch,
            commands::window::start_dragging,
            commands::system::get_system_stats,
        ])
        .register_uri_scheme_protocol("widget", |app, request| {
            let base_dir = app.app_handle().path().app_data_dir().unwrap();
            serve_widget_file(&base_dir, request.uri().path())
        })
        .setup(|app| {
            let base_dir = app.path().app_data_dir().unwrap();
            let widgets_dir = base_dir.join("widgets");

            if !widgets_dir.exists() {
                let resource_widgets = app.path().resource_dir().unwrap().join("widgets");
                copy_dir_all(&resource_widgets, &widgets_dir).ok();
            }

            load_widgets(app.handle());

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
                        for (_, window) in tray.app_handle().webview_windows() {
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
