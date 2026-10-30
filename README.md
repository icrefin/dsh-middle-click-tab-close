# dsh-middle-click-tab-close

**Middle-click a tab in DeepSeek Harness's right sidebar to close it** — the
gesture browsers give their own tabs, for the tabs dsh opens for files, the
terminal, deliverables and the guide.

**English** | [简体中文](README.zh-CN.md)

[![License](https://img.shields.io/github/license/icrefin/dsh-middle-click-tab-close?style=flat-square)](LICENSE)
[![Release](https://img.shields.io/github/v/release/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/releases/tag/v0.1.1)
[![CI](https://img.shields.io/github/actions/workflow/status/icrefin/dsh-middle-click-tab-close/ci.yml?branch=main&style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/actions/workflows/ci.yml)
[![Last commit](https://img.shields.io/github/last-commit/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/commits/main)
[![Stars](https://img.shields.io/github/stars/icrefin/dsh-middle-click-tab-close?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/stargazers)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/icrefin/dsh-middle-click-tab-close/pulls)
[![Node](https://img.shields.io/badge/node-%3E%3D22.17-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![dsh](https://img.shields.io/badge/dsh-0.2.1--rc.5-4B5563?style=flat-square)](https://github.com/deepseek-ai/deepseek-harness)

## The gesture

```
Right sidebar
┌──────────────────────────────────────────────────────────┐
│  Report ×   Guide   Terminal ×   +   ⬒   ⤢   ⌄          │
│        ↑                                                 │
│   middle-click here closes the tab, exactly like ×       │
└──────────────────────────────────────────────────────────┘
```

A left click selects a tab. A right click opens its menu. A **middle click now
closes it** — on the docked strip and on a floating pane's title alike.

## Why this is a plugin and not a setting

The strip is shipped UI, and it has no seat for a per-tab gesture:

| Owner | What it does |
|---|---|
| `dsh-client-ui-dockkit` | draws each chip as `role="tab"` with `data-dockkit-tab="<tab id>"`; its chip handler is `onPointerDown: e => { if (e.button !== 2) onTabPressed(...) }` — it skips exactly one button, right-click, so a middle press selects the tab and stops there |
| `dsh-client-ui-sidebar-right` | owns the column, the tab registry and the documented navigation controller `ctx.sidebarRight.close(tabId)` |

No user setting turns the gesture on, and no slot exposes the chip. The only way
to add it without forking or patching the shipped strip is to observe the chip in
the page and call the same close path the UI already uses.

## What it contributes

| Surface | What it does |
|---|---|
| one capturing `pointerdown` listener on `document` | resolves the pressed chip and closes its tab |
| the host half (`exports["."]`) | inert: it exists only so the Loader row can carry the browser half |
| Config, styles, slots, routes | none |

No panel, no settings card, no HTTP surface.

## How a press is handled

| Step | What happens |
|---|---|
| 1 | `button === 1` and the press is inside `[data-sidebar-right-session]` |
| 2 | the pressed element's closest `[data-dockkit-tab]` supplies the layout tab id |
| 3 | a chip that draws no `[data-dockkit-tab-close]` is left alone — the sole docked guide is protected by the shipped UI |
| 4 | `ctx.sidebarRight.close(tabId)` runs the shipped close path: resource cleanup handlers, the last-tab-collapses-the-column rule and layout undo history all behave exactly as they do for the chip's × |
| 5 | `preventDefault()` suppresses Chromium's middle-click autoscroll, and `stopPropagation()` keeps dockkit from ever seeing the press |
| 6 | the gesture's listener lives in `ctx.effect`, so disabling the plugin or unloading it removes it |

Because step 4 is the documented controller rather than a synthetic click on the
×, a tab type's `registerCloseHandler` still runs, and closing the only tab in a
pane still collapses the column in one history entry.

## Why capturing on `document` works

React 18 delegates `onPointerDown` at the root container, which sits *below*
`document` in the capture path. A capturing listener on `document` therefore runs
first; `stopPropagation()` prevents the event from reaching the container, so the
kit's chip handler never runs and no drag begins.

`test/react-delegation.spec.tsx` renders the chip through React with a live
`onPointerDown` and asserts both halves of that: a middle press never reaches the
handler, and a left press still does.

## Protected and floating tabs

- **The sole docked guide stays open.** It draws no close control and
  `sidebarRight.close()` ignores it; the plugin refuses the press instead of
  swallowing it for no effect.
- **Floating panes have no tab chip.** Their title is `data-dockkit-float-title`
  with a close button beside it, so a middle press there clicks that button — the
  kit's own close path — and the pane closes as if the button were used.

## What it does not do

- It does not close tabs with any other button, gesture or shortcut.
- It does not touch background Sessions: only the foreground column's visible
  chips are reachable, which is the only place a pointer can land.
- It keys off dockkit's DOM markers (`data-dockkit-tab`,
  `data-dockkit-tab-close`, `data-sidebar-right-session`) — the same markers
  `ui-sidebar-right` itself uses to resolve a tab from the DOM. If a future dsh
  renames them, the gesture stops working (harmlessly) rather than misfiring.
- It cannot make the gesture native: a middle press still reaches the browser
  first, so the tab closes on `pointerdown`, not on `auxclick`.

## Install

Build and pack from this repository:

```sh
pnpm install
pnpm check                       # typecheck · build · vitest
pnpm pack                        # -> dist/dsh-middle-click-tab-close-0.1.0.tgz
```

Then, in the DeepSeek Harness desktop app, open **Settings → Plugins**, install
`dist/dsh-middle-click-tab-close-0.1.0.tgz`, and **restart the app**. A bundle
added to a running profile is not in the module resolution computed at boot, so
its entry fails to import until the next start. The web client also needs a page
reload after that restart.

## Development

```sh
pnpm install
pnpm check          # typecheck the host half, the browser half and the tests; build; vitest
```

To see the package composed and served without touching the app's profile:

```sh
scripts/dev-profile.sh boot 19498     # isolated DSH home under .dev-home/
scripts/dev-profile.sh url 19498      # prints the served bundle URL
scripts/dev-profile.sh remove
```

The gesture's own browser check is by hand: open the right sidebar, middle-click
a tab, and confirm the tab closes and its close handler ran.

## Verification

| Level | Result |
|---|---|
| Typecheck: host half, browser half, tests | clean |
| Built `lib/client.js` behind a fake `window.__ModuleLoader__` | registers under the package name, exports `apply` + `inject: ['sidebarRight']` |
| Behaviour in jsdom against the built bundle | closed chip, title and close-control presses, protected guide, outside the sidebar, other buttons, floating pane, listener disposal |
| React 18 delegation order | middle press never reaches the chip's `onPointerDown`; left press still does |
| Composition in an isolated dsh profile | the Loader row composed, the boot graph carried the entry with its `inject`, and the bundle was served |
| Live middle click in the desktop GUI | **not automated** — the one check left to a human |

## Files

```
src/
├── index.ts              # host half: the Loader row's inert entry point
└── client/index.ts       # the document listener, chip resolution, close call
test/
├── loader.ts             # the built bundle behind a fake module loader
├── bundle.spec.ts        # loader id + exports
├── middle-click.spec.ts  # the gesture in jsdom
└── react-delegation.spec.tsx  # capture-before-React proof
scripts/
├── dev-profile.sh        # isolated dsh home for composition checks
└── install.sh            # pack, then print the install path
```

## Contributing

Issues and pull requests are welcome — the bug form asks which step of the press
broke, which is usually enough to reproduce. [CONTRIBUTING.md](.github/CONTRIBUTING.md)
has the commands and the map of what each spec pins. Report vulnerabilities through
[SECURITY.md](.github/SECURITY.md) rather than a public issue. This project follows
the [Contributor Covenant](.github/CODE_OF_CONDUCT.md).

> If this saves you a trip to the × on every tab, a ⭐ star helps other DSH users
> find it.

## License

MIT — see [LICENSE](LICENSE).
