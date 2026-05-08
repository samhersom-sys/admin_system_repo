/**
 * Brand Classes — Tailwind CSS class strings for JSX usage.
 * Import this wherever you need className values derived from the brand palette.
 * For raw hex/rgba values (e.g. Chart.js), import brandColors from './brandColors'.
 */
export const brandClasses = {
  button: {
    primary: 'bg-brand-500 hover:bg-brand-600 text-white border-brand-500',
    primaryLarge: 'px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600',
    primaryMedium: 'px-3 py-1.5 bg-brand-600 text-white rounded hover:bg-brand-700',
    primaryActive: 'bg-brand-600 text-white border-brand-600',
    secondary: 'bg-white hover:bg-gray-50 text-gray-700 border-gray-300',
    secondaryBlue: 'bg-brand-600 hover:bg-brand-700 text-white',
    secondaryBlueLarge: 'px-4 py-2 bg-brand-600 text-white rounded hover:bg-brand-700',
    success: 'bg-gray-800 hover:bg-gray-900 text-white',
    danger: 'bg-gray-700 hover:bg-gray-800 text-white',
  },

  toggle: {
    active: 'bg-brand-500 text-white border-brand-500',
    inactive: 'bg-white text-gray-700 border-gray-300 hover:bg-brand-50',
  },

  badge: {
    primary: 'bg-brand-100 text-brand-800 border-brand-200',
    primarySmall: 'bg-brand-100 text-brand-700',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-amber-100 text-amber-800 border-amber-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-gray-100 text-gray-800 border-gray-200',
    infoSmall: 'bg-gray-100 text-gray-700',
  },

  tab: {
    active: 'border-b-2 border-brand-500 font-medium',
    activeWithText: 'border-b-2 border-brand-500 font-semibold text-brand-600',
    inactive: 'text-gray-600 hover:text-brand-500',
  },

  text: {
    primary: 'text-brand-600',
    primaryDark: 'text-brand-700',
    primaryHover: 'hover:text-brand-600',
    secondary: 'text-brand-600',
    secondaryHover: 'hover:text-brand-600',
  },

  link: {
    primary: 'text-brand-600 hover:text-brand-800',
    secondary: 'text-brand-600 hover:text-brand-800',
  },

  icon: {
    primary: 'text-brand-600',
    primaryHover: 'text-gray-500 hover:text-brand-600',
    secondary: 'text-brand-600',
    secondaryHover: 'text-gray-500 hover:text-brand-600',
    actionOpen: 'text-emerald-500 hover:text-emerald-600',
  },

  bg: {
    primaryLight: 'bg-brand-50',
    primaryHover: 'hover:bg-brand-50',
    secondaryLight: 'bg-gray-50',
    secondaryHover: 'hover:bg-gray-50',
  },

  border: {
    primary: 'border-brand-500',
    primaryActive: 'border-brand-500 text-brand-600',
    secondary: 'border-brand-500',
    secondaryActive: 'border-brand-500 text-brand-600',
  },

  focus: {
    primary: 'focus:ring-brand-500 focus:border-brand-500',
    secondary: 'focus:ring-brand-500',
  },

  /**
   * Typography colour tiers:
   *   heading   — page titles, section headings, bold values  → text-gray-900
   *   body      — primary body copy, labels, table cells      → text-gray-700
   *   secondary — supporting context, descriptions             → text-gray-600
   *   muted     — placeholders, icons, timestamps              → text-gray-500
   */
  typography: {
    heading: 'text-gray-900',
    body: 'text-gray-700',
    secondary: 'text-gray-600',
    muted: 'text-gray-500',
  },

  table: {
    header: 'text-xs font-semibold uppercase tracking-wider',
    headerCell: 'px-4 py-2 text-left   text-xs font-semibold uppercase tracking-wider',
    headerCellRight: 'px-4 py-2 text-right  text-xs font-semibold uppercase tracking-wider',
    headerCellCenter: 'px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider',
    row: 'border-t border-gray-200 hover:bg-gray-50',
    cell: 'px-4 py-2 text-sm text-gray-700',
    cellRight: 'px-4 py-2 text-sm text-gray-700 text-right',
    cellCenter: 'px-4 py-2 text-sm text-gray-700 text-center',
  },
} as const

export default brandClasses
