/**
 * TESTS — lib/api-client
 * Second artifact. Requirements: lib/api-client/api-client.requirements.md
 * Test ID format: T-lib-api-client-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=api-client.test
 */

import { get, post, put, del } from './api-client'

// ---------------------------------------------------------------------------
// Mock: fetch (global)
// ---------------------------------------------------------------------------

const mockFetch = jest.fn()
global.fetch = mockFetch

// ---------------------------------------------------------------------------
// Mock: auth-session  (header injection tests need controlled session)
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
    getSession: jest.fn(),
}))

import { getSession } from '@/shared/lib/auth-session/auth-session'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockResponse(status: number, body: unknown) {
    mockFetch.mockResolvedValueOnce({
        ok: status >= 200 && status < 300,
        status,
        json: () => Promise.resolve(body),
    })
}

const NO_SESSION = null
const WITH_SESSION = {
    token: 'test-token',
    user: { id: 'u1', email: 'a@b.com', name: 'A', orgCode: 'TST', roles: [] },
}

beforeEach(() => {
    mockFetch.mockReset()
        ; (getSession as jest.Mock).mockReturnValue(NO_SESSION)
})

// ---------------------------------------------------------------------------
// R01 — get()
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R01: get() sends GET and returns parsed body', () => {
    it('returns parsed JSON on 200', async () => {
        mockResponse(200, [{ id: 1 }])
        const result = await get('/api/test')
        expect(result).toEqual([{ id: 1 }])
        expect(mockFetch).toHaveBeenCalledWith('/api/test', expect.objectContaining({ method: 'GET' }))
    })

    it('throws ApiError on non-2xx', async () => {
        mockResponse(404, { message: 'Not found' })
        await expect(get('/api/test')).rejects.toMatchObject({ status: 404 })
    })
})

// ---------------------------------------------------------------------------
// R02 — post()
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R02: post() sends POST with JSON body', () => {
    it('sends the body as JSON and returns parsed response', async () => {
        mockResponse(200, { id: 99 })
        const result = await post('/api/test', { name: 'test' })
        expect(result).toEqual({ id: 99 })
        const call = mockFetch.mock.calls[0]
        expect(call[1].method).toBe('POST')
        expect(call[1].body).toBe(JSON.stringify({ name: 'test' }))
    })

    it('throws ApiError on non-2xx', async () => {
        mockResponse(422, { message: 'Validation failed' })
        await expect(post('/api/test', {})).rejects.toMatchObject({ status: 422 })
    })
})

// ---------------------------------------------------------------------------
// R03 — put()
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R03: put() sends PUT with JSON body', () => {
    it('sends PUT and returns parsed response', async () => {
        mockResponse(200, { updated: true })
        const result = await put('/api/test/1', { name: 'updated' })
        expect(result).toEqual({ updated: true })
        expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
    })
})

// ---------------------------------------------------------------------------
// R04 — del()
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R04: del() sends DELETE', () => {
    it('sends DELETE and returns parsed response', async () => {
        mockResponse(200, { deleted: true })
        const result = await del('/api/test/1')
        expect(result).toEqual({ deleted: true })
        expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
    })
})

// ---------------------------------------------------------------------------
// R05 — Auth header injection
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R05: Authorization header injected from session', () => {
    it('includes Authorization header when session token exists', async () => {
        ; (getSession as jest.Mock).mockReturnValue(WITH_SESSION)
        mockResponse(200, {})
        await get('/api/test')
        const headers = mockFetch.mock.calls[0][1].headers
        expect(headers['Authorization']).toBe('Bearer test-token')
    })

    it('omits Authorization header when no session exists', async () => {
        ; (getSession as jest.Mock).mockReturnValue(null)
        mockResponse(200, {})
        await get('/api/test')
        const headers = mockFetch.mock.calls[0][1].headers
        expect(headers['Authorization']).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// R06 — x-org-code header injection
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R06: x-org-code header injected from session', () => {
    it('includes x-org-code header when session orgCode exists', async () => {
        ; (getSession as jest.Mock).mockReturnValue(WITH_SESSION)
        mockResponse(200, {})
        await get('/api/test')
        const headers = mockFetch.mock.calls[0][1].headers
        expect(headers['x-org-code']).toBe('TST')
    })

    it('omits x-org-code when no session exists', async () => {
        ; (getSession as jest.Mock).mockReturnValue(null)
        mockResponse(200, {})
        await get('/api/test')
        const headers = mockFetch.mock.calls[0][1].headers
        expect(headers['x-org-code']).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// R07 — Error shape
// ---------------------------------------------------------------------------

describe('T-lib-api-client-R07: non-2xx throws a typed ApiError', () => {
    it('thrown error is an instance of Error with status and body', async () => {
        mockResponse(500, { message: 'Server error' })
        let caught: unknown
        try {
            await get('/api/test')
        } catch (e) {
            caught = e
        }
        expect(caught).toBeInstanceOf(Error)
        expect((caught as any).status).toBe(500)
        expect((caught as any).body).toEqual({ message: 'Server error' })
    })
})
