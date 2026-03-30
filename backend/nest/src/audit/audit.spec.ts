/**
 * audit.spec.ts — AuditService unit tests
 * Domain: AUDIT-BE
 * Requirements: backend/routes/audit.requirements.md (REQ-AUDIT-BE-F-001 to F-014)
 * Standard: AI Guidelines §06-Testing-Standards.md §6.2
 *
 * Tests are written per §03 Three-Artifact Rule:
 *   requirements.md → this file → implementation changes.
 *
 * Tests for `detectConcurrentUsers` (REQ-AUDIT-BE-F-013) and the
 * `otherUsersOpen` field in `writeEvent` (REQ-AUDIT-BE-F-014) are written
 * ahead of implementation and will FAIL until AuditService adds the
 * `detectConcurrentUsers` method and `writeEvent` calls it for "Opened" actions.
 */

import { Test, TestingModule } from '@nestjs/testing'
import { DataSource } from 'typeorm'
import { BadRequestException } from '@nestjs/common'
import { AuditService } from './audit.service'

// ---------------------------------------------------------------------------
// Shared mock fixtures
// ---------------------------------------------------------------------------

const mockUser = { id: 1, username: 'alice', email: 'alice@example.com' }

function makeAuditRow(overrides: Record<string, any> = {}) {
    return {
        action: 'Quote Opened',
        user_name: 'alice',
        user_id: 1,
        created_at: new Date('2026-01-01T10:00:00Z'),
        details: {},
        ...overrides,
    }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('AuditService', () => {
    let service: AuditService
    let mockDataSource: Record<string, jest.Mock>

    beforeEach(async () => {
        mockDataSource = {
            query: jest.fn(),
        }

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                { provide: DataSource, useValue: mockDataSource },
            ],
        }).compile()

        service = module.get<AuditService>(AuditService)
    })

    afterEach(() => jest.clearAllMocks())

    // -------------------------------------------------------------------------
    // REQ-AUDIT-BE-F-001 to F-007 — writeEvent
    // -------------------------------------------------------------------------
    describe('writeEvent', () => {
        it('T-AUDIT-BE-R01a: throws BadRequestException when action is missing', async () => {
            await expect(service.writeEvent({ entityType: 'Quote', entityId: 1 }, mockUser))
                .rejects.toThrow(BadRequestException)
        })

        it('T-AUDIT-BE-R02a: throws BadRequestException when entityType is missing', async () => {
            await expect(service.writeEvent({ entityId: 1, action: 'Quote Opened' }, mockUser))
                .rejects.toThrow(BadRequestException)
        })

        it('T-AUDIT-BE-R02b: throws BadRequestException when entityId is not an integer', async () => {
            await expect(service.writeEvent({ entityType: 'Quote', entityId: 'abc', action: 'Quote Opened' }, mockUser))
                .rejects.toThrow(BadRequestException)
        })

        it('T-AUDIT-BE-R02c: throws BadRequestException when entityType is not in the canonical set', async () => {
            await expect(service.writeEvent({ entityType: 'Invoice', entityId: 1, action: 'Invoice Created' }, mockUser))
                .rejects.toThrow(BadRequestException)
        })

        it('T-AUDIT-BE-R03: stores empty object {} as details when details is absent', async () => {
            mockDataSource.query
                .mockResolvedValueOnce([])  // dupe check — no dupe
                .mockResolvedValueOnce([{ id: 1, action: 'Quote Updated', entityType: 'Quote', entityId: 1 }])  // INSERT

            await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Updated' }, mockUser)

            const insertCall = mockDataSource.query.mock.calls[1]
            // Parameter index 3 is the details argument in the INSERT
            expect(insertCall[1][3]).toBe(JSON.stringify({}))
        })

        it('T-AUDIT-BE-R04: takes user_id and user_name from JWT payload, not from request body', async () => {
            mockDataSource.query
                .mockResolvedValueOnce([])  // no dupe
                .mockResolvedValueOnce([{ id: 1, action: 'Quote Updated' }])  // INSERT

            await service.writeEvent(
                { entityType: 'Quote', entityId: 1, action: 'Quote Updated', userId: 999, userName: 'imposter' },
                mockUser,  // actual JWT user: id=1, username='alice'
            )

            const insertCall = mockDataSource.query.mock.calls[1]
            // Param index 4 = created_by / user_name (from JWT, not body)
            expect(insertCall[1][4]).toBe('alice')
            // Param index 5 = user_id (from JWT, not body)
            expect(insertCall[1][5]).toBe(1)
        })

        it('T-AUDIT-BE-R05: returns { skipped: true } without INSERT when a duplicate event exists within 10 seconds', async () => {
            mockDataSource.query.mockResolvedValueOnce([{ id: 99 }])  // dupe found

            const result = await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Opened' }, mockUser)

            expect(result).toEqual({ skipped: true })
            // INSERT must NOT have been called — only the dupe-check query
            expect(mockDataSource.query).toHaveBeenCalledTimes(1)
        })

        it('T-AUDIT-BE-R06: inserts the event and returns the new row on success', async () => {
            const inserted = { id: 1, action: 'Quote Updated', entityType: 'Quote', entityId: 1, createdAt: '2026-01-01' }
            mockDataSource.query
                .mockResolvedValueOnce([])       // no dupe
                .mockResolvedValueOnce([inserted])  // INSERT RETURNING

            const result = await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Updated' }, mockUser)
            expect(result).toEqual(inserted)
        })

        // -----------------------------------------------------------------------
        // REQ-AUDIT-BE-F-014 — otherUsersOpen in writeEvent response
        // Tests will FAIL until detectConcurrentUsers() is added to AuditService
        // and writeEvent() calls it when action contains "Opened".
        // -----------------------------------------------------------------------
        it('T-AUDIT-BE-R14a: includes otherUsersOpen in response when action contains "Opened"', async () => {
            const inserted = { id: 2, action: 'Quote Opened', entityType: 'Quote', entityId: 1 }
            mockDataSource.query
                .mockResolvedValueOnce([])              // no dupe
                .mockResolvedValueOnce([inserted])      // INSERT
                // detectConcurrentUsers query: alice opened, bob opened + closed
                .mockResolvedValueOnce([
                    { user_name: 'alice', action: 'Quote Opened' },
                    { user_name: 'bob', action: 'Quote Opened' },
                    { user_name: 'bob', action: 'Quote Closed' },
                ])

            const result = await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Opened' }, mockUser)

            // otherUsersOpen must be present and be an array
            expect(result.otherUsersOpen).toBeDefined()
            expect(Array.isArray(result.otherUsersOpen)).toBe(true)
            // alice is the current user (mockUser.username = 'alice') — must be excluded
            // bob has net 0 — must be excluded
            expect(result.otherUsersOpen).toHaveLength(0)
        })

        it('T-AUDIT-BE-R14b: otherUsersOpen contains other currently-open users, excludes current user', async () => {
            const inserted = { id: 3, action: 'Quote Opened', entityType: 'Quote', entityId: 1 }
            mockDataSource.query
                .mockResolvedValueOnce([])              // no dupe
                .mockResolvedValueOnce([inserted])      // INSERT
                // charlie is open, alice (current user) is also open
                .mockResolvedValueOnce([
                    { user_name: 'alice', action: 'Quote Opened' },
                    { user_name: 'charlie', action: 'Quote Opened' },
                ])

            const result = await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Opened' }, mockUser)

            expect(Array.isArray(result.otherUsersOpen)).toBe(true)
            expect(result.otherUsersOpen).not.toContain('alice')   // current user excluded
            expect(result.otherUsersOpen).toContain('charlie')     // other open user included
        })

        it('T-AUDIT-BE-R14c: does not include otherUsersOpen for non-Opened actions', async () => {
            const inserted = { id: 4, action: 'Quote Updated', entityType: 'Quote', entityId: 1 }
            mockDataSource.query
                .mockResolvedValueOnce([])              // no dupe
                .mockResolvedValueOnce([inserted])      // INSERT

            const result = await service.writeEvent({ entityType: 'Quote', entityId: 1, action: 'Quote Updated' }, mockUser)

            // For non-Opened actions, detectConcurrentUsers must NOT be called
            // result should be the inserted row without otherUsersOpen
            expect(mockDataSource.query).toHaveBeenCalledTimes(2)  // only dupe-check + INSERT
            expect(result.otherUsersOpen).toBeUndefined()
        })
    })

    // -------------------------------------------------------------------------
    // REQ-AUDIT-BE-F-008 to F-012 — getHistory
    // -------------------------------------------------------------------------
    describe('getHistory', () => {
        it('T-AUDIT-BE-R08: returns mapped audit events with correct field shapes', async () => {
            const rows = [
                makeAuditRow({ action: 'Quote Created', details: { changes: [{ field: 'status', oldValue: '', newValue: 'Draft' }] } }),
                makeAuditRow({ action: 'Quote Opened', details: { description: 'manual note' } }),
            ]
            mockDataSource.query.mockResolvedValue(rows)

            const result = await service.getHistory('Quote', '1')
            expect(result).toHaveLength(2)
            expect(result[0]).toMatchObject({ action: 'Quote Created', user: 'alice', userId: 1 })
            expect(result[0].changes).toEqual([{ field: 'status', oldValue: '', newValue: 'Draft' }])
            expect(result[1].details).toBe('manual note')
        })

        it('T-AUDIT-BE-R09: returns empty array when no events exist for the entity', async () => {
            mockDataSource.query.mockResolvedValue([])

            const result = await service.getHistory('Quote', '99')
            expect(result).toEqual([])
        })

        it('T-AUDIT-BE-R10: queries with the correct entity_type and entity_id parameters', async () => {
            mockDataSource.query.mockResolvedValue([])

            await service.getHistory('Submission', '42')

            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['Submission', 42]),
            )
        })

        it('T-AUDIT-BE-R12: throws BadRequestException when id is not a valid integer', async () => {
            await expect(service.getHistory('Quote', 'not-a-number'))
                .rejects.toThrow(BadRequestException)
        })
    })

    // -------------------------------------------------------------------------
    // REQ-AUDIT-BE-F-013 — detectConcurrentUsers
    // ALL tests in this block will FAIL until AuditService adds the
    // detectConcurrentUsers(entityType, entityId, currentUserName) method.
    // Written ahead of implementation per §03 Three-Artifact Rule.
    // -------------------------------------------------------------------------
    describe('detectConcurrentUsers', () => {
        it('T-AUDIT-BE-R13a: returns names of other users who have net Opened-minus-Closed > 0', async () => {
            // alice: 1 Opened, 0 Closed → still open
            // bob: 1 Opened, 1 Closed → net 0 → not open
            mockDataSource.query.mockResolvedValue([
                { user_name: 'alice', action: 'Quote Opened' },
                { user_name: 'bob', action: 'Quote Opened' },
                { user_name: 'bob', action: 'Quote Closed' },
            ])

            const result = await (service as any).detectConcurrentUsers('Quote', 1, 'current-user')
            expect(result).toContain('alice')
            expect(result).not.toContain('bob')
        })

        it('T-AUDIT-BE-R13b: excludes the current user from the returned list even when they are open', async () => {
            mockDataSource.query.mockResolvedValue([
                { user_name: 'current-user', action: 'Quote Opened' },
                { user_name: 'alice', action: 'Quote Opened' },
            ])

            const result = await (service as any).detectConcurrentUsers('Quote', 1, 'current-user')
            expect(result).not.toContain('current-user')
            expect(result).toContain('alice')
        })

        it('T-AUDIT-BE-R13c: excludes users who have subsequently closed the record', async () => {
            // bob opened then closed — net 0 — must not appear
            mockDataSource.query.mockResolvedValue([
                { user_name: 'bob', action: 'Quote Opened' },
                { user_name: 'bob', action: 'Quote Closed' },
            ])

            const result = await (service as any).detectConcurrentUsers('Quote', 1, 'alice')
            expect(result).not.toContain('bob')
            expect(result).toHaveLength(0)
        })

        it('T-AUDIT-BE-R13d: returns empty array when no other users are concurrently open', async () => {
            mockDataSource.query.mockResolvedValue([])

            const result = await (service as any).detectConcurrentUsers('Quote', 1, 'alice')
            expect(result).toEqual([])
        })

        it('T-AUDIT-BE-R13e: queries using the correct entity-type-based action names', async () => {
            mockDataSource.query.mockResolvedValue([])

            await (service as any).detectConcurrentUsers('Submission', 5, 'alice')

            // Must filter by the correct Opened/Closed action strings for the given entityType
            expect(mockDataSource.query).toHaveBeenCalledWith(
                expect.any(String),
                expect.arrayContaining(['Submission', 5, 'Submission Opened', 'Submission Closed']),
            )
        })
    })
})
