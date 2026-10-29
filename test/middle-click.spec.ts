// @vitest-environment jsdom
/**
 * The gesture, driven against the built bundle in a real DOM.
 *
 * The fixture reproduces the shipped markers only — a tab chip, its close
 * control, the column owner, a floating title — and the assertions cover what
 * the plugin promises: a middle press closes through `ctx.sidebarRight.close`,
 * the press is swallowed before dockkit sees it, and every other press is left
 * alone.
 *
 * @module dsh-middle-click-tab-close/test/middle-click
 */

import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { built, loadClientBundle } from './loader.ts'

/** Fake `ctx.sidebarRight` plus the effect-disposal bookkeeping cordis provides. */
interface Mounted {
  closes: string[]
  dispose(): void
}

/**
 * Mount the plugin with a recording controller.
 * @returns the recorded closes and a disposer.
 */
function mount(): Mounted {
  const closes: string[] = []
  const disposers: (() => void)[] = []
  const ctx = {
    sidebarRight: {
      close: (tabId: string): void => {
        closes.push(tabId)
      },
    },
    effect: (callback: () => (() => void) | void): void => {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
  }
  loadClientBundle().exports.apply(ctx)
  const mounted = {
    closes,
    dispose: () => {
      for (const dispose of disposers.splice(0)) dispose()
    },
  }
  active.push(mounted)
  return mounted
}

/** Build the shipped DOM shape around two docked chips and one floating pane. */
function fixture(): void {
  document.body.innerHTML = `
    <div data-sidebar-right-session="session-1" data-sidebar-right-open>
      <div data-dockkit-pane="pane-1" data-dockkit-pane-active>
        <div data-dockkit-strip="pane-1">
          <div role="tab" data-dockkit-tab="tab-report">
            <span data-dockkit-tab-title>Report</span>
            <button type="button" data-dockkit-tab-close="tab-report">x</button>
          </div>
          <div role="tab" data-dockkit-tab="tab-guide" data-dockkit-tab-quiet>
            <span data-dockkit-tab-title>Guide</span>
          </div>
        </div>
      </div>
      <div data-dockkit-float="float-1">
        <header>
          <div data-dockkit-float-title><span>Terminal</span></div>
          <button type="button" data-dockkit-float-close="float-1">x</button>
        </header>
      </div>
    </div>
    <div role="tab" data-dockkit-tab="tab-outside">
      <span data-dockkit-tab-title>Not the sidebar</span>
      <button type="button" data-dockkit-tab-close="tab-outside">x</button>
    </div>`
}

/**
 * Dispatch a press at a selector.
 * @param selector - element to press.
 * @param button - mouse button (1 = middle).
 * @returns the event after dispatch and whether it was cancelled.
 */
function press(selector: string, button: number): { event: MouseEvent; delivered: boolean } {
  const element = document.querySelector(selector)
  if (element === null) throw new Error(`fixture is missing "${selector}"`)
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button })
  const delivered = element.dispatchEvent(event)
  return { event, delivered }
}

/** Mounts created by a test, disposed even when its assertion throws. */
const active: Mounted[] = []
/** Count pointerdowns that reach the bubble phase — i.e. dockkit's handlers. */
let bubbled = 0

beforeAll(() => {
  document.addEventListener('pointerdown', () => {
    bubbled += 1
  })
})

beforeEach(() => {
  fixture()
  bubbled = 0
})

afterEach(() => {
  for (const mounted of active.splice(0)) mounted.dispose()
  document.body.innerHTML = ''
})

describe.skipIf(!built)('middle-click tab close', () => {
  it('closes a closable chip through ctx.sidebarRight and swallows the press', () => {
    const mounted = mount()
    const { event, delivered } = press('[data-dockkit-tab="tab-report"]', 1)
    expect(mounted.closes).toEqual(['tab-report'])
    expect(event.defaultPrevented).toBe(true)
    expect(delivered).toBe(false)
    expect(bubbled).toBe(0)
  })

  it('works when the press lands on the title or the close control', () => {
    const mounted = mount()
    press('[data-dockkit-tab="tab-report"] [data-dockkit-tab-title]', 1)
    press('[data-dockkit-tab="tab-report"] [data-dockkit-tab-close]', 1)
    expect(mounted.closes).toEqual(['tab-report', 'tab-report'])
  })

  it('leaves the protected guide chip alone — it draws no close control', () => {
    const mounted = mount()
    const { event } = press('[data-dockkit-tab="tab-guide"]', 1)
    expect(mounted.closes).toEqual([])
    expect(event.defaultPrevented).toBe(false)
    expect(bubbled).toBe(1)
  })

  it('ignores tabs outside the right sidebar', () => {
    const mounted = mount()
    const { event } = press('[data-dockkit-tab="tab-outside"]', 1)
    expect(mounted.closes).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })

  it('ignores every other mouse button', () => {
    const mounted = mount()
    for (const button of [0, 2]) {
      const { event } = press('[data-dockkit-tab="tab-report"]', button)
      expect(event.defaultPrevented).toBe(false)
    }
    expect(mounted.closes).toEqual([])
    expect(bubbled).toBe(2)
  })

  it('routes a floating pane press to the pane close button', () => {
    mount()
    const close = document.querySelector('[data-dockkit-float-close="float-1"]')
    if (!(close instanceof HTMLElement)) throw new Error('fixture is missing the float close button')
    let clicked = 0
    close.addEventListener('click', () => {
      clicked += 1
    })
    const { event } = press('[data-dockkit-float-title]', 1)
    expect(clicked).toBe(1)
    expect(event.defaultPrevented).toBe(true)
    expect(bubbled).toBe(0)
  })

  it('removes its listeners on disposal', () => {
    const mounted = mount()
    mounted.dispose()
    const { event } = press('[data-dockkit-tab="tab-report"]', 1)
    expect(mounted.closes).toEqual([])
    expect(event.defaultPrevented).toBe(false)
  })
})
