/**
 * dsh-middle-click-tab-close — browser half.
 *
 * The right sidebar's tab strip is shipped UI: `dsh-client-ui-dockkit` draws each
 * chip as `role="tab"` with `data-dockkit-tab="<tab id>"`, renders the close
 * affordance as `[data-dockkit-tab-close]` only while the tab is closable, and
 * `dsh-client-ui-sidebar-right` owns the whole column under
 * `[data-sidebar-right-session]`. The kit's chip handler ignores exactly one
 * button — `onPointerDown` returns early for `button === 2` — so a middle press
 * selects the tab and nothing else happens.
 *
 * This half does not replace the strip. It adds one capturing `pointerdown`
 * listener on the document that:
 *
 * 1. only acts on `button === 1` inside `[data-sidebar-right-session]`;
 * 2. resolves the chip's tab id and refuses a chip that draws no close control
 *    (the sole docked guide is protected by the shipped UI);
 * 3. calls `ctx.sidebarRight.close(tabId)` — the documented navigation
 *    controller and the same call behind the chip's close button, so resource
 *    cleanup handlers, the "last docked tab collapses the column" rule and the
 *    layout undo history behave identically;
 * 4. swallows the press (`preventDefault` for Chromium's autoscroll,
 *    `stopPropagation` so dockkit never starts a chip drag).
 *
 * Floating panes draw no tab chip: their title is `data-dockkit-float-title` and
 * the close control beside it is `[data-dockkit-float-close]`. A middle press
 * there clicks that button, which is the kit's own close path.
 *
 * Nothing here renders, so the plugin adds no seat and no styles. `apply` is
 * wrapped in try/catch because a throwing client `apply` fails the whole web
 * boot; the listener lifetime lives in `ctx.effect` so a profile disable or a
 * plugin unload removes it.
 *
 * @module dsh-middle-click-tab-close/client
 */

/** Services this bundle waits for: the right sidebar's public controller. */
export const inject = ['sidebarRight']

/**
 * The face of `ctx.sidebarRight` this plugin uses. Structural on purpose: the
 * shipped packages carry no `.d.ts`, and only `close` is read here.
 */
export interface SidebarRightController {
  /**
   * Close one tab of the on-screen Session.
   * @param tabId - the layout tab id to remove.
   */
  close(tabId: string): void
}

/** Structural face of the client root context this plugin uses. */
export interface ClientContext {
  effect(callback: () => (() => void) | void, label?: string): void
  sidebarRight: SidebarRightController
}

/** The column owning every pane this gesture may touch. */
const OWNER = '[data-sidebar-right-session]'
/** A docked tab chip; its `data-dockkit-tab` value is the layout tab id. */
const TAB = '[data-dockkit-tab]'
/** Present only while the shipped UI allows closing that chip. */
const TAB_CLOSE = '[data-dockkit-tab-close]'
/** A floating pane's title. */
const FLOAT_TITLE = '[data-dockkit-float-title]'
/** A floating pane's close button. */
const FLOAT_CLOSE = '[data-dockkit-float-close]'

/**
 * Narrow a DOM event target to an element.
 * @param target - the event's target.
 * @returns the element, or undefined for a non-element target.
 */
function elementOf(target: EventTarget | null): Element | undefined {
  return target instanceof Element ? target : undefined
}

/**
 * Resolve a closable docked tab from the pressed element.
 * @param target - the `pointerdown` target.
 * @returns the layout tab id, or undefined when the press is not on a closable chip.
 */
function closableTabId(target: EventTarget | null): string | undefined {
  const element = elementOf(target)
  if (element === undefined || element.closest(OWNER) === null) return undefined
  const chip = element.closest(TAB)
  if (!(chip instanceof HTMLElement)) return undefined
  const tabId = chip.dataset.dockkitTab
  if (tabId === undefined || tabId === '') return undefined
  // The close control is the shipped UI's own answer to "may this tab close?".
  // The sole docked guide draws none, and `sidebarRight.close()` would ignore it
  // anyway; refusing here keeps the press from being swallowed for no reason.
  if (chip.querySelector(TAB_CLOSE) === null) return undefined
  return tabId
}

/**
 * Resolve a floating pane's close button from the pressed element.
 * @param target - the `pointerdown` target.
 * @returns the close button, or undefined outside a floating title.
 */
function floatCloseButton(target: EventTarget | null): HTMLElement | undefined {
  const element = elementOf(target)
  if (element === undefined || element.closest(OWNER) === null) return undefined
  const title = element.closest(FLOAT_TITLE)
  const pane = title?.closest('[data-dockkit-float]')
  const close = pane?.querySelector(FLOAT_CLOSE)
  return close instanceof HTMLElement ? close : undefined
}

/**
 * Close the tab a middle press landed on, through the shipped path.
 * @param ctx - client context carrying the navigation controller.
 * @param target - the pressed element.
 * @returns whether the press was consumed.
 */
function closeFromMiddlePress(ctx: ClientContext, target: EventTarget | null): boolean {
  const tabId = closableTabId(target)
  if (tabId !== undefined) {
    ctx.sidebarRight.close(tabId)
    return true
  }
  const close = floatCloseButton(target)
  if (close !== undefined) {
    close.click()
    return true
  }
  return false
}

/**
 * Install the gesture for the lifetime of the plugin.
 * @param ctx - client root context.
 */
function install(ctx: ClientContext): (() => void) | undefined {
  if (typeof document === 'undefined') return undefined

  const onPointerDown = (event: MouseEvent): void => {
    if (event.button !== 1 || event.defaultPrevented) return
    let handled = false
    try {
      handled = closeFromMiddlePress(ctx, event.target)
    } catch (error) {
      // A close with no on-screen Session throws; never take the page down for it.
      console.warn('[dsh-middle-click-tab-close] the tab could not be closed', error)
      return
    }
    if (!handled) return
    event.preventDefault()
    event.stopPropagation()
  }

  // Chromium starts autoscroll on the middle mousedown; cancelling `pointerdown`
  // suppresses the compatibility mouse events, and this is the fallback for a
  // browser that sends them anyway.
  const onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 1) return
    if (closableTabId(event.target) !== undefined || floatCloseButton(event.target) !== undefined) {
      event.preventDefault()
    }
  }

  // No default action is wanted on release either (link opening, paste on X11).
  const onAuxClick = (event: MouseEvent): void => {
    if (event.button !== 1) return
    if (closableTabId(event.target) !== undefined || floatCloseButton(event.target) !== undefined) {
      event.preventDefault()
      event.stopPropagation()
    }
  }

  document.addEventListener('pointerdown', onPointerDown, true)
  document.addEventListener('mousedown', onMouseDown, true)
  document.addEventListener('auxclick', onAuxClick, true)
  return () => {
    document.removeEventListener('pointerdown', onPointerDown, true)
    document.removeEventListener('mousedown', onMouseDown, true)
    document.removeEventListener('auxclick', onAuxClick, true)
  }
}

/**
 * Mount the middle-click gesture.
 * @param ctx - client root context.
 */
export function apply(ctx: ClientContext): void {
  try {
    ctx.effect(() => install(ctx), 'dsh-middle-click-tab-close: middle-click close')
  } catch (error) {
    console.warn('[dsh-middle-click-tab-close] the gesture could not be installed', error)
  }
}