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

export type ReportTemplateType = 'core' | 'custom'

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
    field: string
    operator: string
    value: string
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

export async function getReportHistory(id: number): Promise<ExecutionHistory[]> {
    return get<ExecutionHistory[]>(`/api/report-templates/${id}/history`)
}

export async function getFieldMappings(domain: string): Promise<FieldMapping[]> {
    return get<FieldMapping[]>(`/api/report-field-mappings/${domain}`)
}

export async function getDateBasisOptions(): Promise<string[]> {
    return get<string[]>('/api/date-basis')
}
