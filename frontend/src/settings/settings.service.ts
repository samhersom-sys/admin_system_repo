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
    effective_time?: string | null
    expiry_time?: string | null
    is_active: boolean
    version?: number | null
    placement_methods?: string[] | null
    currency?: string | null
    org_code?: string
    org_name?: string
}

export interface RatingScheduleVersion {
    id: number
    name: string
    version: number
    parent_schedule_id?: number | null
    created_at?: string | null
    created_by?: string | null
    last_modified_date?: string | null
}

export interface RatingRule {
    id: number
    field_name: string
    operator: string
    field_value: string
    rate_percentage: number
}

export interface RatingCondition {
    id: number
    logical_operator: 'AND' | 'OR' | null
    field_name: string
    operator: string
    field_value: string
}

export interface RatingGroup {
    id: number
    name: string
    group_number: number
    rate_percentage: number
    conditions: RatingCondition[]
}

export const FIELD_OPTIONS: { value: string; label: string }[] = [
    { value: 'quote_policy_method_of_placement', label: 'Quote/Policy Header: Method of Placement' },
    { value: 'quote_policy_inception_date', label: 'Quote/Policy Header: Inception Date' },
    { value: 'quote_policy_inception_time', label: 'Quote/Policy Header: Inception Time' },
    { value: 'quote_policy_expiry_date', label: 'Quote/Policy Header: Expiry Date' },
    { value: 'quote_policy_expiry_time', label: 'Quote/Policy Header: Expiry Time' },
    { value: 'quote_policy_status', label: 'Quote/Policy Header: Status' },
    { value: 'quote_policy_business_type', label: 'Quote/Policy Header: Business Type' },
    { value: 'quote_policy_contract_type', label: 'Quote/Policy Header: Contract Type' },
    { value: 'quote_policy_insured', label: 'Quote/Policy Header: Insured' },
    { value: 'postcode', label: 'Location: Postcode' },
    { value: 'country', label: 'Location: Country' },
    { value: 'subdivision', label: 'Location: State/Province' },
    { value: 'city', label: 'Location: City' },
    { value: 'sum_insured', label: 'Location: Sum Insured' },
    { value: 'construction_type', label: 'Location: Construction Type' },
    { value: 'occupancy', label: 'Location: Occupancy' },
    { value: 'year_built', label: 'Location: Year Built' },
    { value: 'coverage_detail', label: 'Location: Coverage Detail' },
    { value: 'coverage_detail_sub_type', label: 'Location: Coverage Detail Sub-Type' },
    { value: 'section_class_of_business', label: 'Section: Class of Business' },
    { value: 'section_inception_date', label: 'Section: Inception Date' },
    { value: 'section_effective_date', label: 'Section: Effective Date' },
    { value: 'section_expiry_date', label: 'Section: Expiry Date' },
    { value: 'section_inception_time', label: 'Section: Inception Time' },
    { value: 'section_effective_time', label: 'Section: Effective Time' },
    { value: 'section_expiry_time', label: 'Section: Expiry Time' },
    { value: 'section_days_on_cover', label: 'Section: Days on Cover' },
    { value: 'section_limit_currency', label: 'Section: Limit Currency' },
    { value: 'section_limit_amount', label: 'Section: Limit Amount' },
    { value: 'section_limit_loss_qualifier', label: 'Section: Limit Loss Qualifier' },
    { value: 'section_excess_currency', label: 'Section: Excess Currency' },
    { value: 'section_excess_amount', label: 'Section: Excess Amount' },
    { value: 'section_excess_loss_qualifier', label: 'Section: Excess Loss Qualifier' },
    { value: 'section_sum_insured_currency', label: 'Section: Sum Insured Currency' },
    { value: 'section_sum_insured_amount', label: 'Section: Sum Insured Amount' },
    { value: 'section_premium_currency', label: 'Section: Premium Currency' },
    { value: 'section_gross_premium', label: 'Section: Gross Premium' },
    { value: 'section_annual_net_premium', label: 'Section: Annual Net Premium' },
    { value: 'section_written_order', label: 'Section: Written Order %' },
    { value: 'section_signed_order', label: 'Section: Signed Order %' },
    { value: 'section_time_basis', label: 'Section: Time Basis' },
    { value: 'section_written_order_basis', label: 'Section: Written Order Basis' },
    { value: 'section_signed_order_basis', label: 'Section: Signed Order Basis' },
    { value: 'section_written_line_total', label: 'Section: Written Line Total' },
    { value: 'section_signed_line_total', label: 'Section: Signed Line Total' },
    { value: 'section_delegated_authority_ref', label: 'Section: Delegated Authority Ref' },
    { value: 'section_delegated_authority_section_ref', label: 'Section: Delegated Authority Section Ref' },
    { value: 'coverage_name', label: 'Coverage: Coverage' },
    { value: 'coverage_class_of_business', label: 'Coverage: Class of Business' },
    { value: 'coverage_effective_date', label: 'Coverage: Effective Date' },
    { value: 'coverage_expiry_date', label: 'Coverage: Expiry Date' },
    { value: 'coverage_days_on_cover', label: 'Coverage: Days on Cover' },
    { value: 'coverage_limit_currency', label: 'Coverage: Limit Currency' },
    { value: 'coverage_limit_amount', label: 'Coverage: Limit Amount' },
    { value: 'coverage_limit_loss_qualifier', label: 'Coverage: Limit Loss Qualifier' },
    { value: 'coverage_excess_currency', label: 'Coverage: Excess Currency' },
    { value: 'coverage_excess_amount', label: 'Coverage: Excess Amount' },
    { value: 'coverage_sum_insured_currency', label: 'Coverage: Sum Insured Currency' },
    { value: 'coverage_sum_insured', label: 'Coverage: Sum Insured' },
    { value: 'coverage_premium_currency', label: 'Coverage: Premium Currency' },
    { value: 'coverage_gross_premium', label: 'Coverage: Gross Premium' },
    { value: 'coverage_net_premium', label: 'Coverage: Net Premium' },
    { value: 'coverage_tax_receivable', label: 'Coverage: Tax Receivable' },
    { value: 'coverage_detail_currency', label: 'Coverage Detail: Currency' },
    { value: 'coverage_detail_sum_insured', label: 'Coverage Detail: Sum Insured' },
    { value: 'coverage_type', label: 'Coverage Detail: Coverage Type' },
    { value: 'coverage_sub_type', label: 'Coverage Detail: Coverage Sub-Type' },
]

