import { fetch } from "@tauri-apps/plugin-http";
import type { DatabaseRow, NotionBlock, NotionDatabase, NotionPage, RichText } from "../types/notion";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Notion-Version": NOTION_VERSION,
    "Content-Type": "application/json",
  };
}

// ── Extract plain title from page/row properties or database object ──
function extractTitle(obj: Record<string, unknown>): string {
  // Database objects have a top-level `title` array
  if (Array.isArray(obj.title)) {
    return (obj.title as RichText[]).map((t) => t.plain_text).join("") || "Untitled";
  }

  // Pages and database rows have title inside `properties`
  const props = obj.properties as Record<string, unknown> | undefined;
  if (!props) return "Untitled";

  for (const val of Object.values(props)) {
    const prop = val as Record<string, unknown>;
    if (prop.type === "title") {
      const titleArr = prop.title as RichText[];
      return titleArr?.map((t) => t.plain_text).join("") || "Untitled";
    }
  }
  return "Untitled";
}

// ── Extract icon emoji ──
function extractIcon(page: Record<string, unknown>): string | undefined {
  const icon = page.icon as { type: string; emoji?: string } | null;
  if (icon?.type === "emoji") return icon.emoji;
  return undefined;
}

// ── Extract status/select value from a row ──
function extractStatus(props: Record<string, unknown>): string | null {
  for (const val of Object.values(props)) {
    const prop = val as Record<string, unknown>;
    if (prop.type === "status") {
      const s = prop.status as { name: string } | null;
      return s?.name ?? null;
    }
    if (prop.type === "select") {
      const s = prop.select as { name: string } | null;
      return s?.name ?? null;
    }
  }
  return null;
}

// ── Fetch all blocks for a page (handles pagination) ──
async function fetchBlocks(
  token: string,
  blockId: string
): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${NOTION_API}/blocks/${blockId}/children`);
    url.searchParams.set("page_size", "100");
    if (cursor) url.searchParams.set("start_cursor", cursor);

    const res = await fetch(url.toString(), { headers: headers(token) });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Notion API error: ${res.status} — ${body}`);
    }

    const data = (await res.json()) as {
      results: NotionBlock[];
      has_more: boolean;
      next_cursor: string | null;
    };

    blocks.push(...data.results);
    cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
  } while (cursor);

  for (const block of blocks) {
    if (block.has_children) {
      block.children = await fetchBlocks(token, block.id);
    }
  }

  return blocks;
}

// ── Fetch a database with all its rows ──
async function fetchDatabase(
  token: string,
  databaseId: string
): Promise<NotionDatabase> {
  // Get database metadata + schema
  const dbRes = await fetch(`${NOTION_API}/databases/${databaseId}`, {
    headers: headers(token),
  });
  if (!dbRes.ok) {
    const body = await dbRes.text();
    throw new Error(`Notion API error: ${dbRes.status} — ${body}`);
  }
  const dbData = (await dbRes.json()) as Record<string, unknown>;

  // Extract status group order from schema
  const schemaProps = dbData.properties as Record<string, Record<string, unknown>>;
  let statusGroups: { name: string; color: string }[] = [];
  for (const prop of Object.values(schemaProps)) {
    if (prop.type === "status") {
      const groups = (prop.status as { groups: { name: string; color: string }[] }).groups;
      statusGroups = groups.map((g) => ({ name: g.name, color: g.color }));
      break;
    }
    if (prop.type === "select") {
      const options = (prop.select as { options: { name: string; color: string }[] }).options;
      statusGroups = options.map((o) => ({ name: o.name, color: o.color }));
      break;
    }
  }

  // Query all rows
  const rows: DatabaseRow[] = [];
  let cursor: string | undefined;
  do {
    const body = JSON.stringify({ page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) });
    const res = await fetch(`${NOTION_API}/databases/${databaseId}/query`, {
      method: "POST",
      headers: headers(token),
      body,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Notion API error: ${res.status} — ${text}`);
    }
    const data = (await res.json()) as {
      results: Record<string, unknown>[];
      has_more: boolean;
      next_cursor: string | null;
    };

    for (const row of data.results) {
      const props = row.properties as Record<string, unknown>;
      rows.push({
        id: row.id as string,
        title: extractTitle(row),
        status: extractStatus(props),
      });
    }

    cursor = data.has_more ? (data.next_cursor ?? undefined) : undefined;
  } while (cursor);

  return {
    id: databaseId,
    title: extractTitle(dbData),
    icon: extractIcon(dbData),
    lastEdited: dbData.last_edited_time as string,
    rows,
    statusGroups,
  };
}

// ── Main: fetch a Notion page, auto-detecting page vs database ──
export async function fetchNotionPage(
  token: string,
  pageId: string
): Promise<NotionPage | NotionDatabase> {
  const pageRes = await fetch(`${NOTION_API}/pages/${pageId}`, {
    headers: headers(token),
  });

  if (pageRes.ok) {
    const pageData = (await pageRes.json()) as Record<string, unknown>;
    const blocks = await fetchBlocks(token, pageId);
    return {
      id: pageId,
      title: extractTitle(pageData),
      icon: extractIcon(pageData),
      lastEdited: pageData.last_edited_time as string,
      blocks,
    };
  }

  // 400 validation_error means it's a database
  if (pageRes.status === 400) {
    return fetchDatabase(token, pageId);
  }

  const body = await pageRes.text();
  throw new Error(`Notion API error: ${pageRes.status} — ${body}`);
}
