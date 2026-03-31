/**
 * Brand Colors — website design tokens.
 *
 * Copied from frontend/lib/design-tokens/brandColors.ts at Phase 3 (2026-03-17).
 * Independently editable: www.thepolicyforge.com may evolve its own marketing palette
 * without touching the app's tokens. If a shared package is ever needed, extract
 * both copies into packages/design-tokens/ and replace these files with re-exports.
 *
 * For Tailwind className usage, import brandClasses from './brandClasses'.
 */

// ─── Core monochrome constants ────────────────────────────────────────────────
const CHROME_TEXT = '#ffffff'
const NEAR_BLACK   = '#111826'  // neutral.900
const DARKER       = '#1f2937'  // neutral.800
const DARK         = '#374151'  // neutral.700
const MID_DARK     = '#4b5563'  // neutral.600
const MID          = '#6b7280'  // neutral.500
const MID_LIGHT    = '#9ca3af'  // neutral.400
const SOFT         = '#d1d5db'  // neutral.300
const LIGHT        = '#e5e7eb'  // neutral.200
const LIGHTER      = '#f3f4f6'  // neutral.100
const OFF_WHITE    = '#f9fafb'  // neutral.50

// ─── Exported palette ─────────────────────────────────────────────────────────
export const brandColors = {
  primary: {
    main: '#56c8b1',   // brand-500
    dark: '#3aad97',   // brand-600
  },

  secondary: {
    main: '#3b82f6',   // blue-500
    dark: '#2563eb',   // blue-600
  },

  neutral: {
    50:  OFF_WHITE,
    100: LIGHTER,
    200: LIGHT,
    300: SOFT,
    400: MID_LIGHT,
    500: MID,
    600: MID_DARK,
    700: DARK,
    800: DARKER,
    900: NEAR_BLACK,
  },

  success: '#10b981',  // emerald-500
  warning: '#f59e0b',  // amber-500
  error:   '#ef4444',  // red-500

  ui: {
    chromeText:   CHROME_TEXT,
    homeBeige:    '#ede8df',
  },

  typeScale: {
    xs:    '0.75rem',
    sm:    '0.875rem',
    base:  '1rem',
    lg:    '1.125rem',
    xl:    '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.75rem',
    '4xl': '2.25rem',
  },

  fontFamily: {
    sans: "'Inter', system-ui, sans-serif",
    mono: "'Courier New', monospace",
  },

  fontWeight: {
    normal:   400,
    medium:   500,
    semibold: 600,
    bold:     700,
  },
} as const

export default brandColors
