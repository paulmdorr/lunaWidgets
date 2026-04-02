# Notion Widget

A lightweight, cross-platform desktop widget that displays Notion page content. Built with Tauri 2, React, and TypeScript.

![widget](https://img.shields.io/badge/platform-Windows%20|%20Linux-blue)

## Features

- **Frameless, always-on-top window** — sits on your desktop like a native widget
- **Renders Notion blocks** — headings, paragraphs, to-dos, lists, code, quotes, callouts, toggles, dividers
- **Auto-refresh** — configurable polling interval
- **Draggable** — drag from the title bar to reposition
- **Resizable** — grab any edge to resize
- **Tiny footprint** — Tauri uses the system webview, no bundled Chromium

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Rust](https://rustup.rs/) (stable)
- Tauri v2 system dependencies:
  - **Windows**: WebView2 (comes with Windows 11)
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`

## Setup

### 1. Install dependencies

```bash
bun install
```

### 2. Create a Notion integration

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **"New integration"**
3. Give it a name (e.g. "Desktop Widget")
4. Select the workspace
5. Copy the **Internal Integration Secret** (starts with `ntn_`) — you'll paste it into the widget's setup screen when you first run the app (step 4)

### 3. Share a page with the integration

1. Open the Notion page you want to display
2. Click **"..."** → **"Connections"** → **"Connect to"** → select your integration
3. Copy the page URL or ID — you'll paste it into the widget's setup screen alongside the token (step 4)

### 4. Run in development

```bash
bun run tauri dev
```

The widget will open — enter your token and page ID in the setup screen.

### 5. Build for production

```bash
bun run tauri build
```

Binaries will be in `src-tauri/target/release/`.

## Project Structure

```
notion-widget/
├── src/                        # React frontend
│   ├── components/
│   │   ├── BlockRenderer.tsx   # Renders Notion blocks
│   │   ├── SetupScreen.tsx     # Config form
│   │   └── TitleBar.tsx        # Draggable title bar
│   ├── hooks/
│   │   └── useNotionPage.ts    # Fetch + auto-refresh hook
│   ├── services/
│   │   ├── config.ts           # Config persistence
│   │   └── notion.ts           # Notion API client
│   ├── styles/
│   │   └── global.css          # Theme + base styles
│   ├── types/
│   │   └── notion.ts           # TypeScript types
│   ├── App.tsx                 # Root component
│   └── main.tsx                # Entry point
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── lib.rs              # Tauri app setup
│   │   └── main.rs             # Entry point
│   ├── capabilities/
│   │   └── default.json        # Permissions
│   ├── Cargo.toml
│   └── tauri.conf.json         # Window config
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Next Steps / Ideas

- [ ] **Toggle to-do items** — write back to Notion via the API
- [ ] **Multiple pages** — tab between different pages
- [ ] **Database view** — render Notion databases as tables or kanban
- [ ] **System tray** — minimize to tray, show/hide with hotkey
- [ ] **Themes** — light mode, custom accent colors
- [ ] **Drag-and-drop positioning** — remember window position

## Notes on CORS

The Notion API doesn't support browser CORS. In development, `vite.config.ts` can be extended with a proxy, or you can use `tauri-plugin-http` (already configured) which bypasses CORS entirely since requests go through the Rust backend. The scaffold is set up to use `tauri-plugin-http` for production — you may need to switch from `fetch()` to `@tauri-apps/plugin-http`'s `fetch` in `notion.ts` if browser fetch is blocked.

Quick fix for dev if needed — add to `vite.config.ts`:

```ts
server: {
  proxy: {
    '/notion-api': {
      target: 'https://api.notion.com/v1',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/notion-api/, ''),
    },
  },
},
```

Then change `NOTION_API` in `notion.ts` to `"/notion-api"` for dev mode.
