![Logo of Luna Widgets](/src-tauri/icons/icon.png)

# Luna Widgets

A lightweight desktop widget platform built with Tauri 2. Widgets are plain HTML, CSS, and JavaScript — no framework, no build step, no boilerplate. Drop a folder into the app's data directory and it appears on your desktop — always-on-bottom, transparent, frameless.

![platform](https://img.shields.io/badge/platform-Windows%20|%20macOS%20|%20Linux-blue)

## Features

- **Widget platform** — load any number of self-contained widgets from a directory
- **Mustache templates** — declarative HTML templates with automatic re-rendering
- **Always-on-bottom** — widgets sit behind all other windows like wallpaper
- **Ctrl+drag** — reposition any widget by holding Ctrl and dragging
- **Position persistence** — window positions are saved across restarts
- **System tray** — reload all widgets or quit from the tray icon
- **Tiny footprint** — uses the system WebView, no bundled Chromium

## Prerequisites

- [Bun](https://bun.sh/) (v1.0+)
- [Rust](https://rustup.rs/) (stable)
- **Windows**: WebView2 (included with Windows 11)
- **macOS**: Xcode Command Line Tools — `xcode-select --install`
- **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libayatana-appindicator3-dev librsvg2-dev`

## Running

```bash
bun install
bun run tauri dev
```

```bash
# Production build
bun run tauri build
```

## Widgets Directory

Widgets are loaded from the app's data directory:

| Platform | Path                                                          |
| -------- | ------------------------------------------------------------- |
| Windows  | `%APPDATA%\com.luna-widgets.app\widgets\`                     |
| macOS    | `~/Library/Application Support/com.luna-widgets.app/widgets/` |
| Linux    | `~/.local/share/com.luna-widgets.app/widgets/`                |

Each subdirectory is a widget. The app loads all of them on startup.

## Creating a Widget

A widget is a folder with the following files:

```
my-widget/
├── widget.json         # required — manifest
├── widget.js           # required — logic
├── template.mustache   # recommended — HTML template
├── style.css           # recommended — styles
└── config.json         # optional — user config
```

### widget.json

Controls the window appearance:

```json
{
  "name": "My Widget",
  "width": 300,
  "height": 200,
  "resizable": false,
  "transparent": true,
  "decorations": false
}
```

| Field         | Type    | Default  | Description                       |
| ------------- | ------- | -------- | --------------------------------- |
| `name`        | string  | `Widget` | Window title                      |
| `width`       | number  | —        | Initial width in pixels           |
| `height`      | number  | —        | Initial height in pixels          |
| `resizable`   | boolean | `true`   | Whether the window can be resized |
| `transparent` | boolean | `false`  | Transparent window background     |
| `decorations` | boolean | `true`   | Show native window title bar      |

### template.mustache

The HTML content rendered inside `#app`. Uses [Mustache](https://mustache.github.io/) syntax — variables from `widget.setState` are available directly:

```mustache
<div class="card">
  <h1>{{title}}</h1>
  <p>{{description}}</p>
  {{#items}}
  <div class="item">{{name}}</div>
  {{/items}}
</div>
```

### style.css

Standard CSS. Loaded automatically — no `<link>` tag needed. Target `body` and `#app` for layout:

```css
body {
  background: transparent;
  font-family: sans-serif;
  color: white;
}

#app {
  height: 100%;
}
```

### widget.js

The logic layer. Has access to the `widget` API and `Mustache` globally.

#### `widget.render(callback?)`

Renders `template.mustache` into `#app` whenever state changes. Call once to set up:

```js
widget.render();
```

Pass a callback if you need to run code after each render (e.g. re-attaching event listeners):

```js
widget.render(() => {
  attachEventListeners();
});
```

#### `widget.useState(initial)`

Sets the initial state. Returns the state object:

```js
widget.useState({ count: 0, label: 'hello' });
widget.render();
```

#### `widget.setState(partial)`

Merges partial state and triggers a re-render:

```js
widget.setState({ count: 1 }); // only updates count
```

#### `widget.onRefresh(fn)`

Calls `fn` immediately and then every 5 seconds. Use this for polling external data:

```js
widget.onRefresh(async () => {
  const res = await widget.fetch('https://api.example.com/data');
  const data = await res.json();
  widget.setState({ title: data.title });
});
```

#### `widget.fetch(url, options?)`

Proxies HTTP requests through the Rust backend, bypassing CORS restrictions:

```js
const res = await widget.fetch('https://api.example.com/data', {
  method: 'POST',
  headers: { Authorization: 'Bearer token' },
  body: JSON.stringify({ key: 'value' }),
});
const data = await res.json();
```

#### `widget.action(name, payload)` / `widget.onAction(name, fn)`

Communication channel for user interactions in the template back to widget.js:

```js
// widget.js
widget.onAction('increment', ({ amount }) => {
  widget.setState({ count: window.__state.count + amount });
});

// template.mustache (via inline onclick or attached listener)
widget.action('increment', { amount: 1 });
```

#### `window.__config`

Values from `config.json` are available as `window.__config`:

```json
// config.json
{ "apiKey": "abc123", "refreshRate": 10000 }
```

```js
// widget.js
const { apiKey } = window.__config;
```

### Minimal example

**widget.json**

```json
{ "name": "Clock", "width": 200, "height": 80, "transparent": true, "decorations": false }
```

**template.mustache**

```mustache
<span>{{time}}</span>
```

**style.css**

```css
body {
  background: transparent;
  color: white;
  font-size: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
```

**widget.js**

```js
widget.useState({ time: '' });
widget.render();

function tick() {
  widget.setState({
    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  });
}

tick();
setInterval(tick, 1000);
```

## Project Structure

```
notion-widget/
├── src/                    # React shell (for future config UI)
│   ├── App.tsx
│   └── styles/global.css
├── src-tauri/
│   ├── src/
│   │   ├── lib.rs          # Widget loader, widget API, tray
│   │   └── main.rs
│   ├── capabilities/
│   │   └── template.json   # Permissions for widget windows
│   ├── mustache.min.js     # Bundled at compile time via include_str!
│   ├── Cargo.toml
│   └── tauri.conf.json
├── widgets/                # Built-in example widgets
│   ├── clock/
│   └── notion-board/
├── package.json
└── vite.config.ts
```
