import React from "react";
import type { NotionBlock, RichText } from "../types/notion";
import styles from "./BlockRenderer.module.css";

function renderRichText(texts: RichText[]): React.ReactNode[] {
  return texts.map((t, i) => {
    let node: React.ReactNode = t.plain_text;
    const a = t.annotations;

    if (a.code) node = <code key={i} className={styles.inlineCode}>{node}</code>;
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
          className={styles.link}
        >
          {node}
        </a>
      );
    }

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

export function BlockRenderer({ block, depth = 0 }: { block: NotionBlock; depth?: number }) {
  const richText = getBlockContent(block);
  const children = block.children?.map((child) => (
    <BlockRenderer key={child.id} block={child} depth={depth + 1} />
  ));

  const depthStyle = depth > 0 ? { marginLeft: depth * 16 } : undefined;

  switch (block.type) {
    case "paragraph":
      return <p className={styles.paragraph} style={depthStyle}>{renderRichText(richText)}</p>;

    case "heading_1":
      return <h1 className={styles.h1}>{renderRichText(richText)}</h1>;

    case "heading_2":
      return <h2 className={styles.h2}>{renderRichText(richText)}</h2>;

    case "heading_3":
      return <h3 className={styles.h3}>{renderRichText(richText)}</h3>;

    case "bulleted_list_item":
      return (
        <div className={styles.listItem} style={depthStyle}>
          <span className={styles.bullet}>•</span>
          <div className={styles.listContent}>{renderRichText(richText)}{children}</div>
        </div>
      );

    case "numbered_list_item":
      return (
        <div className={styles.listItem} style={depthStyle}>
          <span className={styles.bullet}>–</span>
          <div className={styles.listContent}>{renderRichText(richText)}{children}</div>
        </div>
      );

    case "to_do": {
      const checked = (block.to_do as { checked?: boolean } | undefined)?.checked ?? false;
      return (
        <div className={styles.todo} style={depthStyle}>
          <span className={checked ? styles.todoChecked : styles.todoUnchecked}>
            {checked ? "☑" : "☐"}
          </span>
          <span className={checked ? styles.todoDone : undefined}>
            {renderRichText(richText)}
          </span>
        </div>
      );
    }

    case "toggle":
      return (
        <details className={styles.toggle} style={depthStyle}>
          <summary className={styles.toggleSummary}>{renderRichText(richText)}</summary>
          <div className={styles.toggleContent}>{children}</div>
        </details>
      );

    case "code": {
      const codeData = block.code as { language?: string } | undefined;
      return (
        <div className={styles.codeBlock}>
          {codeData?.language && (
            <span className={styles.codeLang}>{codeData.language}</span>
          )}
          <pre className={styles.pre}>
            <code>{richText.map((t) => t.plain_text).join("")}</code>
          </pre>
        </div>
      );
    }

    case "quote":
      return (
        <blockquote className={styles.quote}>
          {renderRichText(richText)}{children}
        </blockquote>
      );

    case "callout": {
      const calloutData = block.callout as { icon?: { emoji?: string } } | undefined;
      return (
        <div className={styles.callout}>
          {calloutData?.icon?.emoji && (
            <span className={styles.calloutIcon}>{calloutData.icon.emoji}</span>
          )}
          <div>{renderRichText(richText)}</div>
        </div>
      );
    }

    case "divider":
      return <hr className={styles.divider} />;

    default:
      return null;
  }
}
