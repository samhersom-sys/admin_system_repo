/**
 * reporting.spec.ts — ReportingService unit tests
 * Domain: RPT-BE
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Route → service coverage:
 *   R01 findAll     — returns core + org-scoped custom templates
 *   R02 findOne     — returns template; throws NotFoundException
 *   R03 create      — validates name; creates custom template
 *   R04 update      — patches fields; throws for not-found
 *   R05 remove      — removes custom template; throws for not-found
 *   R06 run         — executes safe SQL; records history
 *   R07 getHistory  — returns sorted history records
 *   R08 getFieldMappings — returns semantic field list (no DB)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { DataSource } from 'typeorm'
import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ReportingService } from './reporting.service'
import { ReportTemplate } from '../entities/report-template.entity'
import { ReportExecutionHistory } from '../entities/report-execution-history.entity'
import { MeasuresService } from '../measures/measures.service'
import { DATA_SOURCES } from './field-mappings'

// ---------------------------------------------------------------------------
// Measures catalog fixtures — mirrors seed 032 (measures removed from field-mappings)
// ---------------------------------------------------------------------------

const SEED_MEASURES: Record<string, Array<{ key: string; label: string; col: string; type?: string; filterExpr?: string; ratioNumerator?: string; ratioDenominator?: string }>> = {
    submissions: [
        { key: 'countAll', label: 'Count of Submissions', col: '*', type: 'count' },
    ],
    policies: [
        { key: 'countAll', label: 'Count of Policies', col: '*', type: 'count' },
        { key: 'countActive', label: 'Count of Active Policies', col: '*', type: 'count', filterExpr: "status = 'Active'" },
        { key: 'countLapsed', label: 'Count of Lapsed Policies', col: '*', type: 'count', filterExpr: "status = 'Expired'" },
        { key: 'countRenewed', label: 'Count of Renewed Policies', col: '*', type: 'count', filterExpr: "status = 'Renewed'" },
        { key: 'countRenewable', label: 'Count of Renewable Policies', col: '*', type: 'count', filterExpr: "renewable = 'Renewable'" },
        { key: 'retentionRatio', label: 'Retention Ratio', col: '*', type: 'ratio', ratioNumerator: "status = 'Renewed'", ratioDenominator: "renewable = 'Renewable'" },
    ],
    quotes: [
        { key: 'countAll', label: 'Count of Quotes', col: '*', type: 'count' },
        { key: 'countDeclined', label: 'Count of Declined Quotes', col: '*', type: 'count', filterExpr: "status = 'declined'" },
        { key: 'countRenewable', label: 'Count of Renewable Quotes', col: '*', type: 'count', filterExpr: "renewable_indicator = 'Yes'" },
        { key: 'countRenewed', label: 'Count of Renewed Quotes', col: '*', type: 'count', filterExpr: "renewal_status = 'renewed'" },
        { key: 'countNewBusiness', label: 'Count of New Business Quotes', col: '*', type: 'count', filterExpr: "new_or_renewal = 'New'" },
        { key: 'countRenewalBusiness', label: 'Count of Renewal Business Quotes', col: '*', type: 'count', filterExpr: "new_or_renewal = 'Renewal'" },
    ],
    bindingAuthorities: [
        { key: 'countAll', label: 'Count of Binding Authorities', col: '*', type: 'count' },
    ],
}

function augmentedSources(sourceKeys: string[]) {
    const result: Record<string, any> = {}
    for (const key of sourceKeys) {
        if (DATA_SOURCES[key]) {
            result[key] = {
                ...DATA_SOURCES[key],
                fields: [...(SEED_MEASURES[key] ?? []), ...DATA_SOURCES[key].fields],
            }
        }
    }
    return result
}

function augmentedSource(sourceKey: string) {
    const base = DATA_SOURCES[sourceKey]
    if (!base) return null
    return {
        ...base,
        fields: [...(SEED_MEASURES[sourceKey] ?? []), ...base.fields],
    }
}

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeTemplate(overrides: Partial<ReportTemplate> = {}): ReportTemplate {
    const t = new ReportTemplate()
    t.id = 1
    t.orgCode = 'TST'
    t.name = 'Test Report'
    t.description = null
    t.type = 'custom'
    t.dataSource = null
    t.dateBasis = null
    t.dateFrom = null
    t.dateTo = null
    t.sortBy = null
    t.sortOrder = null
    t.fields = []
    t.filters = []
    t.createdBy = 'alice'
    t.createdAt = new Date('2026-01-01T00:00:00Z')
    t.updatedAt = new Date('2026-01-01T00:00:00Z')
    return Object.assign(t, overrides)
}

function makeCoreTemplate(overrides: Partial<ReportTemplate> = {}): ReportTemplate {
    return makeTemplate({ id: 99, orgCode: null, type: 'core', name: 'Submissions Report', ...overrides })
}

function makeHistory(overrides: Partial<ReportExecutionHistory> = {}): ReportExecutionHistory {
    const h = new ReportExecutionHistory()
    h.id = 1
    h.templateId = 1
    h.runAt = new Date('2026-01-10T12:00:00Z')
    h.runBy = 'alice'
    h.rowCount = 5
    h.status = 'success'
    return Object.assign(h, overrides)
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('ReportingService', () => {
    let service: ReportingService
    let mockTemplateRepo: Record<string, jest.Mock>
    let mockHistoryRepo: Record<string, jest.Mock>
    let mockDataSource: Record<string, jest.Mock>
    let mockMeasuresService: Partial<Record<string, jest.Mock>>

    beforeEach(async () => {
        mockTemplateRepo = {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn(),
        }

        const mockQb = {
            where: jest.fn().mockReturnThis(),
            orWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            getMany: jest.fn(),
        }
        mockTemplateRepo.createQueryBuilder.mockReturnValue(mockQb)

        mockHistoryRepo = {
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
        }

        mockDataSource = {
            query: jest.fn(),
        }

        mockMeasuresService = {
            getAugmentedDataSources: jest.fn().mockImplementation((sourceKeys: string[]) =>
                Promise.resolve(augmentedSources(sourceKeys))
            ),
            getAugmentedSourceConfig: jest.fn().mockImplementation((sourceKey: string) =>
                Promise.resolve(augmentedSource(sourceKey))
            ),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportingService,
                { provide: getRepositoryToken(ReportTemplate), useValue: mockTemplateRepo },
                { provide: getRepositoryToken(ReportExecutionHistory), useValue: mockHistoryRepo },
                { provide: DataSource, useValue: mockDataSource },
                { provide: MeasuresService, useValue: mockMeasuresService },
            ],
        }).compile()

        service = module.get<ReportingService>(ReportingService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // R01 — findAll
    // -------------------------------------------------------------------------
    describe('findAll', () => {
        it('returns core and custom templates ordered by name', async () => {
            const custom = makeTemplate()
            const core = makeCoreTemplate()
            const qb = mockTemplateRepo.createQueryBuilder()
            qb.getMany.mockResolvedValue([core, custom])

            const result = await service.findAll('TST')
            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ id: 99, type: 'core' })
            expect(result[1]).toMatchObject({ id: 1, type: 'custom' })
        })

        it('maps entity fields to snake_case DTO keys', async () => {
            const t = makeTemplate({ dataSource: 'submissions', fields: ['reference'] })
            const qb = mockTemplateRepo.createQueryBuilder()
            qb.getMany.mockResolvedValue([t])

            const result = await service.findAll('TST')
            expect(result[0]).toMatchObject({
                data_source: 'submissions',
                fields: ['reference'],
                created_by: 'alice',
            })
        })
    })

    // -------------------------------------------------------------------------
    // R02 — findOne
    // -------------------------------------------------------------------------
    describe('findOne', () => {
        it('returns the template when found', async () => {
            const t = makeTemplate()
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const result = await service.findOne('TST', 1)
            expect(result).toMatchObject({ id: 1, name: 'Test Report' })
        })

        it('throws NotFoundException when not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null)
            await expect(service.findOne('TST', 99)).rejects.toThrow(NotFoundException)
        })

        it('throws NotFoundException when custom template belongs to different org', async () => {
            const t = makeTemplate({ orgCode: 'OTHER' })
            mockTemplateRepo.findOne.mockResolvedValue(t)
            await expect(service.findOne('TST', 1)).rejects.toThrow(NotFoundException)
        })

        it('returns core template regardless of orgCode', async () => {
            const t = makeCoreTemplate()
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const result = await service.findOne('ANY', 99)
            expect(result).toMatchObject({ type: 'core' })
        })
    })

    // -------------------------------------------------------------------------
    // R03 — create
    // -------------------------------------------------------------------------
    describe('create', () => {
        it('creates a custom template with the requesting org', async () => {
            const saved = makeTemplate({ id: 5, name: 'New Report' })
            mockTemplateRepo.create.mockReturnValue(saved)
            mockTemplateRepo.save.mockResolvedValue(saved)

            const result = await service.create('TST', { name: 'New Report', data_source: 'policies' }, 'alice')
            expect(result).toMatchObject({ id: 5, name: 'New Report', type: 'custom' })
            expect(mockTemplateRepo.create).toHaveBeenCalledWith(expect.objectContaining({ orgCode: 'TST', type: 'custom' }))
        })

        it('throws BadRequestException when name is missing', async () => {
            await expect(service.create('TST', {}, 'alice')).rejects.toThrow(BadRequestException)
        })

        it('throws BadRequestException when name is empty string', async () => {
            await expect(service.create('TST', { name: '   ' }, 'alice')).rejects.toThrow(BadRequestException)
        })
    })

    // -------------------------------------------------------------------------
    // R04 — update
    // -------------------------------------------------------------------------
    describe('update', () => {
        it('updates allowed fields on the template', async () => {
            const t = makeTemplate()
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const updatedT = { ...t, name: 'Renamed' }
            mockTemplateRepo.save.mockResolvedValue(updatedT)

            const result = await service.update('TST', 1, { name: 'Renamed' })
            expect(result).toMatchObject({ name: 'Renamed' })
        })

        it('throws NotFoundException when template not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null)
            await expect(service.update('TST', 99, { name: 'X' })).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // R05 — remove
    // -------------------------------------------------------------------------
    describe('remove', () => {
        it('removes the custom template', async () => {
            const t = makeTemplate()
            mockTemplateRepo.findOne.mockResolvedValue(t)
            mockTemplateRepo.remove.mockResolvedValue(t)

            await expect(service.remove('TST', 1)).resolves.toBeUndefined()
            expect(mockTemplateRepo.remove).toHaveBeenCalledWith(t)
        })

        it('throws NotFoundException when template not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null)
            await expect(service.remove('TST', 99)).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // R06 — run
    // -------------------------------------------------------------------------
    describe('run', () => {
        it('returns empty data when no data_source configured', async () => {
            const t = makeTemplate({ dataSource: null })
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const historyEntity = makeHistory()
            mockHistoryRepo.create.mockReturnValue(historyEntity)
            mockHistoryRepo.save.mockResolvedValue(historyEntity)

            const result = await service.run('TST', 1, 'alice')
            expect(result).toEqual({ data: [] })
            expect(mockHistoryRepo.save).toHaveBeenCalled()
        })

        it('executes safe SQL for a known data_source', async () => {
            const t = makeTemplate({ dataSource: 'submissions', fields: ['reference', 'insured'] })
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const historyEntity = makeHistory({ rowCount: 2 })
            mockHistoryRepo.create.mockReturnValue(historyEntity)
            mockHistoryRepo.save.mockResolvedValue(historyEntity)
            mockDataSource.query.mockResolvedValue([
                { reference: 'SUB-001', insured: 'Acme' },
                { reference: 'SUB-002', insured: 'Beta' },
            ])

            const result = await service.run('TST', 1, 'alice')
            expect(result.data).toHaveLength(2)
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM submission'),
                expect.arrayContaining(['TST']),
            )
        })

        it('does not include field keys absent from the allow-list', async () => {
            const t = makeTemplate({
                dataSource: 'submissions',
                fields: ['reference', 'INJECTED_FIELD'],
            })
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const h = makeHistory()
            mockHistoryRepo.create.mockReturnValue(h)
            mockHistoryRepo.save.mockResolvedValue(h)
            mockDataSource.query.mockResolvedValue([])

            await service.run('TST', 1)
            const sql: string = mockDataSource.query.mock.calls[0][0]
            expect(sql).not.toContain('INJECTED_FIELD')
        })

        it('records history as error and rethrows when DB query fails', async () => {
            const t = makeTemplate({ dataSource: 'submissions' })
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const h = makeHistory({ status: 'error' })
            mockHistoryRepo.create.mockReturnValue(h)
            mockHistoryRepo.save.mockResolvedValue(h)
            mockDataSource.query.mockRejectedValue(new Error('DB error'))

            await expect(service.run('TST', 1)).rejects.toThrow(BadRequestException)
            expect(mockHistoryRepo.save).toHaveBeenCalled()
        })

        it('throws NotFoundException when template not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null)
            await expect(service.run('TST', 99)).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // R07 — getHistory
    // -------------------------------------------------------------------------
    describe('getHistory', () => {
        it('returns history records in reverse chronological order', async () => {
            const t = makeTemplate()
            mockTemplateRepo.findOne.mockResolvedValue(t)
            const h1 = makeHistory({ id: 1, runAt: new Date('2026-01-01T00:00:00Z') })
            const h2 = makeHistory({ id: 2, runAt: new Date('2026-01-10T00:00:00Z') })
            mockHistoryRepo.find.mockResolvedValue([h2, h1])

            const result = await service.getHistory('TST', 1)
            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ id: 2, status: 'success' })
        })

        it('throws NotFoundException when template not found', async () => {
            mockTemplateRepo.findOne.mockResolvedValue(null)
            await expect(service.getHistory('TST', 99)).rejects.toThrow(NotFoundException)
        })
    })

    // -------------------------------------------------------------------------
    // R08 — getFieldMappings (semantic layer)
    // -------------------------------------------------------------------------
    describe('getFieldMappings', () => {
        it('returns field list for a known domain', async () => {
            const fields = await service.getFieldMappings('submissions', 'TST')
            expect(fields.length).toBeGreaterThan(0)
            expect(fields[0]).toHaveProperty('key')
            expect(fields[0]).toHaveProperty('label')
        })

        it('returns empty array for unknown domain', async () => {
            expect(await service.getFieldMappings('unknown_domain', 'TST')).toEqual([])
        })

        it('returns field list for policies domain', async () => {
            const fields = await service.getFieldMappings('policies', 'TST')
            expect(fields.some((f) => f.key === 'reference')).toBe(true)
        })

        it('returns field list for quotes domain', async () => {
            expect((await service.getFieldMappings('quotes', 'TST')).length).toBeGreaterThan(0)
        })

        it('returns field list for parties domain', async () => {
            const fields = await service.getFieldMappings('parties', 'TST')
            expect(fields.some((f) => f.key === 'name')).toBe(true)
        })

        it('returns field list for quoteSections domain including numeric premium measures', async () => {
            const fields = await service.getFieldMappings('quoteSections', 'TST')
            expect(fields.length).toBeGreaterThan(0)
            const numericKeys = ['grossPremium', 'netPremium', 'annualGrossPremium', 'annualNetPremium', 'writtenLineTotal', 'signedLineTotal']
            numericKeys.forEach((key) => {
                const field = fields.find((f) => f.key === key)
                expect(field).toBeDefined()
                expect(field?.type).toBe('number')
            })
        })

        it('returns field list for policyTransactions domain with transactionType and effectiveDate', async () => {
            const fields = await service.getFieldMappings('policyTransactions', 'TST')
            expect(fields.length).toBeGreaterThan(0)
            expect(fields.some((f) => f.key === 'transactionType')).toBe(true)
            expect(fields.some((f) => f.key === 'effectiveDate' && f.type === 'date')).toBe(true)
        })

        it('submissions domain includes workflowStatus and clearanceStatus fields', async () => {
            const fields = await service.getFieldMappings('submissions', 'TST')
            expect(fields.some((f) => f.key === 'workflowStatus')).toBe(true)
            expect(fields.some((f) => f.key === 'clearanceStatus')).toBe(true)
        })

        it('policies domain includes businessType and contractType fields', async () => {
            const fields = await service.getFieldMappings('policies', 'TST')
            expect(fields.some((f) => f.key === 'businessType')).toBe(true)
            expect(fields.some((f) => f.key === 'contractType')).toBe(true)
        })

        // REQ-RPT-BE-F-049 — curated Measures catalog (now served from measure_definitions DB)
        it('T-RPT-BE-R049a — submissions domain exposes a countAll measure with type count and label "Count of Submissions"', async () => {
            const fields = await service.getFieldMappings('submissions', 'TST')
            const measure = fields.find((f) => f.key === 'countAll')
            expect(measure).toBeDefined()
            expect(measure?.label).toBe('Count of Submissions')
            expect(measure?.type).toBe('count')
        })

        it('T-RPT-BE-R049b — quotes domain exposes countAll, countDeclined, countRenewable, countRenewed, countNewBusiness, countRenewalBusiness measures', async () => {
            const fields = await service.getFieldMappings('quotes', 'TST')
            const keys = fields.map((f) => f.key)
            expect(keys).toContain('countAll')
            expect(keys).toContain('countDeclined')
            expect(keys).toContain('countRenewable')
            expect(keys).toContain('countRenewed')
            expect(keys).toContain('countNewBusiness')
            expect(keys).toContain('countRenewalBusiness')
            expect(fields.find((f) => f.key === 'countAll')?.label).toBe('Count of Quotes')
            expect(fields.find((f) => f.key === 'countDeclined')?.label).toBe('Count of Declined Quotes')
            expect(fields.find((f) => f.key === 'countNewBusiness')?.label).toBe('Count of New Business Quotes')
            expect(fields.find((f) => f.key === 'countRenewalBusiness')?.label).toBe('Count of Renewal Business Quotes')
        })

        it('T-RPT-BE-R049c — policies domain exposes countAll, countActive, countLapsed, countRenewed, countRenewable and retentionRatio measures', async () => {
            const fields = await service.getFieldMappings('policies', 'TST')
            const keys = fields.map((f) => f.key)
            expect(fields.find((f) => f.key === 'countAll')?.label).toBe('Count of Policies')
            expect(fields.find((f) => f.key === 'countActive')?.label).toBe('Count of Active Policies')
            expect(fields.find((f) => f.key === 'grossWrittenPremium')?.label).toBe('Gross Net Written Premium')
            expect(keys).toContain('countLapsed')
            expect(keys).toContain('countRenewed')
            expect(keys).toContain('countRenewable')
            expect(keys).toContain('retentionRatio')
            expect(fields.find((f) => f.key === 'countLapsed')?.label).toBe('Count of Lapsed Policies')
            expect(fields.find((f) => f.key === 'countRenewed')?.label).toBe('Count of Renewed Policies')
            expect(fields.find((f) => f.key === 'countRenewable')?.label).toBe('Count of Renewable Policies')
            expect(fields.find((f) => f.key === 'retentionRatio')?.label).toBe('Retention Ratio')
            expect(fields.find((f) => f.key === 'retentionRatio')?.type).toBe('ratio')
        })

        it('T-RPT-BE-R049d — bindingAuthorities domain exposes countAll measure labelled "Count of Binding Authorities"', async () => {
            const fields = await service.getFieldMappings('bindingAuthorities', 'TST')
            expect(fields.length).toBeGreaterThan(0)
            expect(fields.find((f) => f.key === 'countAll')?.label).toBe('Count of Binding Authorities')
        })
    })

    describe('getLoginActivity', () => {
        it('client_admin receives org-scoped rows from login_history', async () => {
            mockDataSource.query.mockResolvedValue([
                { user: 'Alice', orgCode: 'TST', loggedInAt: '2026-05-07T10:00:00.000Z' },
            ])

            const result = await service.getLoginActivity('TST', 'client_admin')

            expect(result).toEqual([
                { user: 'Alice', orgCode: 'TST', loggedInAt: '2026-05-07T10:00:00.000Z' },
            ])
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM login_history'),
                ['TST'],
            )
        })

        it('client_admin SQL includes WHERE org_code = $1', async () => {
            mockDataSource.query.mockResolvedValue([])
            await service.getLoginActivity('TST', 'client_admin')
            const sql: string = mockDataSource.query.mock.calls[0][0]
            expect(sql).toContain('WHERE org_code = $1')
        })

        it('internal_admin receives cross-org rows with no org filter', async () => {
            mockDataSource.query.mockResolvedValue([
                { user: 'Alice', orgCode: 'TST', loggedInAt: '2026-05-07T10:00:00.000Z' },
                { user: 'Bob', orgCode: 'ORG2', loggedInAt: '2026-05-06T09:00:00.000Z' },
            ])

            const result = await service.getLoginActivity(null, 'internal_admin')

            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ orgCode: 'TST' })
            expect(result[1]).toMatchObject({ orgCode: 'ORG2' })
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM login_history'),
                [],
            )
        })

        it('internal_admin SQL does not include a WHERE clause for org_code', async () => {
            mockDataSource.query.mockResolvedValue([])
            await service.getLoginActivity(null, 'internal_admin')
            const sql: string = mockDataSource.query.mock.calls[0][0]
            expect(sql).not.toContain('WHERE org_code')
        })

        it('returns empty list when no login history rows exist', async () => {
            mockDataSource.query.mockResolvedValue([])
            await expect(service.getLoginActivity('TST', 'client_admin')).resolves.toEqual([])
        })

        it('maps a Date object loggedInAt to ISO string', async () => {
            mockDataSource.query.mockResolvedValue([
                { user: 'Carol', orgCode: 'TST', loggedInAt: new Date('2026-05-07T10:00:00.000Z') },
            ])

            const result = await service.getLoginActivity('TST', 'client_admin')
            expect(result[0]).toMatchObject({ loggedInAt: '2026-05-07T10:00:00.000Z' })
        })
    })

    describe('getDashboardWidgetData', () => {
        it('returns a noop response for text widgets', async () => {
            const result = await service.getDashboardWidgetData('TST', {
                type: 'text',
                note: 'Commentary',
            }, undefined)

            expect(result).toEqual({ type: 'text' })
            expect(mockDataSource.query).not.toHaveBeenCalled()
        })

        it('supports mixed-source chart widgets by querying each source and merging rows by label', async () => {
            mockDataSource.query
                .mockResolvedValueOnce([{ label: 'Active', value_sum_grossWrittenPremium: '1000.00' }])

            const result = await service.getDashboardWidgetData('TST', {
                type: 'chart',
                attribute: 'submissions::status',
                measures: ['policies::grossWrittenPremium'],
                aggregation: 'sum',
            }, undefined)

            expect(result).toEqual({
                type: 'chart',
                rows: [{ label: 'Active', values: { grossWrittenPremium: 1000 } }],
            })
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM policies'),
                expect.arrayContaining(['TST']),
            )
        })

        it('executes a metric query for a single-source widget', async () => {
            mockDataSource.query.mockResolvedValue([{ value: '245000.50' }])

            const result = await service.getDashboardWidgetData('TST', {
                type: 'metric',
                metric: 'policies::grossWrittenPremium',
                aggregation: 'sum',
            }, undefined)

            expect(result).toEqual({ type: 'metric', value: 245000.5, label: 'Gross Net Written Premium' })
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('FROM policies'),
                expect.arrayContaining(['TST']),
            )
        })

        it('T-RPT-BE-R057 — executes a ratio metric widget using NULLIF division SQL expression', async () => {
            mockDataSource.query.mockResolvedValue([{ value: '0.857143' }])

            const result = await service.getDashboardWidgetData('TST', {
                type: 'metric',
                metric: 'policies::retentionRatio',
            }, undefined)

            expect(result).toMatchObject({ type: 'metric', label: 'Retention Ratio' })
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('NULLIF(SUM(CASE WHEN'),
                expect.arrayContaining(['TST']),
            )
        })

        it('applies date filters to chart widget queries', async () => {
            mockDataSource.query.mockResolvedValue([{ label: 'Active', value_sum_gross_written_premium: '1000.00' }])

            await service.getDashboardWidgetData('TST', {
                type: 'chart',
                attribute: 'policies::status',
                measures: ['policies::grossWrittenPremium'],
                aggregation: 'sum',
            }, {
                analysisBasis: 'mtd',
                dateBasis: 'policies::inceptionDate',
                reportingDate: '2026-04-10',
                customAttributes: [],
            })

            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.stringContaining('inception_date'),
                expect.arrayContaining(['TST']),
            )
        })

        it('supports mixed-source table widgets by returning rows for each source with an explicit source column', async () => {
            mockDataSource.query
                .mockResolvedValueOnce([{ reference: 'SUB-1' }])
                .mockResolvedValueOnce([{ name: 'Demo Brokers Ltd' }])

            const result = await service.getDashboardWidgetData('TST', {
                type: 'table',
                attributes: ['submissions::reference', 'parties::name'],
            }, undefined)

            expect(result).toEqual({
                type: 'table',
                rows: [
                    { source: 'Submissions', reference: 'SUB-1', name: '' },
                    { source: 'Parties', reference: '', name: 'Demo Brokers Ltd' },
                ],
            })
        })
    })
})
