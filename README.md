# dsh-middle-click-tab-close

Middle-click a tab in DeepSeek Harness's right sidebar to close it — the gesture
browsers give their own tabs, for the tabs dsh opens for files, the terminal,
deliverables and the guide.

Tested against **dsh 0.2.2-rc.2** (desktop and web UI).

```
Right sidebar ▸ [Report ×] [Guide] [Terminal ×]
                      ↑ middle-click closes, same as ×
```

## Why this is a plugin and not a setting

The strip belongs to two shipped packages: `dsh-client-ui-dockkit` draws each
chip as `role="tab"` with `data-dockkit-tab="<tab id>"`, and
`dsh-client-ui-sidebar-right` owns the column and exposes the close path as
`ctx.sidebarRight.close(tabId)`. The chip's `onPointerDown` ignores exactly one
button — `button === 2` (right click, which opens the tab menu) — so a middle
press selects the tab and stops there. There is no per-chip seat to register
into, and no user setting that turns the gesture on.

So this plugin adds the gesture from the page side without replacing the strip:

| Step | What happens |
|---|---|
| 1 | one capturing `pointerdown` listener on `document` |
| 2 | `button === 1` inside `[data-sidebar-right-session]` only |
| 3 | the pressed chip's `data-dockkit-tab` is the layout tab id |
| 4 | a chip that draws no `[data-dockkit-tab-close]` is left alone — the sole docked guide is protected by the shipped UI, and `close()` would ignore it anyway |
| 5 | `ctx.sidebarRight.close(tabId)` — the same call behind the chip's × and the Close command, so resource cleanup handlers, the collapse-when-last-tab-closes rule and undo history behave identically |
| 6 | `preventDefault()` (no Chromium autoscroll) and `stopPropagation()` (dockkit never starts a chip drag) |

Floating panes draw no chip: their title is `data-dockkit-float-title` with a
close button beside it, and a middle press there clicks that button — the kit's
own close path.

Why capturing on `document` works: React 18 delegates `onPointerDown` at the
root container, which is *below* the document in the capture path, so the
listener runs first and `stopPropagation()` keeps the press away from the kit.
`test/react-delegation.spec.tsx` renders the chip through React and asserts
exactly that.

## What it does not do

- No panel, no settings card, no styles, no host routes: the host half is inert
  and the browser half only installs the listener.
- It does not close tabs by any other gesture, and it leaves the sole docked
  guide open.
- It keys off dockkit's DOM markers (`data-dockkit-tab`,
  `data-dockkit-tab-close`, `data-sidebar-right-session`), the same markers
  `ui-sidebar-right` itself uses to resolve a tab from the DOM. A future dsh that
  renames them would make the gesture stop working (harmlessly), not misbehave.

## Install

```sh
pnpm install
pnpm check                       # typecheck all three projects, build, vitest
pnpm run pack                    # -> dist/dsh-middle-click-tab-close-0.1.3.tgz
```

The desktop profile is owned by the Electron application, so `dsh plugin add`
refuses it. Install the packed tarball from **Settings → Plugins**, then
**restart the app** — a bundle added to a running profile is not in the module
resolution computed at boot, so its entry fails to import until the next start.

## Verification

| Level | Result |
|---|---|
| Typecheck (host half, browser half, tests) | clean |
| Built `lib/client.js` behind a fake `window.__ModuleLoader__` | registers under `dsh-middle-click-tab-close`, exports `apply` + `inject: ['sidebarRight']` |
| Behaviour in jsdom against the built bundle | 7 cases: closable chip, title/close-control press, protected guide, outside the sidebar, other buttons, floating pane, disposal |
| React 18 delegation order | middle press never reaches the chip's `onPointerDown`; left press still does |
| Live GUI click | **not performed** — the packed tarball installs, then the gesture should be confirmed in the running app |

## License

MIT
