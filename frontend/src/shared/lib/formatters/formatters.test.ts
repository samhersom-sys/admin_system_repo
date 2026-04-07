/**
 * TESTS — lib/formatters
 * Second artifact. Requirements: lib/formatters/formatters.requirements.md
 * Test ID format: T-lib-formatters-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=formatters.test
 */

import { number, currency, date, monthYear, relativeTime, formatMoney, parseNumber, formatMovement, displayEditMoney } from './formatters'

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

// ---------------------------------------------------------------------------
// R06 — formatMoney()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R06: formatMoney() formats monetary value with currency code', () => {
    it('formats a GBP value with £ symbol and 2 decimals', () => {
        const result = formatMoney(100000, 'GBP')
        expect(result).toContain('100,000')
        expect(result).toContain('£')
    })

    it('returns empty string for null input', () => {
        expect(formatMoney(null)).toBe('')
    })

    it('returns empty string for undefined input', () => {
        expect(formatMoney(undefined)).toBe('')
    })

    it('returns empty string for NaN-like string', () => {
        expect(formatMoney('abc')).toBe('')
    })

    it('formats a numeric string as a monetary value', () => {
        const result = formatMoney('50000', 'USD', 'en-US')
        expect(result).toContain('50,000')
    })
})

// ---------------------------------------------------------------------------
// R07 — parseNumber()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R07: parseNumber() parses human-entered numeric strings', () => {
    it('parses an integer', () => {
        expect(parseNumber(1234)).toBe(1234)
    })

    it('parses a comma-separated number string', () => {
        expect(parseNumber('1,000,500')).toBe(1000500)
    })

    it('returns NaN for null', () => {
        expect(parseNumber(null)).toBeNaN()
    })

    it('returns NaN for empty string', () => {
        expect(parseNumber('')).toBeNaN()
    })

    it('returns NaN for non-numeric string', () => {
        expect(parseNumber('abc')).toBeNaN()
    })
})

// ---------------------------------------------------------------------------
// R08 — formatMovement()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R08: formatMovement() formats movement delta with sign', () => {
    it('formats a positive delta with (+ prefix', () => {
        expect(formatMovement(1200)).toBe('(+1,200)')
    })

    it('formats a negative delta with (- prefix', () => {
        expect(formatMovement(-500)).toBe('(-500)')
    })

    it('returns empty string for zero', () => {
        expect(formatMovement(0)).toBe('')
    })

    it('returns empty string for null', () => {
        expect(formatMovement(null)).toBe('')
    })

    it('returns empty string for undefined', () => {
        expect(formatMovement(undefined)).toBe('')
    })
})

// ---------------------------------------------------------------------------
// R09 — displayEditMoney()
// ---------------------------------------------------------------------------

describe('T-lib-formatters-R09: displayEditMoney() formats value for controlled inputs', () => {
    it('formats a number to 2 decimal places', () => {
        expect(displayEditMoney(1000)).toBe('1,000.00')
    })

    it('returns 0.00 for null', () => {
        expect(displayEditMoney(null)).toBe('0.00')
    })

    it('returns 0.00 for undefined', () => {
        expect(displayEditMoney(undefined)).toBe('0.00')
    })

    it('returns empty string for empty string (preserves controlled blank)', () => {
        expect(displayEditMoney('')).toBe('')
    })

    it('formats a decimal value correctly', () => {
        const result = displayEditMoney(1234.5)
        expect(result).toContain('1,234')
        expect(result).toContain('50')
    })
})
