/**
 * TESTS — lib/formatters
 * Second artifact. Requirements: lib/formatters/formatters.requirements.md
 * Test ID format: T-lib-formatters-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=formatters.test
 */

import { number, currency, date, monthYear, relativeTime } from './formatters'

// ---------------------------------------------------------------------------
// R01 — number()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R01: number() formats with thousands separators', () => {
    it('formats an integer with commas', () => {
        expect(number(1234567)).toBe('1,234,567')
    })

    it('formats zero', () => {
        expect(number(0)).toBe('0')
    })

    it('formats a decimal with specified decimal places', () => {
        const result = number(1234.5, 2)
        expect(result).toContain('1,234')
        expect(result).toContain('50')
    })
})

// ---------------------------------------------------------------------------
// R02 — currency()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R02: currency() formats as GBP', () => {
    it('includes £ symbol', () => {
        expect(currency(1000000)).toContain('£')
    })

    it('formats with thousands separator', () => {
        expect(currency(1000000)).toContain('1,000,000')
    })

    it('formats zero as £0', () => {
        expect(currency(0)).toContain('£')
        expect(currency(0)).toContain('0')
    })
})

// ---------------------------------------------------------------------------
// R03 — date()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R03: date() formats to British short date', () => {
    it('formats an ISO date to DD/MM/YYYY', () => {
        const result = date('2024-06-15T10:00:00Z')
        expect(result).toContain('15')
        expect(result).toContain('06')
        expect(result).toContain('2024')
    })

    it('returns the original string without throwing on invalid input', () => {
        expect(() => date('not-a-date')).not.toThrow()
        expect(date('not-a-date')).toBe('not-a-date')
    })
})

// ---------------------------------------------------------------------------
// R04 — monthYear()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R04: monthYear() formats to abbreviated month and year', () => {
    it('formats a valid ISO date to "Mon YYYY" format', () => {
        const result = monthYear('2024-06-15')
        expect(result).toContain('Jun')
        expect(result).toContain('2024')
    })

    it('returns the original string without throwing on invalid input', () => {
        expect(() => monthYear('bad')).not.toThrow()
        expect(monthYear('bad')).toBe('bad')
    })
})

// ---------------------------------------------------------------------------
// R05 — relativeTime()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R05: relativeTime() returns human-readable relative time', () => {
    it('returns "just now" for a timestamp less than 1 minute ago', () => {
        const nowish = new Date(Date.now() - 10_000).toISOString()
        expect(relativeTime(nowish)).toBe('just now')
    })

    it('returns "N minutes ago" for a timestamp ~30 minutes ago', () => {
        const thirtyMinsAgo = new Date(Date.now() - 30 * 60_000).toISOString()
        expect(relativeTime(thirtyMinsAgo)).toMatch(/minute/)
    })

    it('returns "N hours ago" for a timestamp ~2 hours ago', () => {
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60_000).toISOString()
        expect(relativeTime(twoHoursAgo)).toMatch(/hour/)
    })

    it('returns "N days ago" for a timestamp ~3 days ago', () => {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000).toISOString()
        expect(relativeTime(threeDaysAgo)).toMatch(/day/)
    })

    it('returns the original string without throwing on invalid input', () => {
        expect(() => relativeTime('bad')).not.toThrow()
        expect(relativeTime('bad')).toBe('bad')
    })
})
