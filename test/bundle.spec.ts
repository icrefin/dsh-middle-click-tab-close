/**
 * The built client bundle's loader contract.
 *
 * @module dsh-middle-click-tab-close/test/bundle
 */

import { describe, expect, it } from 'vitest'
import { built, loadClientBundle } from './loader.ts'

const packageName = 'dsh-middle-click-tab-close'

describe.skipIf(!built)('built client bundle', () => {
  it('registers under its package name — the boot graph row id', () => {
    expect(loadClientBundle().id).toBe(packageName)
  })

  it('exports the client plugin face the harness mounts', () => {
    const { exports } = loadClientBundle()
    expect(typeof exports.apply).toBe('function')
    expect(exports.inject).toEqual(['sidebarRight'])
  })
})
