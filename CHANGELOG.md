# Changelog

## [v0.2.0] - 2026-04-23

### Added

- Calendar widget:
  - Monthly grid view synced to any iCal feed (Google Calendar, Apple Calendar, Outlook)
  - Colored event bars with consistent color per event title across the month
  - Multi-day event support with lane assignment to keep bars at a consistent height
  - Tooltip showing event names on hover, with overflow clamping so it stays within the widget
  - Configurable polling interval via `updateInterval` in `config.json`
- Version bump script (`scripts/bump-version.js`): accepts `patch`, `minor`, `major`, or an explicit version; updates `package.json`, `tauri.conf.json`, and `Cargo.toml`; creates a dated CHANGELOG entry; supports `--dry-run`

### Changed

- Notion board style updated to match the system and calendar widget aesthetic (dark card, border, Inter font)
- `widget.config` is now read-only: properties cannot be reassigned or mutated from widget code
- Widget template is no longer exposed on `window`, keeping it internal to the widget runtime

## [v0.1.1] - 2026-04-21

### Added

- MIT license
- Bundle targets config

### Fixed

- Notion board `pageId` config key renamed to `databaseId` to match the actual Notion API property
- Minor style fixes in clock and weather widgets

## [v0.1.0] - 2026-04-21

### Added

- Widget platform: loads all widgets from a directory on startup, each in its own window
- Mustache templates: declarative HTML with automatic re-rendering when `widget.store` changes
- Reactive store: assignments to `widget.store` or any nested property trigger a re-render; multiple synchronous changes are batched into one
- DOM diffing via morphdom: only changed nodes are updated on each render
- `widget.renderWithCallback(fn)`: run code after each render, e.g. to re-attach event listeners
- `widget.onRefresh(fn, delay?)`: call a function immediately and on a repeating interval for polling
- `widget.fetch(url, options?)`: proxies HTTP requests through the Rust backend, bypassing CORS
- `widget.action(name, payload)` and `widget.onAction(name, fn)`: communication channel between templates and widget logic
- `widget.config`: read-only values from `config.json`, available in widget code
- `widget.setError(message)` and `widget.setLoading()`: built-in error and loading states
- Always-on-bottom: widgets sit behind all other windows
- Ctrl+drag: reposition any widget by holding Ctrl and dragging
- Position and size persistence: window state is saved and restored across restarts
- Live reload: reload all widgets from the tray without restarting the app
- System tray with reload and quit options
- Built-in system stats API: read CPU, RAM, disk, and network usage from widget code
- Clock widget: minimal clock with date display
- Weather widget: current conditions via Open-Meteo, no API key required
- System monitor widget: live CPU, RAM, disk, and network usage with configurable interfaces
- Notion board widget: Kanban board synced to a Notion database, with drag-and-drop to move items between columns and horizontal/vertical layout options
- Linux support: partial (widgets run, size saving works; always-on-bottom and position saving not supported on GNOME Wayland)
