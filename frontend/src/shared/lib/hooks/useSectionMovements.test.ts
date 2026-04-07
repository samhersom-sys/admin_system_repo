/**
 * TESTS — useSectionMovements hook
 * Requirements: src/shared/lib/hooks/useSectionMovements.ts
 * Test ID format: T-MOV-HOOK-R[NN]
 */

import { renderHook, act } from '@testing-library/react'
import useSectionMovements, { MOVEMENT_KEYS } from './useSectionMovements'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSection(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        limitAmount: 1000000,
        excessAmount: 10000,
        sumInsured: 5000000,
        grossGrossPremium: 120000,
        grossPremium: 100000,
        deductions: 10000,
        netPremium: 90000,
        taxReceivable: 5000,
        annualGrossPremium: 100000,
        annualNetPremium: 90000,
        daysOnCover: 365,
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R01 — all 11 movement keys are returned
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R01: returns all 11 movement keys', () => {
    it('result has all MOVEMENT_KEYS as properties', () => {
        const { result } = renderHook(() =>
            useSectionMovements(makeSection(), { baseline: makeSection() })
        )
        for (const key of MOVEMENT_KEYS) {
            expect(key in result.current).toBe(true)
        }
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R02 — zero deltas when current === baseline
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R02: zero deltas when current matches baseline', () => {
    it('returns 0 for every key when section equals baseline', () => {
        const section = makeSection()
        const { result } = renderHook(() =>
            useSectionMovements(section, { baseline: { ...section } })
        )
        for (const key of MOVEMENT_KEYS) {
            expect(result.current[key]).toBe(0)
        }
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R03 — positive delta for increased value
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R03: positive delta for increased value', () => {
    it('computes grossPremium delta = current - baseline', () => {
        const baseline = makeSection({ grossPremium: 100000 })
        const current = makeSection({ grossPremium: 110000 })
        const { result } = renderHook(() =>
            useSectionMovements(current, { baseline })
        )
        expect(result.current.grossPremium).toBe(10000)
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R04 — negative delta for reduced value
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R04: negative delta for reduced value', () => {
    it('computes netPremium delta correctly when value decreases', () => {
        const baseline = makeSection({ netPremium: 90000 })
        const current = makeSection({ netPremium: 80000 })
        const { result } = renderHook(() =>
            useSectionMovements(current, { baseline })
        )
        expect(result.current.netPremium).toBe(-10000)
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R05 — Policy path: baseline is null on first render, set on effect
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R05: policy path — first render baseline is null (no explicit baseline)', () => {
    it('deltas equal section values on first render (baseline = null → 0)', () => {
        const section = makeSection({ grossPremium: 100000 })
        const { result } = renderHook(() => useSectionMovements(section))
        // Policy path: no explicit baseline → baselineRef starts null → base = {} → delta = section value
        expect(result.current.grossPremium).toBe(100000)
    })

    it('after section.id changes, delta becomes diff from baseline snapshot', () => {
        const initial = makeSection({ id: 1, grossPremium: 100000 })
        let section = initial
        const { result, rerender } = renderHook(() => useSectionMovements(section))
        // initial render: delta = 100000 (baseline null → base = {})
        // after effect: baselineRef = initial snapshot with grossPremium = 100000
        // change section with same id but new value — NOT triggered by id change
        const edited = { ...initial, grossPremium: 120000 }
        section = edited
        rerender()
        // useMemo recomputes: cur.grossPremium=120000, base.grossPremium=100000 → delta=20000
        expect(result.current.grossPremium).toBe(20000)
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R06 — null section with null baseline returns all zeros
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R06: null section with null baseline returns all zeros', () => {
    it('returns 0 for all keys when both section and baseline are null', () => {
        const { result } = renderHook(() =>
            useSectionMovements(null, { baseline: null })
        )
        for (const key of MOVEMENT_KEYS) {
            expect(result.current[key]).toBe(0)
        }
    })

    it('returns negative deltas when section is null but baseline has values', () => {
        const baseline = makeSection({ grossPremium: 100000 })
        const { result } = renderHook(() =>
            useSectionMovements(null, { baseline })
        )
        // section = null → cur = {} → grossPremium = 0; baseline = 100000 → delta = -100000
        expect(result.current.grossPremium).toBe(-100000)
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R07 — legacy fallback for Policy column names
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R07: legacy fallbacks resolve Policy DB column names', () => {
    it('reads limitAmount from "Policy Section Limit Amount" when useLegacyFallbacks=true', () => {
        const baseline = { id: 1, 'Policy Section Limit Amount': 1000000 }
        const current = { id: 1, 'Policy Section Limit Amount': 1200000 }
        const { result } = renderHook(() =>
            useSectionMovements(current as any, { baseline: baseline as any, useLegacyFallbacks: true })
        )
        expect(result.current.limitAmount).toBe(200000)
    })
})

// ---------------------------------------------------------------------------
// T-MOV-HOOK-R08 — explicit null baseline returns positive deltas
// ---------------------------------------------------------------------------

describe('T-MOV-HOOK-R08: explicit null baseline treats baseline as all zeros', () => {
    it('returns current value as delta when baseline is null', () => {
        const current = makeSection({ grossPremium: 50000 })
        const { result } = renderHook(() =>
            useSectionMovements(current, { baseline: null })
        )
        expect(result.current.grossPremium).toBe(50000)
    })
})
