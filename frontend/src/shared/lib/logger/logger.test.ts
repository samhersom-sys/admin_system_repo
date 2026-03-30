/**
 * Logger — tests
 * Requirements: lib/logger/logger.requirements.md
 *
 * Test IDs: T-LIB-LOGGER-R01 to T-LIB-LOGGER-R05
 *
 * NOTE: process.env.NODE_ENV is mutated in some tests to simulate production.
 * Always restore it in afterEach. logger methods call _isDevEnv() on every
 * invocation (not cached) so the env change takes effect immediately.
 */

import { logger, _isDevEnv } from './logger'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ORIGINAL_ENV = process.env.NODE_ENV

function setEnv(value: string) {
    process.env.NODE_ENV = value
}

afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_ENV
    jest.restoreAllMocks()
})

// ---------------------------------------------------------------------------
// R01 — Dev/test logging
// ---------------------------------------------------------------------------

describe('R01 — dev/test logging', () => {
    it('T-LIB-LOGGER-R01a: logger.log calls console.log with [PF] prefix in dev', () => {
        setEnv('development')
        const spy = jest.spyOn(console, 'log').mockImplementation(() => { })
        logger.log('hello', 42)
        expect(spy).toHaveBeenCalledWith('[PF]', 'hello', 42)
    })

    it('T-LIB-LOGGER-R01b: logger.warn calls console.warn with [PF] prefix in dev', () => {
        setEnv('development')
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => { })
        logger.warn('watch out')
        expect(spy).toHaveBeenCalledWith('[PF]', 'watch out')
    })

    it('T-LIB-LOGGER-R01c: logger.error calls console.error with [PF] prefix in dev', () => {
        setEnv('development')
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { })
        logger.error('boom', new Error('oops'))
        expect(spy).toHaveBeenCalledWith('[PF]', 'boom', expect.any(Error))
    })

    it('T-LIB-LOGGER-R01d: logger methods are active in test environment', () => {
        setEnv('test')
        const spy = jest.spyOn(console, 'log').mockImplementation(() => { })
        logger.log('test env active')
        expect(spy).toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R02 — Production no-op
// ---------------------------------------------------------------------------

describe('R02 — production no-op', () => {
    beforeEach(() => setEnv('production'))

    it('T-LIB-LOGGER-R02a: logger.log is a no-op in production', () => {
        const spy = jest.spyOn(console, 'log').mockImplementation(() => { })
        logger.log('should not appear')
        expect(spy).not.toHaveBeenCalled()
    })

    it('T-LIB-LOGGER-R02b: logger.warn is a no-op in production', () => {
        const spy = jest.spyOn(console, 'warn').mockImplementation(() => { })
        logger.warn('should not appear')
        expect(spy).not.toHaveBeenCalled()
    })

    it('T-LIB-LOGGER-R02c: logger.error is a no-op in production', () => {
        const spy = jest.spyOn(console, 'error').mockImplementation(() => { })
        logger.error('should not appear')
        expect(spy).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R03 — Request logging
// ---------------------------------------------------------------------------

describe('R03 — request logging', () => {
    it('T-LIB-LOGGER-R03a: logger.request opens a console group with method and URL', () => {
        setEnv('development')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        const groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation(() => { })
        logger.request('GET', '/api/test')
        expect(groupSpy).toHaveBeenCalledWith('[PF] ▶ GET /api/test')
        expect(groupEndSpy).toHaveBeenCalled()
    })

    it('T-LIB-LOGGER-R03b: logger.request logs request body when provided', () => {
        setEnv('development')
        jest.spyOn(console, 'group').mockImplementation(() => { })
        jest.spyOn(console, 'groupEnd').mockImplementation(() => { })
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => { })
        logger.request('POST', '/api/test', { email: 'a@b.com' })
        expect(logSpy).toHaveBeenCalledWith('Request body:', { email: 'a@b.com' })
    })

    it('T-LIB-LOGGER-R03c: logger.request is a no-op in production', () => {
        setEnv('production')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        logger.request('GET', '/api/test')
        expect(groupSpy).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R04 — Response logging
// ---------------------------------------------------------------------------

describe('R04 — response logging', () => {
    it('T-LIB-LOGGER-R04a: logger.response uses ✓ prefix for 2xx status', () => {
        setEnv('development')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        jest.spyOn(console, 'groupEnd').mockImplementation(() => { })
        logger.response('GET', '/api/test', 200)
        expect(groupSpy.mock.calls[0][0]).toContain('✓')
        expect(groupSpy.mock.calls[0][0]).toContain('200')
    })

    it('T-LIB-LOGGER-R04b: logger.response uses ✗ prefix for 4xx status', () => {
        setEnv('development')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        jest.spyOn(console, 'groupEnd').mockImplementation(() => { })
        logger.response('GET', '/api/test', 404)
        expect(groupSpy.mock.calls[0][0]).toContain('✗')
    })

    it('T-LIB-LOGGER-R04c: logger.response is a no-op in production', () => {
        setEnv('production')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        logger.response('GET', '/api/test', 200)
        expect(groupSpy).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// R05 — API error logging
// ---------------------------------------------------------------------------

describe('R05 — API error logging', () => {
    it('T-LIB-LOGGER-R05a: logger.apiError opens a group and calls console.error with detail', () => {
        setEnv('development')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => { })
        const groupEndSpy = jest.spyOn(console, 'groupEnd').mockImplementation(() => { })
        logger.apiError('POST', '/api/login', 401, { error: 'Invalid credentials' })
        expect(groupSpy).toHaveBeenCalledWith(expect.stringContaining('401'))
        expect(errorSpy).toHaveBeenCalledWith('Detail:', { error: 'Invalid credentials' })
        expect(groupEndSpy).toHaveBeenCalled()
    })

    it('T-LIB-LOGGER-R05b: logger.apiError is a no-op in production', () => {
        setEnv('production')
        const groupSpy = jest.spyOn(console, 'group').mockImplementation(() => { })
        logger.apiError('POST', '/api/login', 401)
        expect(groupSpy).not.toHaveBeenCalled()
    })
})

// ---------------------------------------------------------------------------
// _isDevEnv helper
// ---------------------------------------------------------------------------

describe('_isDevEnv utility', () => {
    it('returns false only when NODE_ENV is "production"', () => {
        setEnv('production')
        expect(_isDevEnv()).toBe(false)
    })

    it('returns true for development', () => {
        setEnv('development')
        expect(_isDevEnv()).toBe(true)
    })

    it('returns true for test', () => {
        setEnv('test')
        expect(_isDevEnv()).toBe(true)
    })
})
