use tauri::Manager;

#[cfg(target_os = "windows")]
static WORKER_W_HWND: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

#[cfg(target_os = "windows")]
fn pin_to_desktop(hwnd: windows::Win32::Foundation::HWND) {
    use std::sync::atomic::Ordering;
    use windows::Win32::Foundation::{HWND, LPARAM};
    use windows::Win32::UI::WindowsAndMessaging::{
        EnumWindows, FindWindowExW, FindWindowW, SendMessageTimeoutW, SetParent, SMTO_NORMAL,
    };
    use windows::core::PCWSTR;

    unsafe {
        let progman: Vec<u16> = "Progman\0".encode_utf16().collect();

        let progman_hwnd = match FindWindowW(PCWSTR(progman.as_ptr()), PCWSTR::null()) {
            Ok(h) => h,
            Err(_) => return,
        };

        let mut result = 0usize;
        let _ = SendMessageTimeoutW(
            progman_hwnd,
            0x052C,
            None,
            None,
            SMTO_NORMAL,
            1000,
            Some(&mut result),
        );

        static WORKER_W: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);

        unsafe extern "system" fn enum_proc(
            hwnd: HWND,
            _: LPARAM,
        ) -> windows::Win32::Foundation::BOOL {
            let shelldll: Vec<u16> = "SHELLDLL_DefView\0".encode_utf16().collect();
            let workerw: Vec<u16> = "WorkerW\0".encode_utf16().collect();

            let child = FindWindowExW(hwnd, None, PCWSTR(shelldll.as_ptr()), PCWSTR::null());
            if let Ok(child) = child {
                if !child.is_invalid() {
                    if let Ok(parent) = windows::Win32::UI::WindowsAndMessaging::GetParent(hwnd) {
                        if let Ok(ww) = FindWindowExW(
                            parent,
                            hwnd,
                            PCWSTR(workerw.as_ptr()),
                            PCWSTR::null(),
                        ) {
                            WORKER_W.store(ww.0 as usize, std::sync::atomic::Ordering::Relaxed);
                        }
                    }
                    return false.into();
                }
            }
            true.into()
        }

        let _ = EnumWindows(Some(enum_proc), LPARAM(0));

        let worker_w = HWND(WORKER_W.load(Ordering::Relaxed) as _);
        if !worker_w.is_invalid() {
            let _ = SetParent(hwnd, worker_w);
            WORKER_W_HWND.store(worker_w.0 as usize, Ordering::Relaxed);
        }
    }
}

#[cfg(target_os = "windows")]
fn set_no_activate(app: &tauri::AppHandle, enable: bool) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        GetWindowLongPtrW, SetWindowLongPtrW, GWL_EXSTYLE, WS_EX_NOACTIVATE,
    };
    let window = app.get_webview_window("main").unwrap();
    let hwnd = HWND(window.hwnd().unwrap().0 as _);
    unsafe {
        let ex_style = GetWindowLongPtrW(hwnd, GWL_EXSTYLE);
        let new_style = if enable {
            ex_style | WS_EX_NOACTIVATE.0 as isize
        } else {
            ex_style & !(WS_EX_NOACTIVATE.0 as isize)
        };
        SetWindowLongPtrW(hwnd, GWL_EXSTYLE, new_style);
    }
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn enable_no_activate(app: tauri::AppHandle) {
    set_no_activate(&app, true);
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn disable_no_activate(app: tauri::AppHandle) {
    set_no_activate(&app, false);
}

#[cfg(target_os = "windows")]
#[tauri::command]
fn move_widget(app: tauri::AppHandle, x: i32, y: i32) {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::UI::WindowsAndMessaging::{
        SetWindowPos, SWP_NOACTIVATE, SWP_NOSIZE, SWP_NOZORDER,
    };

    let window = app.get_webview_window("main").unwrap();
    let hwnd = window.hwnd().unwrap();
    let hwnd = HWND(hwnd.0 as _);

    unsafe {
        let _ = SetWindowPos(hwnd, None, x, y, 0, 0, SWP_NOZORDER | SWP_NOSIZE | SWP_NOACTIVATE);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .invoke_handler(tauri::generate_handler![move_widget, enable_no_activate, disable_no_activate])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.show().unwrap();

            #[cfg(target_os = "windows")]
            {
                let hwnd = window.hwnd().unwrap();
                pin_to_desktop(windows::Win32::Foundation::HWND(hwnd.0 as _));
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
