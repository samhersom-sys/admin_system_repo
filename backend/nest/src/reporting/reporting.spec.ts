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

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReportingService,
                { provide: getRepositoryToken(ReportTemplate), useValue: mockTemplateRepo },
                { provide: getRepositoryToken(ReportExecutionHistory), useValue: mockHistoryRepo },
                { provide: DataSource, useValue: mockDataSource },
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
        it('returns field list for a known domain', () => {
            const fields = service.getFieldMappings('submissions')
            expect(fields.length).toBeGreaterThan(0)
            expect(fields[0]).toHaveProperty('key')
            expect(fields[0]).toHaveProperty('label')
        })

        it('returns empty array for unknown domain', () => {
            expect(service.getFieldMappings('unknown_domain')).toEqual([])
        })

        it('returns field list for policies domain', () => {
            const fields = service.getFieldMappings('policies')
            expect(fields.some((f) => f.key === 'reference')).toBe(true)
        })

        it('returns field list for quotes domain', () => {
            expect(service.getFieldMappings('quotes').length).toBeGreaterThan(0)
        })

        it('returns field list for parties domain', () => {
            const fields = service.getFieldMappings('parties')
            expect(fields.some((f) => f.key === 'name')).toBe(true)
        })
    })
})
