/**
 * Settings service (frontend) — REQ-SETTINGS-RATING-*, REQ-SETTINGS-PRODUCTS-*,
 * REQ-SETTINGS-DQUALITY-*, REQ-SETTINGS-ORG-*
 * All API calls for the settings domain.
 * Requirements: settings.requirements.md
 */

import * as apiClient from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RatingSchedule {
    id: number
    name: string
    effective_date: string | null
    expiry_date: string | null
    is_active: boolean
}

export interface RatingRule {
    id: number
    field_name: string
    operator: string
    field_value: string
    rate_percentage: number
}

export interface RatingScheduleSavePayload {
    name: string
    effective_date: string | null
    expiry_date: string | null
    is_active: boolean
    rules: RatingRule[]
}

export interface Product {
    id: number
    name: string
    code: string
    product_type: string
    line_of_business: string
    underwriting_year: number
    description: string
    is_active: boolean
}

export interface NewProductForm {
    name: string
    code: string
    product_type: string
    line_of_business: string
    underwriting_year: number
    description: string
}

export interface WorkflowStep {
    id: number
    step_name: string
    step_code: string
    description: string
    is_active: boolean
    is_default: boolean
    sort_order: number
}

export interface DQSettings {
    enableBASectionDateValidation: boolean
    enableQuoteMandatoryFields: boolean
    enablePolicyMandatoryFields: boolean
    excludeDraftStatus: boolean
    severityThreshold: 'low' | 'medium' | 'high'
    autoCheckOnSave: boolean
    emailNotifications: boolean
    notificationEmail: string
}

export interface OrgEntity {
    id: number
    entityName: string
    entityCode: string
    isActive: boolean
    description: string
    users: number[]
}

export interface HierarchyLevel {
    id: number
    levelId: number
    levelName: string
    levelOrder: number
    description: string
}

export interface HierarchyLink {
    id: number
    parentLevelId: number
    childLevelId: number
    parentLevelName: string
    childLevelName: string
    description: string
    parentConfigId?: number
    childConfigId?: number
}

export interface GlobalLevel {
    id: number
    levelName: string
    levelOrder: number
}

export interface User {
    id: number
    username: string
    email: string
}

// ---------------------------------------------------------------------------
// Rating Rules
// ---------------------------------------------------------------------------

export async function getRatingSchedules(): Promise<RatingSchedule[]> {
    return apiClient.get<RatingSchedule[]>('/api/rating-schedules')
}

export async function getRatingSchedule(id: string): Promise<RatingSchedule> {
    return apiClient.get<RatingSchedule>(`/api/rating-schedules/${id}`)
}

export async function getRatingRules(scheduleId: string): Promise<RatingRule[]> {
    return apiClient.get<RatingRule[]>(`/api/rating-schedules/${scheduleId}/rules`)
}

export async function saveRatingSchedule(
    id: string,
    payload: RatingScheduleSavePayload,
): Promise<RatingSchedule> {
    return apiClient.put<RatingSchedule>(`/api/rating-schedules/${id}`, payload)
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
    return apiClient.get<Product[]>('/api/settings/products')
}

export async function getProduct(id: string): Promise<Product> {
    return apiClient.get<Product>(`/api/settings/products/${id}`)
}

export async function createProduct(data: NewProductForm): Promise<Product> {
    return apiClient.post<Product>('/api/settings/products', data)
}

export async function updateProduct(id: string, data: Product): Promise<Product> {
    return apiClient.put<Product>(`/api/settings/products/${id}`, data)
}

export async function getWorkflowSteps(productId: string): Promise<WorkflowStep[]> {
    return apiClient.get<WorkflowStep[]>(`/api/settings/products/${productId}/workflow-steps`)
}

// ---------------------------------------------------------------------------
// Data Quality Settings
// ---------------------------------------------------------------------------

export async function getDataQualitySettings(): Promise<DQSettings> {
    return apiClient.get<DQSettings>('/api/settings/data-quality')
}

export async function saveDataQualitySettings(settings: DQSettings): Promise<DQSettings> {
    return apiClient.put<DQSettings>('/api/settings/data-quality', settings)
}

// ---------------------------------------------------------------------------
// Organisation
// ---------------------------------------------------------------------------

export async function getOrgByCode(orgCode: string): Promise<OrgEntity[]> {
    return apiClient.get<OrgEntity[]>(`/api/organisation-entities?code=${orgCode}`)
}

export async function createOrg(payload: Partial<OrgEntity>): Promise<OrgEntity> {
    return apiClient.post<OrgEntity>('/api/organisation-entities', payload)
}

export async function updateOrg(id: number, payload: Partial<OrgEntity>): Promise<OrgEntity> {
    return apiClient.put<OrgEntity>(`/api/organisation-entities/${id}`, payload)
}

export async function getOrgHierarchyConfig(orgId: number): Promise<HierarchyLevel[]> {
    return apiClient.get<HierarchyLevel[]>(`/api/organisation-entities/${orgId}/hierarchy-config`)
}

export async function saveOrgHierarchyConfig(
    orgId: number,
    levels: HierarchyLevel[],
): Promise<void> {
    return apiClient.post(`/api/organisation-entities/${orgId}/hierarchy-config`, { levels })
}

export async function getOrgHierarchyLinks(orgId: number): Promise<HierarchyLink[]> {
    return apiClient.get<HierarchyLink[]>(`/api/organisation-entities/${orgId}/hierarchy-links`)
}

export async function saveOrgHierarchyLinks(
    orgId: number,
    links: HierarchyLink[],
): Promise<void> {
    return apiClient.post(`/api/organisation-entities/${orgId}/hierarchy-links`, { links })
}

export async function getUsers(): Promise<User[]> {
    return apiClient.get<User[]>('/api/users')
}

export async function getGlobalHierarchyLevels(): Promise<GlobalLevel[]> {
    return apiClient.get<GlobalLevel[]>('/api/organisation-hierarchy')
}
