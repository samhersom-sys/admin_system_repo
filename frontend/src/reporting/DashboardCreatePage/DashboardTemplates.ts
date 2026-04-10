/**
 * DashboardTemplates — REQ-RPT-FE-F-036
 *
 * Standard layout templates for dashboard pages.
 * Each template defines named widget slots positioned on a 4-column CSS grid.
 */

export interface TemplateSlot {
    id: number
    col: number
    row: number
    colSpan: number
    rowSpan: number
}

export interface DashboardTemplate {
    id: string
    name: string
    description: string
    icon: string
    slots: TemplateSlot[]
}

export const DASHBOARD_TEMPLATES: Record<string, DashboardTemplate> = {
    single: {
        id: 'single',
        name: 'Single Widget',
        description: 'One large widget',
        icon: '▢',
        slots: [{ id: 1, col: 0, row: 0, colSpan: 4, rowSpan: 3 }],
    },
    twoColumn: {
        id: 'twoColumn',
        name: 'Two Columns',
        description: 'Two equal-width widgets',
        icon: '▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 2, rowSpan: 3 },
            { id: 2, col: 2, row: 0, colSpan: 2, rowSpan: 3 },
        ],
    },
    threeColumn: {
        id: 'threeColumn',
        name: 'Three Columns',
        description: 'Three equal widgets side by side',
        icon: '▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 2 },
            { id: 2, col: 1, row: 0, colSpan: 2, rowSpan: 2 },
            { id: 3, col: 3, row: 0, colSpan: 1, rowSpan: 2 },
        ],
    },
    fourGrid: {
        id: 'fourGrid',
        name: 'Four Grid',
        description: '2x2 grid of widgets',
        icon: '▢▢\n▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 2, rowSpan: 2 },
            { id: 2, col: 2, row: 0, colSpan: 2, rowSpan: 2 },
            { id: 3, col: 0, row: 2, colSpan: 2, rowSpan: 2 },
            { id: 4, col: 2, row: 2, colSpan: 2, rowSpan: 2 },
        ],
    },
    headerWithThree: {
        id: 'headerWithThree',
        name: 'Header + Three',
        description: 'Large header with three widgets below',
        icon: '▢▢▢▢\n▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 4, rowSpan: 2 },
            { id: 2, col: 0, row: 2, colSpan: 1, rowSpan: 2 },
            { id: 3, col: 1, row: 2, colSpan: 2, rowSpan: 2 },
            { id: 4, col: 3, row: 2, colSpan: 1, rowSpan: 2 },
        ],
    },
    leftSidebar: {
        id: 'leftSidebar',
        name: 'Left Sidebar',
        description: 'Sidebar with two main widgets',
        icon: '▢▢▢\n▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 4 },
            { id: 2, col: 1, row: 0, colSpan: 3, rowSpan: 2 },
            { id: 3, col: 1, row: 2, colSpan: 3, rowSpan: 2 },
        ],
    },
    executive: {
        id: 'executive',
        name: 'Executive Dashboard',
        description: 'KPIs at top, charts below',
        icon: '▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 2, col: 1, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 3, col: 2, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 4, col: 3, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 5, col: 0, row: 1, colSpan: 2, rowSpan: 3 },
            { id: 6, col: 2, row: 1, colSpan: 2, rowSpan: 3 },
        ],
    },
    detailed: {
        id: 'detailed',
        name: 'Detailed View',
        description: 'Mix of small and large widgets',
        icon: '▢▢▢▢\n▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 3, rowSpan: 2 },
            { id: 2, col: 3, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 3, col: 3, row: 1, colSpan: 1, rowSpan: 1 },
            { id: 4, col: 0, row: 2, colSpan: 1, rowSpan: 2 },
            { id: 5, col: 1, row: 2, colSpan: 1, rowSpan: 2 },
            { id: 6, col: 2, row: 2, colSpan: 2, rowSpan: 2 },
        ],
    },
    metricsBar: {
        id: 'metricsBar',
        name: 'Metrics Bar',
        description: 'Four metrics on top, large charts below',
        icon: '▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 2, col: 1, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 3, col: 2, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 4, col: 3, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 5, col: 0, row: 1, colSpan: 2, rowSpan: 3 },
            { id: 6, col: 2, row: 1, colSpan: 2, rowSpan: 3 },
        ],
    },
    analytical: {
        id: 'analytical',
        name: 'Analytical',
        description: 'Perfect for deep data analysis',
        icon: '▢▢▢▢\n▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 2, rowSpan: 1 },
            { id: 2, col: 2, row: 0, colSpan: 2, rowSpan: 1 },
            { id: 3, col: 0, row: 1, colSpan: 4, rowSpan: 3 },
            { id: 4, col: 0, row: 4, colSpan: 2, rowSpan: 2 },
            { id: 5, col: 2, row: 4, colSpan: 2, rowSpan: 2 },
        ],
    },
    operational: {
        id: 'operational',
        name: 'Operational Monitor',
        description: 'Real-time operations monitoring',
        icon: '▢▢▢▢\n▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 2, col: 1, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 3, col: 2, row: 0, colSpan: 2, rowSpan: 2 },
            { id: 4, col: 0, row: 1, colSpan: 2, rowSpan: 3 },
            { id: 5, col: 2, row: 2, colSpan: 2, rowSpan: 2 },
        ],
    },
    rightSidebar: {
        id: 'rightSidebar',
        name: 'Right Sidebar',
        description: 'Main content with right sidebar',
        icon: '▢▢▢▢\n▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 3, rowSpan: 2 },
            { id: 2, col: 3, row: 0, colSpan: 1, rowSpan: 2 },
            { id: 3, col: 0, row: 2, colSpan: 3, rowSpan: 2 },
            { id: 4, col: 3, row: 2, colSpan: 1, rowSpan: 2 },
        ],
    },
    compact: {
        id: 'compact',
        name: 'Compact Grid',
        description: 'Eight small widgets in tight grid',
        icon: '▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 2, col: 1, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 3, col: 2, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 4, col: 3, row: 0, colSpan: 1, rowSpan: 1 },
            { id: 5, col: 0, row: 1, colSpan: 1, rowSpan: 1 },
            { id: 6, col: 1, row: 1, colSpan: 1, rowSpan: 1 },
            { id: 7, col: 2, row: 1, colSpan: 1, rowSpan: 1 },
            { id: 8, col: 3, row: 1, colSpan: 1, rowSpan: 1 },
        ],
    },
    focusCenter: {
        id: 'focusCenter',
        name: 'Focus Center',
        description: 'Large central widget with surrounding metrics',
        icon: '▢▢▢▢\n▢▢▢▢\n▢▢▢▢',
        slots: [
            { id: 1, col: 0, row: 0, colSpan: 1, rowSpan: 2 },
            { id: 2, col: 1, row: 0, colSpan: 2, rowSpan: 4 },
            { id: 3, col: 3, row: 0, colSpan: 1, rowSpan: 2 },
            { id: 4, col: 0, row: 2, colSpan: 1, rowSpan: 2 },
            { id: 5, col: 3, row: 2, colSpan: 1, rowSpan: 2 },
        ],
    },
}
