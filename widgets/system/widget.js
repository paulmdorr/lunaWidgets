let lastRefreshTime = Date.now();

function formatBytes(bytes) {
  if (bytes === 0 || bytes === Infinity) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}

function toGb(mb) {
  return (mb / 1024).toFixed(1);
}

function usageColor(percent) {
  if (percent >= 80) return 'red';
  if (percent >= 60) return 'orange';
  return 'green';
}

widget.onRefresh(async () => {
  const now = Date.now();
  const elapsed = (now - lastRefreshTime) / 1000;
  lastRefreshTime = now;

  const stats = await widget.getSystemStats();

  const cpuPercent = Math.round(stats.cpu_usage);
  const ramPercent =
    stats.total_memory_mb > 0
      ? Math.round((stats.used_memory_mb / stats.total_memory_mb) * 100)
      : 0;

  const disks = stats.disks.map(d => {
    const percent = d.total_mb > 0 ? Math.round((d.used_mb / d.total_mb) * 100) : 0;
    return {
      name: d.name,
      used_gb: toGb(d.used_mb),
      total_gb: toGb(d.total_mb),
      percent,
      color: usageColor(percent),
    };
  });

  const allowedInterfaces = window.__config?.interfaces ?? [];
  const networks = stats.networks
    .filter(n => allowedInterfaces.length === 0 || allowedInterfaces.includes(n.name))
    .map(n => ({
      name: n.name,
      rx: formatBytes(Math.round(n.rx_bytes / elapsed)) + '/s',
      tx: formatBytes(Math.round(n.tx_bytes / elapsed)) + '/s',
    }));

  widget.store = {
    cpu_usage: stats.cpu_usage,
    cpu_percent: cpuPercent,
    cpu_color: usageColor(cpuPercent),
    used_memory_gb: toGb(stats.used_memory_mb),
    total_memory_gb: toGb(stats.total_memory_mb),
    ram_percent: ramPercent,
    ram_color: usageColor(ramPercent),
    disks,
    networks,
  };
}, 2000);
