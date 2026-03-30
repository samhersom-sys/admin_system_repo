/**
 * TESTS — lib/design-tokens
 * Second artifact. Requirements: lib/design-tokens/design-tokens.requirements.md
 * Test ID format: T-lib-design-tokens-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=design-tokens.test
 */

import fs from 'fs'
import path from 'path'
import * as brandColors from './brandColors'
import * as brandClassesModule from './brandClasses'

const ROOT = path.resolve(__dirname, '../..')
const GLOBAL_CSS = path.join(__dirname, 'global.css')

// ---------------------------------------------------------------------------
// R01 — global.css has :root block with key tokens
// ---------------------------------------------------------------------------

describe('T-lib-design-tokens-R01: global.css defines CSS custom properties in :root', () => {
    it('global.css exists', () => {
        expect(fs.existsSync(GLOBAL_CSS)).toBe(true)
    })

    it('global.css contains a :root {} block', () => {
        const css = fs.readFileSync(GLOBAL_CSS, 'utf8')
        expect(css).toMatch(/:root\s*{/)
    })

    it('global.css defines sidebar colour tokens', () => {
        const css = fs.readFileSync(GLOBAL_CSS, 'utf8')
        expect(css).toMatch(/--sidebar-bg/)
        expect(css).toMatch(/--sidebar-text/)
    })
})

// ---------------------------------------------------------------------------
// R02 — brandColors exports brand values
// ---------------------------------------------------------------------------

describe('T-lib-design-tokens-R02: brandColors.ts exports brand colour values', () => {
    // brandColors uses both named and default export; access via namespace:
    const colors = (brandColors as any).brandColors ?? (brandColors as any).default

    it('module exports a brandColors object', () => {
        expect(colors).toBeDefined()
        expect(typeof colors).toBe('object')
    })

    it('brandColors.primary.main is a non-empty hex string', () => {
        expect(typeof colors.primary.main).toBe('string')
        expect(colors.primary.main.length).toBeGreaterThan(0)
    })

    it('brandColors.success is a non-empty hex string', () => {
        expect(typeof colors.success).toBe('string')
        expect(colors.success.length).toBeGreaterThan(0)
    })

    it('brandColors.sidebar.bg is a non-empty string', () => {
        expect(typeof colors.sidebar.bg).toBe('string')
        expect(colors.sidebar.bg.length).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// R03 — brandColors.ts is the single source of truth
// ---------------------------------------------------------------------------

describe('T-lib-design-tokens-R03: brandColors is defined only in lib/design-tokens', () => {
    function findFiles(dir: string, name: string, results: string[] = []): string[] {
        if (!fs.existsSync(dir)) return results
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
            const full = path.join(dir, entry.name)
            if (fs.statSync(full).isDirectory()) findFiles(full, name, results)
            else if (entry.name === name) results.push(full)
        }
        return results
    }

    it('only one brandColors.ts file exists in the whole project', () => {
        const found = findFiles(ROOT, 'brandColors.ts')
        expect(found).toHaveLength(1)
        expect(found[0]).toContain(path.join('lib', 'design-tokens'))
    })
})

// ---------------------------------------------------------------------------
// R04 — brandClasses exports Tailwind class aliases with no hex literals
// ---------------------------------------------------------------------------

describe('T-lib-design-tokens-R04: brandClasses.ts exports Tailwind class aliases', () => {
    const classes = (brandClassesModule as any).brandClasses ?? (brandClassesModule as any).default

    it('module exports a brandClasses object', () => {
        expect(classes).toBeDefined()
        expect(typeof classes).toBe('object')
    })

    it('brandClasses has button, badge, typography, and table keys', () => {
        expect(typeof classes.button).toBe('object')
        expect(typeof classes.badge).toBe('object')
        expect(typeof classes.typography).toBe('object')
        expect(typeof classes.table).toBe('object')
    })

    it('every brandClasses leaf value is a non-empty string', () => {
        const violations: string[] = []
        function walk(obj: Record<string, unknown>, path: string) {
            for (const key of Object.keys(obj)) {
                const val = obj[key]
                const fullPath = `${path}.${key}`
                if (val !== null && typeof val === 'object') {
                    walk(val as Record<string, unknown>, fullPath)
                } else if (typeof val !== 'string' || val.trim().length === 0) {
                    violations.push(`${fullPath}: ${JSON.stringify(val)}`)
                }
            }
        }
        walk(classes as Record<string, unknown>, 'brandClasses')
        expect(violations).toEqual([])
    })

    it('no brandClasses value contains a hardcoded hex colour literal', () => {
        const HEX = /#[0-9A-Fa-f]{3,8}(?![0-9A-Fa-f])/
        const violations: string[] = []
        function walk(obj: Record<string, unknown>, path: string) {
            for (const key of Object.keys(obj)) {
                const val = obj[key]
                const fullPath = `${path}.${key}`
                if (val !== null && typeof val === 'object') {
                    walk(val as Record<string, unknown>, fullPath)
                } else if (typeof val === 'string' && HEX.test(val)) {
                    violations.push(`${fullPath}: "${val}"`)
                }
            }
        }
        walk(classes as Record<string, unknown>, 'brandClasses')
        expect(violations).toEqual([])
    })

    it('exactly one brandClasses.ts file exists in the project', () => {
        function findFiles(dir: string, name: string, results: string[] = []): string[] {
            if (!fs.existsSync(dir)) return results
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
                const full = path.join(dir, entry.name)
                if (fs.statSync(full).isDirectory()) findFiles(full, name, results)
                else if (entry.name === name) results.push(full)
            }
            return results
        }
        const found = findFiles(ROOT, 'brandClasses.ts')
        expect(found).toHaveLength(1)
        expect(found[0]).toContain(path.join('lib', 'design-tokens'))
    })
})
