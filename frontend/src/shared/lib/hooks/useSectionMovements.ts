/**
 * useSectionMovements — computes numeric movement deltas for a section.
 *
 * Compares current section field values against a baseline snapshot.
 * Used by PolicySectionViewPage (policy path) and QuoteSectionDetailsHeader
 * (quote path where previous/baseline is passed explicitly).
 *
 * Requirements: src/shared/lib/hooks/useSectionMovements.requirements.md
 * Tests: src/shared/lib/hooks/__tests__/useSectionMovements.test.ts
 */

import { useMemo, useRef, useEffect } from 'react'

/** All movement-tracked numeric fields across quote and policy section types. */
export const MOVEMENT_KEYS = [
    'limitAmount',
    'excessAmount',
    'sumInsured',
    'grossGrossPremium',
    'grossPremium',
    'deductions',
    'netPremium',
    'taxReceivable',
    'annualGrossPremium',
    'annualNetPremium',
    'daysOnCover',
] as const

export type MovementKey = (typeof MOVEMENT_KEYS)[number]
export type MovementDeltas = Record<MovementKey, number>

/**
 * Legacy field-name fallback map for Policy sections whose database columns
 * use long-form names (e.g. "Policy Section Limit Amount").
 * Enabled via `useLegacyFallbacks: true`.
 */
const POLICY_LEGACY_MAP: Partial<Record<MovementKey, string>> = {
    limitAmount: 'Policy Section Limit Amount',
    excessAmount: 'Policy Excess Amount',
    sumInsured: 'Policy Sum Insured',
}

export interface UseSectionMovementsOptions {
    /**
     * Explicit baseline snapshot.
     * - **Quote path**: pass `section.previous ?? section.baseline ?? null`
     * - **Policy path** (default): omit — hook snapshots section on first load
     */
    baseline?: Record<string, unknown> | null
    /**
     * Enable legacy Policy DB column name fallbacks.
     * Set to `true` when using with policy sections.
     */
    useLegacyFallbacks?: boolean
}

/**
 * Compute movement deltas between the live section and a frozen baseline.
 *
 * @param section  - current (live) section object
 * @param options  - optional baseline and legacy fallback flag
 * @returns        - map of field → delta (current - baseline)
 */
export default function useSectionMovements(
    section: Record<string, unknown> | null | undefined,
    options: UseSectionMovementsOptions = {},
): MovementDeltas {
    const { baseline: explicitBaseline, useLegacyFallbacks = false } = options

    // Initialise ref synchronously when an explicit baseline is provided so that
    // the first useMemo call computes correct deltas without waiting for useEffect.
    const baselineRef = useRef<Record<string, unknown> | null>(
        explicitBaseline !== undefined ? (explicitBaseline ?? null) : null,
    )

    useEffect(() => {
        if (explicitBaseline !== undefined) {
            // Quote path: caller supplies previous / baseline / null
            baselineRef.current = explicitBaseline ?? null
        } else {
            // Policy path: freeze a shallow clone of the current section on load
            baselineRef.current = section ? { ...section } : null
        }
        // Reset only when section identity changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [(section as any)?.id])

    const movements = useMemo(() => {
        const base = baselineRef.current ?? {}
        const cur = section ?? {}
        const legacyMap = useLegacyFallbacks ? POLICY_LEGACY_MAP : {}

        const getNum = (obj: Record<string, unknown>, key: MovementKey): number => {
            const v = obj[key] ?? (legacyMap[key] ? obj[legacyMap[key]!] : undefined)
            const n = typeof v === 'number' ? v : Number(v)
            return Number.isNaN(n) ? 0 : n
        }

        return MOVEMENT_KEYS.reduce(
            (acc, k) => {
                acc[k] = getNum(cur as Record<string, unknown>, k) - getNum(base, k)
                return acc
            },
            {} as MovementDeltas,
        )
    }, [section, useLegacyFallbacks])

    return movements
}
