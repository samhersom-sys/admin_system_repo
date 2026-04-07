/**
 * Movement — shared delta display component.
 *
 * Renders a movement delta as a parenthesized, colour-coded value.
 * Positive deltas are shown in dark text, negative in red.
 * Returns null when delta is zero or absent (unless renderEmpty is true).
 *
 * Requirements: src/shared/components/Movement/Movement.requirements.md
 * Tests: src/shared/components/Movement/__tests__/Movement.test.tsx
 */

import React from 'react'
import { formatMovement } from '@/shared/lib/formatters/formatters'

export interface MovementProps {
  /** The numeric delta to display. null/undefined/0 renders nothing by default. */
  delta: number | null | undefined
  /** Render as a disabled input (default) or inline span. */
  as?: 'input' | 'span'
  className?: string
  locale?: string
  /** If true, renders a blank input even when delta is zero/absent. */
  renderEmpty?: boolean
}

const INPUT_BASE =
  'w-full px-2 py-1 text-sm border border-gray-300 rounded bg-gray-100 text-right focus:outline-none'

const Movement: React.FC<MovementProps> = ({
  delta,
  as = 'input',
  className = '',
  locale = 'en-GB',
  renderEmpty = false,
}) => {
  const text = formatMovement(delta, locale)
  const has = !!text
  const colorClass = has
    ? delta! > 0
      ? 'text-gray-700'
      : 'text-red-700'
    : 'text-gray-500'

  if (!has && !renderEmpty) return null

  const combined = `${INPUT_BASE} ${colorClass} ${className}`.trim()

  if (as === 'span') {
    return <span className={colorClass}>{text}</span>
  }

  return (
    <input
      disabled
      value={has ? text : ''}
      readOnly
      className={combined}
      aria-label="movement delta"
    />
  )
}

export default Movement
