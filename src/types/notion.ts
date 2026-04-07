// ── Notion block types we care about rendering ──

export type NotionBlockType =
  | "paragraph"
  | "heading_1"
  | "heading_2"
  | "heading_3"
  | "bulleted_list_item"
  | "numbered_list_item"
  | "to_do"
  | "toggle"
  | "code"
  | "quote"
  | "callout"
  | "divider"
  | "image"
  | "bookmark"
  | "unsupported";

export interface RichText {
  type: "text" | "mention" | "equation";
  text?: { content: string; link: { url: string } | null };
  plain_text: string;
  href: string | null;
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
}

export interface NotionBlock {
  id: string;
  type: NotionBlockType;
  has_children: boolean;
  children?: NotionBlock[];
  // Each block type has its content under block[type]
  // We use a generic record here and cast as needed
  [key: string]: unknown;
}

export interface NotionPage {
  id: string;
  title: string;
  icon?: string;
  lastEdited: string;
  blocks: NotionBlock[];
}

export type BoardLayout = "vertical" | "horizontal";

export interface WidgetConfig {
  notionToken: string;
  pageId: string;
  refreshInterval: number; // seconds
  layouts: Record<string, BoardLayout>; // keyed by database ID
}

export interface DatabaseRow {
  id: string;
  title: string;
  status: string | null;
}

export interface NotionDatabase {
  id: string;
  title: string;
  icon?: string;
  lastEdited: string;
  rows: DatabaseRow[];
  statusGroups: { name: string; color: string }[];
  statusPropertyName: string;
  statusPropertyType: "status" | "select";
}
