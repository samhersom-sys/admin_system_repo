/**
 * Formatters — pure presentation utilities.
 *
 * All functions are stateless and take primitive inputs.
 * No API calls, no session reads.
 */

// ---------------------------------------------------------------------------
// Number / currency
// ---------------------------------------------------------------------------

/**
 * Format a number with locale-aware thousands separators.
 * @example number(1234567) → '1,234,567'
 */
export function number(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a number as GBP currency.
 * @example currency(1000000) → '£1,000,000'
 */
export function currency(value: number, decimals = 0): string {
  return value.toLocaleString('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Format a monetary value with a given ISO currency code and locale.
 * Returns empty string for null/undefined/NaN inputs.
 * @example formatMoney(100000, 'GBP') → '£100,000.00'
 */
export function formatMoney(
  value: number | string | null | undefined,
  currencyCode = 'GBP',
  locale = 'en-GB',
  opts: Intl.NumberFormatOptions = {},
): string {
  if (value == null || value === '' || Number.isNaN(Number(value))) return ''
  const amount = typeof value === 'number' ? value : Number(value)
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
      ...opts,
    }).format(amount)
  } catch {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)
  }
}

/**
 * Parse a human-entered numeric string into a number.
 * Accepts commas, currency symbols, and spaces. Returns NaN for non-numeric input.
 * @example parseNumber('1,000.50') → 1000.5
 */
export function parseNumber(input: number | string | null | undefined): number {
  if (input == null || input === '') return NaN
  if (typeof input === 'number') return input
  const cleaned = String(input).replace(/[^0-9+\-.]/g, '').replace(/,/g, '')
  if (cleaned === '') return NaN
  const n = Number(cleaned)
  return Number.isNaN(n) ? NaN : n
}

/**
 * Format a movement delta with explicit sign and parentheses.
 * Returns empty string when delta is null, undefined, NaN, or zero.
 * @example formatMovement(1200) → '(+1,200)'
 * @example formatMovement(-500) → '(-500)'
 */
export function formatMovement(
  delta: number | null | undefined,
  locale = 'en-GB',
): string {
  if (delta == null || Number.isNaN(Number(delta)) || Number(delta) === 0) return ''
  const sign = delta > 0 ? '+' : '-'
  const val = Math.abs(Number(delta))
  return `(${sign}${new Intl.NumberFormat(locale).format(val)})`
}

/**
 * Display helper for controlled money inputs used in form editors.
 * - Empty string → returns empty string (preserves blank controlled input)
 * - null/undefined → returns '0.00'
 * - Otherwise formats to 2 decimal places
 * @example displayEditMoney(1000) → '1,000.00'
 */
export function displayEditMoney(
  value: number | string | null | undefined,
  locale = 'en-GB',
): string {
  if (value === '') return ''
  const num = value == null ? 0 : Number(value)
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isNaN(num) ? 0 : num)
}

// ---------------------------------------------------------------------------
// Date / time
// ---------------------------------------------------------------------------

/**
 * Format an ISO date string to a short locale date.
 * @example date('2024-06-15T10:00:00Z') → '15/06/2024'
 */
export function date(isoString: string): string {
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  return d.toLocaleDateString('en-GB')
}

/**
 * Format an ISO date string to month + year only.
 * @example monthYear('2024-06-15') → 'Jun 2024'
 */
export function monthYear(isoString: string): string {
  const d = new Date(isoString)
  if (isNaN(d.getTime())) return isoString
  return d.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
}

/**
 * Return a human-readable relative time string.
 * Falls back to formatted date for intervals more than 30 days.
 * @example relativeTime('2024-06-15T08:00:00Z') → '2 hours ago'
 */
export function relativeTime(isoString: string): string {
  const then = new Date(isoString)
  if (isNaN(then.getTime())) return isoString

  const diffMs = Date.now() - then.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHrs = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return date(isoString)
}
