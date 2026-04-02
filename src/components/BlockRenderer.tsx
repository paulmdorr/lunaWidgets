import React from "react";
import type { NotionBlock, RichText } from "../types/notion";

// ── Render rich text with annotations ──
function renderRichText(texts: RichText[]): React.ReactNode[] {
  return texts.map((t, i) => {
    let node: React.ReactNode = t.plain_text;
    const a = t.annotations;

    if (a.code) node = <code key={i} style={styles.inlineCode}>{node}</code>;
    if (a.bold) node = <strong key={i}>{node}</strong>;
    if (a.italic) node = <em key={i}>{node}</em>;
    if (a.strikethrough) node = <s key={i}>{node}</s>;
    if (a.underline) node = <u key={i}>{node}</u>;
    if (t.href) {
      node = (
        <a
          key={i}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
        >
          {node}
        </a>
      );
    }

    // If no wrapping happened, give it a key
    if (typeof node === "string") {
      return <span key={i}>{node}</span>;
    }

    return node;
  });
}

function getBlockContent(block: NotionBlock): RichText[] {
  const data = block[block.type] as { rich_text?: RichText[] } | undefined;
  return data?.rich_text ?? [];
}

// ── Main block renderer ──
export function BlockRenderer({ block, depth = 0 }: { block: NotionBlock; depth?: number }) {
  const richText = getBlockContent(block);
  const children = block.children?.map((child) => (
    <BlockRenderer key={child.id} block={child} depth={depth + 1} />
  ));

  switch (block.type) {
    case "paragraph":
      return (
        <p style={{ ...styles.paragraph, marginLeft: depth * 16 }}>
          {renderRichText(richText)}
        </p>
      );

    case "heading_1":
      return <h1 style={styles.h1}>{renderRichText(richText)}</h1>;

    case "heading_2":
      return <h2 style={styles.h2}>{renderRichText(richText)}</h2>;

    case "heading_3":
      return <h3 style={styles.h3}>{renderRichText(richText)}</h3>;

    case "bulleted_list_item":
      return (
        <div style={{ ...styles.listItem, marginLeft: depth * 16 }}>
          <span style={styles.bullet}>•</span>
          <div style={styles.listContent}>
            {renderRichText(richText)}
            {children}
          </div>
        </div>
      );

    case "numbered_list_item":
      return (
        <div style={{ ...styles.listItem, marginLeft: depth * 16 }}>
          <span style={styles.bullet}>–</span>
          <div style={styles.listContent}>
            {renderRichText(richText)}
            {children}
          </div>
        </div>
      );

    case "to_do": {
      const todoData = block.to_do as { checked?: boolean } | undefined;
      const checked = todoData?.checked ?? false;
      return (
        <div style={{ ...styles.todo, marginLeft: depth * 16 }}>
          <span style={checked ? styles.todoChecked : styles.todoUnchecked}>
            {checked ? "☑" : "☐"}
          </span>
          <span style={checked ? styles.todoDone : undefined}>
            {renderRichText(richText)}
          </span>
        </div>
      );
    }

    case "toggle":
      return (
        <details style={{ ...styles.toggle, marginLeft: depth * 16 }}>
          <summary style={styles.toggleSummary}>
            {renderRichText(richText)}
          </summary>
          <div style={styles.toggleContent}>{children}</div>
        </details>
      );

    case "code": {
      const codeData = block.code as { language?: string } | undefined;
      return (
        <div style={styles.codeBlock}>
          {codeData?.language && (
            <span style={styles.codeLang}>{codeData.language}</span>
          )}
          <pre style={styles.pre}>
            <code>{richText.map((t) => t.plain_text).join("")}</code>
          </pre>
        </div>
      );
    }

    case "quote":
      return (
        <blockquote style={styles.quote}>
          {renderRichText(richText)}
          {children}
        </blockquote>
      );

    case "callout": {
      const calloutData = block.callout as { icon?: { emoji?: string } } | undefined;
      return (
        <div style={styles.callout}>
          {calloutData?.icon?.emoji && (
            <span style={styles.calloutIcon}>{calloutData.icon.emoji}</span>
          )}
          <div>{renderRichText(richText)}</div>
        </div>
      );
    }

    case "divider":
      return <hr style={styles.divider} />;

    default:
      // Silently skip unsupported blocks
      return null;
  }
}

// ── Inline styles (keeps everything in one file for the scaffold) ──
const styles: Record<string, React.CSSProperties> = {
  paragraph: {
    margin: "4px 0",
    lineHeight: 1.65,
    color: "var(--text-primary)",
  },
  h1: {
    fontSize: 20,
    fontWeight: 700,
    margin: "18px 0 8px",
    color: "var(--text-primary)",
  },
  h2: {
    fontSize: 17,
    fontWeight: 650,
    margin: "14px 0 6px",
    color: "var(--text-primary)",
  },
  h3: {
    fontSize: 14,
    fontWeight: 600,
    margin: "10px 0 4px",
    color: "var(--text-primary)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
  },
  listItem: {
    display: "flex",
    gap: 8,
    margin: "3px 0",
    lineHeight: 1.6,
  },
  bullet: {
    color: "var(--text-muted)",
    flexShrink: 0,
    width: 14,
    textAlign: "center" as const,
  },
  listContent: { flex: 1 },
  todo: {
    display: "flex",
    gap: 8,
    alignItems: "flex-start",
    margin: "3px 0",
    lineHeight: 1.6,
  },
  todoUnchecked: { color: "var(--text-muted)", cursor: "default" },
  todoChecked: { color: "var(--success)" },
  todoDone: {
    textDecoration: "line-through",
    color: "var(--text-muted)",
  },
  toggle: { margin: "4px 0" },
  toggleSummary: {
    cursor: "pointer",
    color: "var(--text-primary)",
    lineHeight: 1.6,
    outline: "none",
  },
  toggleContent: { paddingLeft: 16, marginTop: 4 },
  codeBlock: {
    margin: "8px 0",
    background: "rgba(0,0,0,0.3)",
    borderRadius: "var(--radius-sm)",
    overflow: "hidden",
  },
  codeLang: {
    display: "block",
    padding: "4px 10px",
    fontSize: 10,
    textTransform: "uppercase" as const,
    color: "var(--text-muted)",
    letterSpacing: "0.5px",
    borderBottom: "1px solid var(--border)",
  },
  pre: {
    padding: "10px 12px",
    fontSize: 12,
    lineHeight: 1.5,
    fontFamily: "var(--font-mono)",
    overflowX: "auto" as const,
    color: "var(--text-primary)",
  },
  quote: {
    borderLeft: "3px solid var(--accent)",
    paddingLeft: 12,
    margin: "8px 0",
    color: "var(--text-secondary)",
    fontStyle: "italic",
  },
  callout: {
    display: "flex",
    gap: 8,
    padding: "10px 12px",
    margin: "8px 0",
    background: "var(--accent-dim)",
    borderRadius: "var(--radius-sm)",
    lineHeight: 1.6,
  },
  calloutIcon: { flexShrink: 0, fontSize: 16 },
  divider: {
    border: "none",
    borderTop: "1px solid var(--border)",
    margin: "12px 0",
  },
  inlineCode: {
    fontFamily: "var(--font-mono)",
    fontSize: "0.9em",
    padding: "1px 5px",
    borderRadius: 4,
    background: "rgba(255,255,255,0.07)",
    color: "var(--accent)",
  },
  link: {
    color: "var(--accent)",
    textDecoration: "underline",
    textUnderlineOffset: "2px",
  },
};
