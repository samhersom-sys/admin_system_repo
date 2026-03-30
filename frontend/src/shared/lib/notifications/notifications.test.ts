/**
 * TESTS — lib/notifications
 * Second artifact. Requirements: lib/notifications/notifications.requirements.md
 * Test ID format: T-lib-notifications-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=lib/notifications
 */

import {
    fetchNotifications,
    createNotification,
    deleteNotification,
    markNotificationRead,
    bulkDeleteNotifications,
} from './notifications'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT (unverified — backend endpoint pending implementation):
//   GET    /api/notifications?userName=&orgCode=  ? AppNotification[]
//   POST   /api/notifications                     ? AppNotification (saved row)
//   DELETE /api/notifications/:id                 ? 204 No Content
//   PATCH  /api/notifications/:id/read            ? 200 OK
//   POST   /api/notifications/bulk-delete         ? 204 No Content  { ids: number[] }
//   No .data wrapper — all responses return value directly at root level
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/api-client/api-client', () => ({
    get: jest.fn(),
    post: jest.fn(),
    del: jest.fn(),
    patch: jest.fn(),
}))

import * as apiClient from '@/shared/lib/api-client/api-client'
const mockGet = apiClient.get as jest.Mock
const mockPost = apiClient.post as jest.Mock
const mockDel = apiClient.del as jest.Mock
const mockPatch = apiClient.patch as jest.Mock

beforeEach(() => jest.clearAllMocks())

// ---------------------------------------------------------------------------
// R01 — fetchNotifications
// ---------------------------------------------------------------------------

describe('T-lib-notifications-R01: fetchNotifications', () => {
    it('calls GET /api/notifications with no query when params omitted', async () => {
        mockGet.mockResolvedValue([])
        await fetchNotifications()
        expect(mockGet).toHaveBeenCalledWith('/api/notifications')
    })

    it('appends userName and orgCode as query params when provided', async () => {
        mockGet.mockResolvedValue([])
        await fetchNotifications({ userName: 'alice', orgCode: 'ACME' })
        expect(mockGet).toHaveBeenCalledWith(
            '/api/notifications?userName=alice&orgCode=ACME'
        )
    })

    it('returns the array returned by api-client', async () => {
        const data = [{ id: 1, message: 'hi', type: 'info' }]
        mockGet.mockResolvedValue(data)
        const result = await fetchNotifications()
        expect(result).toEqual(data)
    })
})

// ---------------------------------------------------------------------------
// R02 — createNotification
// ---------------------------------------------------------------------------

describe('T-lib-notifications-R02: createNotification', () => {
    it('POSTs to /api/notifications with the full payload', async () => {
        const payload = {
            userName: 'bob',
            orgCode: 'ACME',
            type: 'info' as const,
            message: 'Saved',
            payload: {},
        }
        const saved = { id: 5, ...payload }
        mockPost.mockResolvedValue(saved)
        const result = await createNotification(payload)
        expect(mockPost).toHaveBeenCalledWith('/api/notifications', payload)
        expect(result).toEqual(saved)
    })
})

// ---------------------------------------------------------------------------
// R03 — deleteNotification
// ---------------------------------------------------------------------------

describe('T-lib-notifications-R03: deleteNotification', () => {
    it('calls DELETE /api/notifications/:id with the given id', async () => {
        mockDel.mockResolvedValue(undefined)
        await deleteNotification(42)
        expect(mockDel).toHaveBeenCalledWith('/api/notifications/42')
    })

    it('works with string ids', async () => {
        mockDel.mockResolvedValue(undefined)
        await deleteNotification('99')
        expect(mockDel).toHaveBeenCalledWith('/api/notifications/99')
    })
})

// ---------------------------------------------------------------------------
// R04 — markNotificationRead
// ---------------------------------------------------------------------------

describe('T-lib-notifications-R04: markNotificationRead', () => {
    it('calls PATCH /api/notifications/:id/read', async () => {
        mockPatch.mockResolvedValue(undefined)
        await markNotificationRead(7)
        expect(mockPatch).toHaveBeenCalledWith('/api/notifications/7/read')
    })
})

// ---------------------------------------------------------------------------
// R05 — bulkDeleteNotifications
// ---------------------------------------------------------------------------

describe('T-lib-notifications-R05: bulkDeleteNotifications', () => {
    it('POSTs ids to /api/notifications/bulk with DELETE method', async () => {
        mockPost.mockResolvedValue(undefined)
        await bulkDeleteNotifications([1, 2, 3])
        expect(mockPost).toHaveBeenCalledWith(
            '/api/notifications/bulk-delete',
            { ids: [1, 2, 3] }
        )
    })

    it('throws when the api-client call rejects', async () => {
        mockPost.mockRejectedValue(new Error('404'))
        await expect(bulkDeleteNotifications([1])).rejects.toThrow()
    })
})
