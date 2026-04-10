use sysinfo::System;

#[derive(serde::Serialize)]
pub struct ProcessInfo {
    pub pid: u32,
    pub name: String,
    pub cpu: f32,
    pub memory_mb: u64,
    pub is_app: bool,
}

#[derive(serde::Serialize)]
pub struct SystemStats {
    pub total_memory_mb: u64,
    pub used_memory_mb: u64,
    pub cpu_count: usize,
    pub cpu_usage: f32,
}

fn is_app_process(process: &sysinfo::Process) -> bool {
    let Some(path) = process.exe() else { return false };
    let path_str = path.to_string_lossy().to_lowercase();
    #[cfg(target_os = "windows")]
    return path_str.contains("\\program files\\")
        || path_str.contains("\\program files (x86)\\")
        || path_str.contains("\\appdata\\local\\")
        || path_str.contains("\\appdata\\roaming\\");
    #[cfg(target_os = "macos")]
    return path_str.contains("/applications/") || path_str.contains(".app/contents/");
    #[cfg(not(any(target_os = "windows", target_os = "macos")))]
    return !path_str.starts_with("/usr/")
        && !path_str.starts_with("/bin/")
        && !path_str.starts_with("/sbin/")
        && !path_str.starts_with("/lib/");
}

fn strip_exe(name: &str) -> String {
    name.strip_suffix(".exe").unwrap_or(name).to_string()
}

#[tauri::command]
pub fn get_processes() -> Vec<ProcessInfo> {
    let mut sys = System::new_all();
    sys.refresh_all();
    let cpu_count = sys.cpus().len() as f32;
    sys.processes()
        .values()
        .map(|p| ProcessInfo {
            pid: p.pid().as_u32(),
            name: strip_exe(&p.name().to_string_lossy()),
            cpu: (p.cpu_usage() / cpu_count * 10.0).round() / 10.0,
            memory_mb: p.memory() / 1024 / 1024,
            is_app: is_app_process(p),
        })
        .collect()
}

#[tauri::command]
pub fn get_system_stats() -> SystemStats {
    let mut sys = System::new_all();
    sys.refresh_all();
    let cpu_usage = sys.cpus().iter().map(|c| c.cpu_usage()).sum::<f32>()
        / sys.cpus().len() as f32;
    SystemStats {
        total_memory_mb: sys.total_memory() / 1024 / 1024,
        used_memory_mb: sys.used_memory() / 1024 / 1024,
        cpu_count: sys.cpus().len(),
        cpu_usage: (cpu_usage * 10.0).round() / 10.0,
    }
}

#[tauri::command]
pub fn kill_process(pid: u32) -> Result<(), String> {
    let sys = System::new_all();
    let pid = sysinfo::Pid::from_u32(pid);
    if let Some(process) = sys.process(pid) {
        process.kill();
        Ok(())
    } else {
        Err(format!("Process {} not found", pid))
    }
}
