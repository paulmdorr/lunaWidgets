const MAX_SYSTEM_PROCESSES = 50;

let sortCol = 'cpu';
let sortDir = 'desc';
let rawProcesses = [];
let lastStats = {};
let pendingKill = null;

// Append dialog to body once — lives outside #app so it survives re-renders
const dialog = document.createElement('div');
dialog.className = 'confirm-overlay';
dialog.id = 'confirm-overlay';
dialog.innerHTML = `
  <div class="confirm-dialog">
    <p>Kill <strong id="confirm-name"></strong>?</p>
    <div class="confirm-actions">
      <button id="confirm-cancel">Cancel</button>
      <button id="confirm-kill">Kill</button>
    </div>
  </div>
`;
document.body.appendChild(dialog);

document.getElementById('confirm-cancel').addEventListener('click', () => {
  pendingKill = null;
  document.getElementById('confirm-overlay').classList.remove('visible');
});

document.getElementById('confirm-kill').addEventListener('click', async () => {
  if (!pendingKill) return;
  document.getElementById('confirm-overlay').classList.remove('visible');
  await window.__TAURI__.core.invoke('kill_process', { pid: pendingKill.pid });
  pendingKill = null;
});

function sortIndicator(col) {
  if (sortCol !== col) return '';
  return sortDir === 'asc' ? '↑' : '↓';
}

function buildState() {
  const sorted = [...rawProcesses].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    if (sortCol === 'cpu') return (a.cpu - b.cpu) * dir;
    if (sortCol === 'memory') return (a.memory_mb - b.memory_mb) * dir;
    return a.name.localeCompare(b.name) * dir;
  });

  const apps = sorted.filter(p => p.is_app);
  const processes = sorted.filter(p => !p.is_app).slice(0, MAX_SYSTEM_PROCESSES);

  return {
    ...lastStats,
    apps,
    processes,
    sort_cpu: sortIndicator('cpu'),
    sort_mem: sortIndicator('memory'),
    sort_name: sortIndicator('name'),
  };
}

widget.render(() => {
  const appsList = document.getElementById('apps-list');
  const systemList = document.getElementById('system-list');
  appsList.classList.toggle('empty', appsList.querySelectorAll('.process').length === 0);
  systemList.classList.toggle('empty', systemList.querySelectorAll('.process').length === 0);

  document.querySelectorAll('.kill').forEach(btn => {
    btn.addEventListener('click', () => {
      pendingKill = { pid: parseInt(btn.dataset.pid), name: btn.dataset.name };
      document.getElementById('confirm-overlay').classList.add('visible');
      document.getElementById('confirm-name').textContent = pendingKill.name;
    });
  });

  document.querySelectorAll('.sort-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const col = btn.dataset.col;
      if (sortCol === col) {
        sortDir = sortDir === 'asc' ? 'desc' : 'asc';
      } else {
        sortCol = col;
        sortDir = 'desc';
      }
      widget.setState(buildState());
    });
  });
});

widget.onRefresh(async () => {
  const [processes, stats] = await Promise.all([
    window.__TAURI__.core.invoke('get_processes'),
    window.__TAURI__.core.invoke('get_system_stats'),
  ]);
  rawProcesses = processes;
  lastStats = {
    cpu_usage: stats.cpu_usage,
    used_memory_mb: stats.used_memory_mb,
    total_memory_mb: stats.total_memory_mb,
  };
  widget.setState(buildState());
});
