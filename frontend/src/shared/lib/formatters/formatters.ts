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

  const diffMs   = Date.now() - then.getTime()
  const diffMins = Math.floor(diffMs / 60_000)
  const diffHrs  = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHrs / 24)

  if (diffMins < 1)   return 'just now'
  if (diffMins < 60)  return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`
  if (diffHrs  < 24)  return `${diffHrs} hour${diffHrs === 1 ? '' : 's'} ago`
  if (diffDays < 30)  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  return date(isoString)
}
