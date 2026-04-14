use sysinfo::{Disks, Networks, System};

pub struct SysState {
    pub sys: System,
    pub networks: Networks,
    pub disks: Disks,
}

impl SysState {
    pub fn new() -> Self {
        Self {
            sys: System::new_all(),
            networks: Networks::new_with_refreshed_list(),
            disks: Disks::new_with_refreshed_list(),
        }
    }
}

#[derive(serde::Serialize)]
pub struct DiskInfo {
    pub name: String,
    pub total_mb: u64,
    pub used_mb: u64,
}

#[derive(serde::Serialize)]
pub struct NetworkInfo {
    pub name: String,
    pub rx_bytes: u64,
    pub tx_bytes: u64,
}

#[derive(serde::Serialize)]
pub struct SystemStats {
    pub cpu_usage: f32,
    pub cpu_count: usize,
    pub total_memory_mb: u64,
    pub used_memory_mb: u64,
    pub disks: Vec<DiskInfo>,
    pub networks: Vec<NetworkInfo>,
}

#[tauri::command]
pub fn get_system_stats(state: tauri::State<std::sync::Mutex<SysState>>) -> SystemStats {
    let mut s = state.lock().unwrap();
    s.sys.refresh_cpu_all();
    s.sys.refresh_memory();
    s.networks.refresh(false);
    s.disks.refresh(false);

    let cpu_usage = s.sys.cpus().iter().map(|c| c.cpu_usage()).sum::<f32>()
        / s.sys.cpus().len() as f32;

    let disks = s
        .disks
        .iter()
        .filter(|d| d.total_space() > 1_073_741_824) // skip partitions under 1GB
        .map(|d| {
            let total_mb = d.total_space() / 1024 / 1024;
            let used_mb = total_mb.saturating_sub(d.available_space() / 1024 / 1024);
            DiskInfo {
                name: d.mount_point().to_string_lossy().to_string(),
                total_mb,
                used_mb,
            }
        })
        .collect();

    let networks = s
        .networks
        .iter()
        .filter(|(name, _)| {
            let n = name.to_lowercase();
            !n.starts_with("lo") && !n.contains("loopback")
        })
        .map(|(name, data)| NetworkInfo {
            name: name.clone(),
            rx_bytes: data.received(),
            tx_bytes: data.transmitted(),
        })
        .collect();

    SystemStats {
        cpu_usage: (cpu_usage * 10.0).round() / 10.0,
        cpu_count: s.sys.cpus().len(),
        total_memory_mb: s.sys.total_memory() / 1024 / 1024,
        used_memory_mb: s.sys.used_memory() / 1024 / 1024,
        disks,
        networks,
    }
}
