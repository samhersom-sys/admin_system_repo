/**
 * settings.spec.ts — SettingsService unit tests
 * Domain: SETTINGS-BE
 * Requirements: docs/Project Documentation/reconstruction-gap-analysis.md §4.7
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests cover REQ-SET-BE-F-001 through F-004:
 *   - Products CRUD (getProducts, getProductById, createProduct, updateProduct, getWorkflowSteps)
 *   - Data Quality Settings (getDataQualitySettings, saveDataQualitySettings)
 */

import { Test, TestingModule } from '@nestjs/testing'
import { getDataSourceToken } from '@nestjs/typeorm'
import { NotFoundException } from '@nestjs/common'
import { SettingsService } from './settings.service'

// ---------------------------------------------------------------------------
// Mock factory helpers
// ---------------------------------------------------------------------------

function makeProduct(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        name: 'Property All Risks',
        code: 'PROP-AR',
        product_type: 'Property',
        line_of_business: 'Commercial',
        underwriting_year: 2026,
        description: 'Comprehensive property cover',
        is_active: true,
        org_code: 'TST',
        ...overrides,
    }
}

function makeWorkflowStep(overrides: Record<string, any> = {}) {
    return {
        id: 1,
        step_name: 'Initial Review',
        step_code: 'INITIAL_REVIEW',
        description: 'First review stage',
        is_active: true,
        is_default: true,
        sort_order: 1,
        ...overrides,
    }
}

function makeDQSettings(overrides: Record<string, any> = {}) {
    return {
        enableBASectionDateValidation: true,
        enableQuoteMandatoryFields: true,
        enablePolicyMandatoryFields: true,
        excludeDraftStatus: true,
        severityThreshold: 'medium',
        autoCheckOnSave: true,
        emailNotifications: false,
        notificationEmail: '',
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('SettingsService', () => {
    let service: SettingsService
    let mockDataSource: Record<string, jest.Mock>

    beforeEach(async () => {
        mockDataSource = {
            query: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SettingsService,
                { provide: getDataSourceToken(), useValue: mockDataSource },
            ],
        }).compile()

        service = module.get<SettingsService>(SettingsService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // REQ-SET-BE-F-003 — Products
    // -------------------------------------------------------------------------

    describe('getProducts', () => {
        it('T-SET-BE-R01: returns products for the given orgCode', async () => {
            const product = makeProduct()
            mockDataSource.query = jest.fn().mockResolvedValue([product])

            const result = await service.getProducts('TST')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ id: 1, name: 'Property All Risks', org_code: 'TST' })
            const [sql, params] = mockDataSource.query.mock.calls[0]
            expect(params).toContain('TST')
            expect(sql).toMatch(/FROM products/i)
        })

        it('T-SET-BE-R01-empty: returns empty array when no products exist', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])

            const result = await service.getProducts('EMPTY')
            expect(result).toEqual([])
        })
    })

    describe('getProductById', () => {
        it('T-SET-BE-R02a: returns the product when found for orgCode', async () => {
            const product = makeProduct()
            mockDataSource.query = jest.fn().mockResolvedValue([product])

            const result = await service.getProductById(1, 'TST')
            expect(result).toMatchObject({ id: 1, name: 'Property All Risks' })
        })

        it('T-SET-BE-R02b: throws NotFoundException when product does not exist or wrong orgCode', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])

            await expect(service.getProductById(999, 'TST')).rejects.toThrow(NotFoundException)
        })
    })

    describe('createProduct', () => {
        it('T-SET-BE-R03: inserts a new product and returns the created row', async () => {
            const created = makeProduct()
            mockDataSource.query = jest.fn().mockResolvedValue([created])

            const result = await service.createProduct('TST', {
                name: 'Property All Risks',
                code: 'PROP-AR',
                product_type: 'Property',
                line_of_business: 'Commercial',
                description: 'Comprehensive property cover',
            })
            expect(result).toMatchObject({ id: 1, name: 'Property All Risks' })
            const [sql] = mockDataSource.query.mock.calls[0]
            expect(sql).toMatch(/INSERT INTO products/i)
        })
    })

    describe('updateProduct', () => {
        it('T-SET-BE-R04a: updates product fields and returns the updated row', async () => {
            const updated = makeProduct({ name: 'Renamed Product' })
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([]) // UPDATE
                .mockResolvedValueOnce([updated]) // getProductById SELECT

            const result = await service.updateProduct(1, 'TST', { name: 'Renamed Product' })
            expect(result).toMatchObject({ name: 'Renamed Product' })
        })

        it('T-SET-BE-R04b: throws NotFoundException when product not found after update', async () => {
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([]) // UPDATE
                .mockResolvedValueOnce([]) // getProductById returns empty

            await expect(service.updateProduct(999, 'TST', { name: 'X' })).rejects.toThrow(NotFoundException)
        })
    })

    describe('getWorkflowSteps', () => {
        it('T-SET-BE-R05: returns workflow steps for a product scoped to orgCode', async () => {
            const step = makeWorkflowStep()
            mockDataSource.query = jest.fn().mockResolvedValue([step])

            const result = await service.getWorkflowSteps(1, 'TST')
            expect(result).toHaveLength(1)
            expect(result[0]).toMatchObject({ step_name: 'Initial Review', sort_order: 1 })
            const [, params] = mockDataSource.query.mock.calls[0]
            expect(params).toContain('TST')
        })

        it('T-SET-BE-R05-empty: returns empty array when no workflow steps found', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])

            const result = await service.getWorkflowSteps(1, 'TST')
            expect(result).toEqual([])
        })
    })

    // -------------------------------------------------------------------------
    // REQ-SET-BE-F-002 — Data Quality Settings
    // -------------------------------------------------------------------------

    describe('getDataQualitySettings', () => {
        it('T-SET-BE-R06a: returns persisted DQ settings for the orgCode', async () => {
            const dq = makeDQSettings()
            mockDataSource.query = jest.fn().mockResolvedValue([dq])

            const result = await service.getDataQualitySettings('TST')
            expect(result).toMatchObject({ severityThreshold: 'medium', autoCheckOnSave: true })
        })

        it('T-SET-BE-R06b: returns default DQ settings when no row exists for orgCode', async () => {
            mockDataSource.query = jest.fn().mockResolvedValue([])

            const result = await service.getDataQualitySettings('NEW')
            expect(result).toMatchObject({
                enableBASectionDateValidation: true,
                enableQuoteMandatoryFields: true,
                severityThreshold: 'medium',
            })
        })
    })

    describe('saveDataQualitySettings', () => {
        it('T-SET-BE-R07a: performs UPDATE when an existing row is found', async () => {
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([{ '?column?': 1 }])  // existence check
                .mockResolvedValueOnce([])                     // UPDATE

            await service.saveDataQualitySettings('TST', makeDQSettings())

            const [updateSql] = mockDataSource.query.mock.calls[1]
            expect(updateSql).toMatch(/UPDATE data_quality_settings/i)
        })

        it('T-SET-BE-R07b: performs INSERT when no row exists for orgCode', async () => {
            mockDataSource.query = jest.fn()
                .mockResolvedValueOnce([])  // existence check — empty
                .mockResolvedValueOnce([])  // INSERT

            await service.saveDataQualitySettings('NEW', makeDQSettings())

            const [insertSql] = mockDataSource.query.mock.calls[1]
            expect(insertSql).toMatch(/INSERT INTO data_quality_settings/i)
        })
    })
})
