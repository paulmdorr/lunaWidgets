const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

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

const { token, pageId } = window.__config;
let state = null;

let isUpdating = false;
let lastMoveTime = 0;
const MOVE_COOLDOWN = 15000;

widget.onAction('moveItem', async ({ rowId, targetStatus, sourceStatus }) => {
  isUpdating = true;
  lastMoveTime = Date.now();
  state.rows = state.rows.map(r => (r.id === rowId ? { ...r, status: targetStatus } : r));

  try {
    await updateRowStatus(
      token,
      rowId,
      state.statusPropertyName,
      state.statusPropertyType,
      targetStatus
    );
  } catch (e) {
    state.rows = state.rows.map(r => (r.id === rowId ? { ...r, status: sourceStatus } : r));
    widget.setData(state);
  } finally {
    isUpdating = false;
  }
});

widget.onRefresh(async () => {
  if (isUpdating || window.__isDragging) return;
  if (Date.now() - lastMoveTime < MOVE_COOLDOWN) return;
  try {
    state = await fetchDatabase(token, pageId);
    widget.setData(state);
  } catch (e) {
    console.error('Failed to fetch Notion data:', e);
  }
});
