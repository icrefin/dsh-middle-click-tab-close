// @vitest-environment jsdom
/**
 * The interception proof that a plain DOM assertion cannot give: React 18
 * delegates `onPointerDown` at the root container, so a capturing listener on
 * `document` runs first. This renders the chip as React does — with the kit's
 * `onPointerDown` wired — and checks that the middle press never reaches it,
 * while a left press still does.
 *
 * @module dsh-middle-click-tab-close/test/react-delegation
 */

import { flushSync } from 'react-dom'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { built, loadClientBundle } from './loader.ts'

/** The fake controller plus disposal, as cordis would run it. */
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
  loadClientBundle().exports.apply({
    sidebarRight: { close: (tabId: string) => closes.push(tabId) },
    effect: (callback: () => (() => void) | void) => {
      const dispose = callback()
      if (typeof dispose === 'function') disposers.push(dispose)
    },
  })
  return { closes, dispose: () => disposers.splice(0).forEach((dispose) => dispose()) }
}

/**
 * Dispatch a native pointerdown on an element.
 * @param element - dispatch target.
 * @param button - mouse button (1 = middle).
 * @returns the dispatched event.
 */
function pointerDown(element: Element, button: number): MouseEvent {
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button })
  element.dispatchEvent(event)
  return event
}

let root: Root | undefined
let mounted: Mounted | undefined

beforeEach(() => {
  document.body.innerHTML = '<div data-sidebar-right-session="session-1" data-sidebar-right-open></div>'
  mounted = mount()
})

afterEach(() => {
  root?.unmount()
  root = undefined
  mounted?.dispose()
  mounted = undefined
  document.body.innerHTML = ''
})

describe.skipIf(!built)('React delegation order', () => {
  it('stops a middle press before React runs the chip handler', () => {
    const owner = document.querySelector('[data-sidebar-right-session]')
    if (!(owner instanceof HTMLElement)) throw new Error('fixture is missing the sidebar owner')
    let reactPresses = 0
    root = createRoot(owner)
    flushSync(() => {
      root?.render(
        <div
          role="tab"
          data-dockkit-tab="tab-report"
          onPointerDown={() => {
            reactPresses += 1
          }}
        >
          <span data-dockkit-tab-title>Report</span>
          <button type="button" data-dockkit-tab-close="tab-report">x</button>
        </div>,
      )
    })
    const chip = owner.querySelector('[data-dockkit-tab]')
    if (chip === null) throw new Error('React did not render the chip')
    const middle = pointerDown(chip, 1)
    expect(mounted?.closes).toEqual(['tab-report'])
    expect(reactPresses).toBe(0)
    expect(middle.defaultPrevented).toBe(true)

    // A left press must still reach the shipped handler.
    pointerDown(chip, 0)
    expect(reactPresses).toBe(1)
  })
})
