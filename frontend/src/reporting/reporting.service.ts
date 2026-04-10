/**
 * Reporting Domain — Service Layer
 *
 * Requirements: frontend/src/reporting/reporting.requirements.md
 * REQ-RPT-FE-C-001 — all API calls via @/shared/lib/api-client/api-client
 */

import { get, post, put, del } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ReportTemplateType = 'core' | 'custom' | 'dashboard'

export interface ReportTemplate {
    id: number
    name: string
    description?: string | null
    type: ReportTemplateType
    data_source?: string | null
    date_basis?: string | null
    date_from?: string | null
    date_to?: string | null
    sort_by?: string | null
    sort_order?: 'asc' | 'desc' | null
    fields?: SelectedField[]
    filters?: ReportFilter[]
    created_by?: string | null
    created_at?: string | null
    updated_at?: string | null
}

export interface ReportFilter {
    connector?: 'AND' | 'OR'
    group?: number
    field: string
    operator: string
    value: string | string[]
}

export interface SelectedField {
    id: string
    label: string
    domain: string
}

export interface CreateReportTemplateInput {
    name: string
    description?: string | null
    data_source?: string | null
    date_basis?: string | null
    date_from?: string | null
    date_to?: string | null
    sort_by?: string | null
    sort_order?: 'asc' | 'desc' | null
    fields?: SelectedField[]
    filters?: ReportFilter[]
}

export interface FieldMapping {
    key: string
    label: string
    domain: string
    type?: 'text' | 'lookup' | 'date' | 'number'
    lookupValues?: string[]
}

export interface ExecutionHistory {
    id: number
    run_at: string
    run_by?: string | null
    row_count?: number | null
    status: 'success' | 'error'
}

// ---------------------------------------------------------------------------
// API adapters
// ---------------------------------------------------------------------------

export async function getReportTemplates(): Promise<ReportTemplate[]> {
    return get<ReportTemplate[]>('/api/report-templates')
}

export async function getReportTemplate(id: number): Promise<ReportTemplate> {
    return get<ReportTemplate>(`/api/report-templates/${id}`)
}

export async function createReportTemplate(input: CreateReportTemplateInput): Promise<ReportTemplate> {
    return post<ReportTemplate>('/api/report-templates', input)
}

export async function updateReportTemplate(id: number, input: Partial<CreateReportTemplateInput>): Promise<ReportTemplate> {
    return put<ReportTemplate>(`/api/report-templates/${id}`, input)
}

export async function deleteReportTemplate(id: number): Promise<void> {
    await del(`/api/report-templates/${id}`)
}

export async function runReport(id: number): Promise<Record<string, unknown>[]> {
    const result = await post<{ data: Record<string, unknown>[] }>(`/api/report-templates/${id}/run`, {})
    return result.data ?? []
}

/** Run a core report by fetching directly from the domain endpoint. */
export async function runCoreReport(dataSource: string): Promise<Record<string, unknown>[]> {
    return get<Record<string, unknown>[]>(`/api/${dataSource}`)
}

export async function getReportHistory(id: number): Promise<ExecutionHistory[]> {
    return get<ExecutionHistory[]>(`/api/report-templates/${id}/history`)
}

export async function getFieldMappings(domain: string): Promise<FieldMapping[]> {
    return get<FieldMapping[]>(`/api/report-field-mappings/${domain}`)
}

export async function getDateBasisOptions(): Promise<string[]> {
    return get<string[]>('/api/date-basis')
}

// ---------------------------------------------------------------------------
// Dashboard types and API adapters (REQ-RPT-FE-F-031 to F-037)
// ---------------------------------------------------------------------------

export interface DashboardSection {
    id: number
    template: string | null
}

export type DashboardWidgetType = 'metric' | 'chart' | 'table' | 'text'
export type DashboardChartType = 'bar' | 'line' | 'pie' | 'doughnut' | 'area'

export interface DashboardWidget {
    id: string
    slotId: number
    sectionId?: number | null
    title: string
    type: DashboardWidgetType
    source?: string | null
    chartType?: DashboardChartType | null
    metric?: string | null
    attribute?: string | null
    yAxisAttribute?: string | null
    legendAttribute?: string | null
    measures?: string[]
    attributes?: string[]
    xAxisLabel?: string | null
    yAxisLabel?: string | null
    categoryLabel?: string | null
    aggregation?: 'count' | 'sum' | 'avg' | 'min' | 'max'
    note?: string | null
}

export interface DashboardCustomAttributeFilter {
    field: string
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than'
    value: string
}

export interface DashboardActiveFilters {
    analysisBasis: 'cumulative' | 'ytd' | 'qtd' | 'mtd' | 'month' | 'week' | 'day'
    dateBasis: string | null
    reportingDate: string
    customAttributes: DashboardCustomAttributeFilter[]
}

export interface DashboardMetricWidgetData {
    type: 'metric'
    value: number
    label: string
}

export interface DashboardChartWidgetData {
    type: 'chart'
    rows: Array<{
        label: string
        series?: string
        values: Record<string, number>
    }>
}

export interface DashboardTableWidgetData {
    type: 'table'
    rows: Record<string, unknown>[]
}

export interface DashboardTextWidgetData {
    type: 'text'
}

export type DashboardWidgetDataResponse =
    | DashboardMetricWidgetData
    | DashboardChartWidgetData
    | DashboardTableWidgetData
    | DashboardTextWidgetData

export interface DashboardPage {
    id: number
    name: string
    template: string | null
    widgets: DashboardWidget[]
    scrollEnabled: boolean
    maxRows: number
    sections: DashboardSection[] | null
}

export interface DashboardConfig {
    pages: DashboardPage[]
    showMetadata: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    customTemplates?: Record<string, any>
}

export interface CreateDashboardInput {
    name: string
    description?: string
    config: DashboardConfig
}

export async function createDashboard(input: CreateDashboardInput): Promise<ReportTemplate> {
    return post<ReportTemplate>('/api/report-templates', {
        name: input.name,
        description: input.description ?? '',
        type: 'dashboard',
        // fields column (jsonb) stores dashboard pages config at runtime
        fields: input.config as unknown as string[],
    })
}

export async function getDashboard(id: number): Promise<ReportTemplate & { dashboardConfig: DashboardConfig }> {
    const t = await getReportTemplate(id)
    const cfg = (t.fields as unknown) as DashboardConfig | null
    const dashboardConfig: DashboardConfig = cfg && cfg.pages
        ? cfg
        : { pages: [{ id: 1, name: 'Page 1', template: null, widgets: [], scrollEnabled: false, maxRows: 12, sections: null }], showMetadata: true }
    return { ...t, dashboardConfig }
}

export async function updateDashboard(id: number, input: CreateDashboardInput): Promise<ReportTemplate> {
    return put<ReportTemplate>(`/api/report-templates/${id}`, {
        name: input.name,
        description: input.description ?? '',
        type: 'dashboard',
        fields: input.config as unknown as string[],
    })
}

export async function getDashboardWidgetData(
    widget: DashboardWidget,
    filters: DashboardActiveFilters,
): Promise<DashboardWidgetDataResponse> {
    return post<DashboardWidgetDataResponse>('/api/dashboards/widgets/data', {
        widget,
        filters,
    })
}