export const OPERATOR_OPTIONS: { value: string; label: string }[] = [
    { value: '=', label: 'Equals' },
    { value: '!=', label: 'Not Equals' },
    { value: '>', label: 'Greater Than' },
    { value: '<', label: 'Less Than' },
    { value: '>=', label: 'Greater Than or Equal' },
    { value: '<=', label: 'Less Than or Equal' },
    { value: 'contains', label: 'Contains' },
    { value: 'starts_with', label: 'Starts With' },
]

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
    productCategoryId: number | null
    productCategoryName: string
    line_of_business: string
    underwriting_year: number
    description: string
    is_active: boolean
}

export interface NewProductForm {
    name: string
    code: string
    productCategoryId: number | null
    line_of_business: string
    underwriting_year: number
    description: string
}

export interface ProductCategory {
    id: number
    name: string
    productCount: number
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

export interface PolicyGrainRuleOption {
    value: string
    label: string
}

export interface PolicyGrainFieldOption {
    value: string
    label: string
}

export interface PolicyGrainDefaultsMetadata {
    rules: PolicyGrainRuleOption[]
    fieldsByPolicyGrain: {
        section: PolicyGrainFieldOption[]
        coverage: PolicyGrainFieldOption[]
        coverage_element: PolicyGrainFieldOption[]
    }
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

export interface AdminUser {
    id: number
    username: string
    email: string
    fullName: string | null
    orgCode: string | null
    orgName: string | null
    role: string
    isActive: boolean
    lastLogin: string | null
    createdAt: string
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

export async function getRatingScheduleVersions(scheduleId: string): Promise<RatingScheduleVersion[]> {
    return apiClient.get<RatingScheduleVersion[]>(`/api/rating-schedules/${scheduleId}/versions`)
}

export async function createRatingSchedule(payload: Pick<RatingSchedule, 'name' | 'effective_date' | 'expiry_date' | 'is_active'>): Promise<RatingSchedule> {
    return apiClient.post<RatingSchedule>('/api/rating-schedules', payload)
}

export async function saveRatingSchedule(
    id: string,
    payload: RatingScheduleSavePayload,
): Promise<RatingSchedule> {
    return apiClient.put<RatingSchedule>(`/api/rating-schedules/${id}`, payload)
}

export interface LookupClassOfBusiness {
    code: string
    name: string
}

export async function getLookupClassesOfBusiness(): Promise<LookupClassOfBusiness[]> {
    return apiClient.get<LookupClassOfBusiness[]>('/api/lookups/classesOfBusiness')
}

export async function getLookupCurrencies(): Promise<string[]> {
    return apiClient.get<string[]>('/api/lookups/currencies')
}

export async function getLookupMethodsOfPlacement(): Promise<string[]> {
    return apiClient.get<string[]>('/api/lookups/methodsOfPlacement')
}

export async function getLookupContractTypes(): Promise<string[]> {
    return apiClient.get<string[]>('/api/lookups/contractTypes')
}

export async function getLookupLossQualifiers(): Promise<string[]> {
    return apiClient.get<string[]>('/api/lookups/lossQualifiers')
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

export async function getProductCategories(): Promise<ProductCategory[]> {
    return apiClient.get<ProductCategory[]>('/api/settings/product-categories')
}

export async function createProductCategory(data: { name: string }): Promise<ProductCategory> {
    return apiClient.post<ProductCategory>('/api/settings/product-categories', data)
}

export async function deleteProductCategory(id: string | number): Promise<{ deleted: boolean; id: number }> {
    return apiClient.del<{ deleted: boolean; id: number }>(`/api/settings/product-categories/${id}`)
}

export async function createProduct(data: NewProductForm): Promise<Product> {
    return apiClient.post<Product>('/api/settings/products', {
        ...data,
        product_category_id: data.productCategoryId,
    })
}

export async function updateProduct(id: string, data: Product): Promise<Product> {
    return apiClient.put<Product>(`/api/settings/products/${id}`, {
        ...data,
        product_category_id: data.productCategoryId,
    })
}

export async function getWorkflowSteps(productId: string): Promise<WorkflowStep[]> {
    return apiClient.get<WorkflowStep[]>(`/api/settings/products/${productId}/workflow-steps`)
}

export async function getPolicyGrainDefaultsMetadata(productId: string | number): Promise<PolicyGrainDefaultsMetadata> {
    return apiClient.get<PolicyGrainDefaultsMetadata>(`/api/settings/products/${productId}/policy-grain-defaults-metadata`)
}

export interface GrainDefaultRow {
    id?: number
    applicableField: string
    rule: string
    value: string | null
}

export async function getGrainDefaults(productId: string | number, grain: string, rowId: string): Promise<GrainDefaultRow[]> {
    return apiClient.get<GrainDefaultRow[]>(`/api/settings/products/${productId}/grain-defaults/${grain}/${rowId}`)
}

export async function saveGrainDefaults(productId: string | number, grain: string, rowId: string, rows: GrainDefaultRow[]): Promise<GrainDefaultRow[]> {
    return apiClient.put<GrainDefaultRow[]>(`/api/settings/products/${productId}/grain-defaults/${grain}/${rowId}`, { rows })
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

export async function getAdminUsers(): Promise<AdminUser[]> {
    return apiClient.get<AdminUser[]>('/api/settings/users')
}

export async function getUserById(id: number): Promise<AdminUser> {
    return apiClient.get<AdminUser>(`/api/settings/users/${id}`)
}

export async function createUser(body: {
    username: string
    email: string
    fullName?: string
    role: string
    isActive?: boolean
    orgCode?: string
}): Promise<AdminUser & { tempPassword: string }> {
    return apiClient.post<AdminUser & { tempPassword: string }>('/api/settings/users', body)
}

export async function updateUser(
    id: number,
    patch: { role?: string; isActive?: boolean; fullName?: string; email?: string },
): Promise<AdminUser> {
    return apiClient.patch<AdminUser>(`/api/settings/users/${id}`, patch)
}

export async function getUserAudit(id: number): Promise<any[]> {
    return apiClient.get<any[]>(`/api/settings/users/${id}/audit`)
}

export async function postUserAudit(id: number, body: Record<string, unknown>): Promise<void> {
    return apiClient.post<void>(`/api/settings/users/${id}/audit`, body)
}

export async function getGlobalHierarchyLevels(): Promise<GlobalLevel[]> {
    return apiClient.get<GlobalLevel[]>('/api/organisation-hierarchy')
}

// ---------------------------------------------------------------------------
// Dashboard & Reporting — Measures (REQ-SETTINGS-DASH-F-001 through F-007)
// ---------------------------------------------------------------------------

export interface Measure {
    id: number
    key: string
    label: string
    sourceKey: string
    measureType: 'count' | 'sum' | 'ratio'
    scope: 'org' | 'user' | 'both'
    createdByType: 'internal' | 'tenant'
    orgCode: string | null
    isActive: boolean
}

export interface CreateMeasurePayload {
    key: string
    label: string
    sourceKey: string
    measureType: 'count' | 'sum' | 'ratio'
}

export async function getMeasures(): Promise<Measure[]> {
    return apiClient.get<Measure[]>('/api/measures')
}

export async function createMeasure(payload: CreateMeasurePayload): Promise<Measure> {
    return apiClient.post<Measure>('/api/measures', payload)
}

export async function deactivateMeasure(id: number): Promise<void> {
    return apiClient.del(`/api/measures/${id}`)
}

// ---------------------------------------------------------------------------
// Earnings Configuration — REQ-SETTINGS-EARN-R03 through R09
// ---------------------------------------------------------------------------

export type PatternType = 'upfront' | 'straight_line' | 'interpolated'
export type EarnBy = 'day' | 'period'

export interface EarningPattern {
    id: number
    orgCode: string
    name: string
    patternType: PatternType
    earnBy: EarnBy
    description: string | null
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface EarningPatternPoint {
    id: number
    patternId: number
    pctThroughPolicy: string
    pctEarnedIncrement: string
    sortOrder: number
    createdAt: string
}

export interface EarningPatternRule {
    id: number
    orgCode: string
    patternId: number
    priority: number
    productId: number | null
    classOfBusiness: string | null
    contractType: string | null
    includeIncepted: boolean
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface CreatePatternPayload {
    name: string
    patternType: PatternType
    earnBy?: EarnBy
    description?: string
}

export interface CreatePointPayload {
    pctThroughPolicy: number
    pctEarnedIncrement: number
}

export interface CreateRulePayload {
    patternId: number
    priority?: number
    productId?: number | null
    classOfBusiness?: string | null
    contractType?: string | null
    includeIncepted?: boolean
}

export async function getEarningPatterns(): Promise<EarningPattern[]> {
    return apiClient.get<EarningPattern[]>('/api/earnings-config/patterns')
}

export async function createEarningPattern(payload: CreatePatternPayload): Promise<EarningPattern> {
    return apiClient.post<EarningPattern>('/api/earnings-config/patterns', payload)
}

export async function deactivateEarningPattern(id: number): Promise<void> {
    return apiClient.patch(`/api/earnings-config/patterns/${id}/deactivate`, {})
}

export async function getPatternPoints(patternId: number): Promise<EarningPatternPoint[]> {
    return apiClient.get<EarningPatternPoint[]>(`/api/earnings-config/patterns/${patternId}/points`)
}

export async function createPatternPoint(
    patternId: number,
    payload: CreatePointPayload,
): Promise<EarningPatternPoint> {
    return apiClient.post<EarningPatternPoint>(
        `/api/earnings-config/patterns/${patternId}/points`,
        payload,
    )
}

export async function deletePatternPoint(patternId: number, pointId: number): Promise<void> {
    return apiClient.del(`/api/earnings-config/patterns/${patternId}/points/${pointId}`)
}

export async function getEarningRules(): Promise<EarningPatternRule[]> {
    return apiClient.get<EarningPatternRule[]>('/api/earnings-config/rules')
}

export async function createEarningRule(payload: CreateRulePayload): Promise<EarningPatternRule> {
    return apiClient.post<EarningPatternRule>('/api/earnings-config/rules', payload)
}

export async function updateEarningRule(
    id: number,
    payload: Partial<CreateRulePayload>,
): Promise<EarningPatternRule> {
    return apiClient.put<EarningPatternRule>(`/api/earnings-config/rules/${id}`, payload)
}

export async function deactivateEarningRule(id: number): Promise<void> {
    return apiClient.patch(`/api/earnings-config/rules/${id}/deactivate`, {})
}

export async function resolveEarningPattern(payload: {
    classOfBusiness: string
    contractType: string
    includeIncepted: boolean
}): Promise<{ resolvedEarningPatternId: number; patternName: string }> {
    return apiClient.post('/api/earning-engine/sections/resolve', payload)
}
