/**
 * Brand Colors — single source of truth for all colour values.
 * Import this wherever you need raw hex/rgba values (e.g. Chart.js configs).
 * For JSX/Tailwind className usage, import brandClasses from './brandClasses'.
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

  table: {
    headerBg:       NEAR_BLACK,
    headerText:     CHROME_TEXT,
    border:         LIGHT,
    rowHover:       OFF_WHITE,
    sortableHover:  LIGHT,
  },

  sidebar: {
    bg:               NEAR_BLACK,
    text:             CHROME_TEXT,
    muted:            MID_LIGHT,
    border:           '#000000',
    hover:            DARKER,
    active:           DARK,
    submenuBg:        DARKER,
    submenuSep:       DARK,
    scrollTrack:      NEAR_BLACK,
    scrollThumb:      DARK,
    scrollThumbHover: MID_DARK,
  },

  ui: {
    chromeText:   CHROME_TEXT,
    loginBg:      NEAR_BLACK,
    loginBgHover: DARKER,
    homeBeige:    '#ede8df',
  },

  statusLight: {
    success: { bg: '#d1fae5' },  // emerald-100
    error:   { bg: '#fee2e2' },  // red-100
    warning: { bg: '#fffbeb' },  // amber-50
    info:    { bg: '#eff6ff' },  // blue-50
  },

  chart: {
    palette: ['#56c8b1', MID, '#facc15', '#22c55e', '#3b82f6'],

    series: [
      { border: 'rgba(249, 115, 22, 1)',  bg: 'rgba(249, 115, 22, 0.2)'  },  // orange
      { border: 'rgba(59, 130, 246, 1)',  bg: 'rgba(59, 130, 246, 0.2)'  },  // blue
      { border: 'rgba(16, 185, 129, 1)',  bg: 'rgba(16, 185, 129, 0.2)'  },  // emerald
      { border: 'rgba(168, 85, 247, 1)',  bg: 'rgba(168, 85, 247, 0.2)'  },  // violet
      { border: 'rgba(239, 68, 68, 1)',   bg: 'rgba(239, 68, 68, 0.2)'   },  // red
    ],

    axis: {
      labels: DARK,
      ticks:  MID,
      grid:   LIGHT,
    },
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
