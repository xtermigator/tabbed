# My Tab Hub Pro 2.1

A local-first Chromium Manifest V3 extension. Works with recent Chrome, Edge, and Opera versions supporting MV3.

## Install (unpacked)
1. Unzip `my-tab-hub-pro-2-1.zip`.
2. Chrome: visit `chrome://extensions`; Edge: `edge://extensions`; Opera: `opera://extensions`.
3. Enable **Developer mode**.
4. Select **Load unpacked** (wording may vary) and choose the extracted `my-tab-hub-pro-2` folder containing `manifest.json`.
5. Pin the extension and click its icon, then **Open Dashboard**.

## Features
- Permanent Smart Search sidebar navigation.
- Universal search bar on all workspace pages, Ctrl+K focus.
- Search live tabs, favorites, and optional recent browsing history.
- Locally ranked past-site suggestions (frequency, recency, workspace relevance).
- Custom workspaces and suggested categories; manual assignment by URL.
- Favorite/unfavorite URLs.
- Switch, pin/unpin, and close live tabs.
- Save and restore sessions (up to 200 web URLs per session).
- Privacy toggles for history and suggestions.

## Notes and limitations
- All data is stored in `chrome.storage.local` in the current browser profile; there is **no cross-browser sync**.
- Search matches tab/history titles and URLs, not full webpage content.
- Suggestions are rule-based, **not** an external AI model.
- History searches use the last 90 days and at most 1,500 browser history records.
- Browser-internal pages (chrome:// etc.) are excluded from session restoration.
- Session restore opens a new window and may consume resources.
- Tab workspace assignments are per URL, not per individual tab.
- Uninstalling the extension can delete locally stored favorites/sessions. Backups/export are not implemented yet.
- `history` permission is requested at installation; the in-app history toggle controls whether history is read and shown, not browser-level permission.
- A dedicated side panel is included. Side panel availability depends on the browser/version; use the full dashboard as fallback.

## Source files
- `manifest.json`: extension permissions and configuration
- `background.js`: installation defaults, dashboard launch and keyboard shortcut
- `popup.html`, `popup.js`: extension toolbar popup
- `dashboard.html`, `dashboard.js`, `style.css`: dashboard UI and features

No account, API key, or external service required.

## Version 2.1 additions
- Upgraded navy/teal visual design with elevated cards.
- Drag workspace cards to reorder them on Overview; drag the three Overview sections to rearrange widgets. Changes are saved locally.
- Reset Layout button restores default widget order.
- Side Panel button opens `sidepanel.html` using the Chromium `sidePanel` API where available.
- The side panel includes the same Smart Search, universal search, favorites, sessions and tab controls as the dashboard.
- Note: the side panel is responsive but tab tables scroll horizontally at narrow widths.
- Browser support: recent Chrome and Edge support the Side Panel API. Opera support varies by version; an unsupported version may reject the `sidePanel` manifest permission. If installation fails on Opera, remove `sidePanel` from permissions and remove the `side_panel` entry from manifest.json to use the full dashboard without a side panel.
- This version does not sync tabs across browsers or provide a remote AI service.

## Upgrade from 2.0
If version 2.0 was installed unpacked, replace its files with the contents of this archive **in the same folder**, then click Reload on the browser extensions page. This preserves the extension ID and locally stored data in typical unpacked installs. Back up your data first if it is important. Loading the new archive as a separate extension may create a new extension ID and will not automatically migrate data.
