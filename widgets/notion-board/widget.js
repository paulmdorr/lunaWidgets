const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

const STATUS_COLORS = {
  gray: '#9b9b9b',
  brown: '#c07a5a',
  orange: '#d9730d',
  yellow: '#cb912f',
  green: '#448361',
  blue: '#337ea9',
  purple: '#9065b0',
  pink: '#c14c8a',
  red: '#d44c47',
  default: '#9b9b9b',
};

function notionHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    'Notion-Version': NOTION_VERSION,
    'Content-Type': 'application/json',
  };
}

function extractTitle(obj) {
  if (Array.isArray(obj.title)) {
    return obj.title.map(t => t.plain_text).join('') || 'Untitled';
  }
  const props = obj.properties;
  if (!props) return 'Untitled';
  for (const val of Object.values(props)) {
    if (val.type === 'title') {
      return (val.title || []).map(t => t.plain_text).join('') || 'Untitled';
    }
  }
  return 'Untitled';
}

function extractStatus(props) {
  for (const val of Object.values(props)) {
    if (val.type === 'status') return val.status?.name ?? null;
    if (val.type === 'select') return val.select?.name ?? null;
  }
  return null;
}

async function fetchDatabase(token, databaseId) {
  const dbRes = await widget.fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: notionHeaders(token),
  });
  if (!dbRes.ok) throw new Error(`Notion API error: ${dbRes.status}`);
  const dbData = await dbRes.json();

  const schemaProps = dbData.properties;
  let statusGroups = [];
  let statusPropertyName = 'Status';
  let statusPropertyType = 'status';

  for (const [name, prop] of Object.entries(schemaProps)) {
    if (prop.type === 'status') {
      statusGroups = prop.status.groups.map(g => ({ name: g.name, color: g.color }));
      statusPropertyName = name;
      statusPropertyType = 'status';
      break;
    }
    if (prop.type === 'select') {
      statusGroups = prop.select.options.map(o => ({ name: o.name, color: o.color }));
      statusPropertyName = name;
      statusPropertyType = 'select';
      break;
    }
  }

  const rows = [];
  let cursor;
  do {
    const body = JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    const res = await widget.fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: 'POST',
      headers: notionHeaders(token),
      body,
    });
    if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
    const data = await res.json();
    for (const row of data.results) {
      rows.push({
        id: row.id,
        title: extractTitle(row),
        status: extractStatus(row.properties),
      });
    }
    cursor = data.has_more ? data.next_cursor : undefined;
  } while (cursor);

  return {
    id: databaseId,
    title: extractTitle(dbData),
    rows,
    statusGroups,
    statusPropertyName,
    statusPropertyType,
  };
}

async function updateRowStatus(token, rowId, statusPropertyName, statusPropertyType, newStatus) {
  const res = await widget.fetch(`${NOTION_API}/pages/${rowId}`, {
    method: 'PATCH',
    headers: notionHeaders(token),
    body: JSON.stringify({
      properties: {
        [statusPropertyName]: {
          [statusPropertyType]: { name: newStatus },
        },
      },
    }),
  });
  if (!res.ok) throw new Error(`Notion API error: ${res.status}`);
}

function processState(data) {
  const isHorizontal = window.__config.layout === 'horizontal';
  const ordered = data.statusGroups.map(g => g.name);
  const ungrouped = data.rows.filter(r => !r.status || !ordered.includes(r.status));

  const groups = ordered.map(name => {
    const g = data.statusGroups.find(sg => sg.name === name);
    const rows = data.rows.filter(r => r.status === name);
    return {
      name,
      isHorizontal,
      colorHex: STATUS_COLORS[g?.color ?? 'default'] ?? STATUS_COLORS.default,
      count: rows.length,
      rows,
    };
  });

  if (ungrouped.length > 0) {
    groups.push({
      name: 'Other',
      isHorizontal,
      colorHex: STATUS_COLORS.default,
      count: ungrouped.length,
      rows: ungrouped,
    });
  }

  return { groups, isHorizontal };
}

let isDragging = false;
let pendingState = null;

function attachEventListeners() {
  document.querySelectorAll('.row').forEach(rowEl => {
    rowEl.addEventListener('dragstart', e => {
      e.dataTransfer.setData('rowId', rowEl.dataset.id);
      e.dataTransfer.setData('sourceStatus', rowEl.dataset.status);
      isDragging = true;
      window.__isDragging = true;
      document.querySelectorAll('.drop-overlay').forEach(o => {
        if (!o.parentElement.contains(rowEl)) o.classList.add('active');
      });
    });
    rowEl.addEventListener('dragend', () => {
      isDragging = false;
      window.__isDragging = false;
      document.querySelectorAll('.drop-overlay').forEach(o => o.classList.remove('active'));
      if (pendingState) {
        const s = pendingState;
        pendingState = null;
        window.__renderFn(s);
      }
    });
  });

  document.querySelectorAll('.drop-overlay').forEach(overlay => {
    const groupName = overlay.dataset.group;
    overlay.addEventListener('dragover', e => e.preventDefault());
    overlay.addEventListener('dragenter', () => overlay.classList.add('hover'));
    overlay.addEventListener('dragleave', () => overlay.classList.remove('hover'));
    overlay.addEventListener('drop', e => {
      e.preventDefault();
      overlay.classList.remove('hover');
      const rowId = e.dataTransfer.getData('rowId');
      const sourceStatus = e.dataTransfer.getData('sourceStatus');
      if (!rowId || sourceStatus === groupName) return;

      const draggedEl = document.querySelector(`[data-id="${rowId}"]`);
      if (draggedEl) {
        draggedEl.dataset.status = groupName;
        overlay.parentElement.insertBefore(draggedEl, overlay);
      }

      widget.action('moveItem', { rowId, targetStatus: groupName, sourceStatus });
    });
  });
}

widget.render((state) => {
  if (!state.groups) return;
  if (isDragging) { pendingState = state; return; }
  document.getElementById('app').innerHTML = Mustache.render(window.__widgetTemplate, state);
  attachEventListeners();
});

const { token, pageId } = window.__config;
let state = null;
let isUpdating = false;
let lastMoveTime = 0;
const MOVE_COOLDOWN = 15000;

widget.onAction('moveItem', async ({ rowId, targetStatus, sourceStatus }) => {
  isUpdating = true;
  lastMoveTime = Date.now();
  state.rows = state.rows.map(r => (r.id === rowId ? { ...r, status: targetStatus } : r));
  widget.setState(processState(state));

  try {
    await updateRowStatus(token, rowId, state.statusPropertyName, state.statusPropertyType, targetStatus);
  } catch (e) {
    state.rows = state.rows.map(r => (r.id === rowId ? { ...r, status: sourceStatus } : r));
    widget.setState(processState(state));
  } finally {
    isUpdating = false;
  }
});

widget.onRefresh(async () => {
  if (isUpdating || window.__isDragging) return;
  if (Date.now() - lastMoveTime < MOVE_COOLDOWN) return;
  try {
    state = await fetchDatabase(token, pageId);
    widget.setState(processState(state));
  } catch (e) {
    console.error('Failed to fetch Notion data:', e);
  }
});
