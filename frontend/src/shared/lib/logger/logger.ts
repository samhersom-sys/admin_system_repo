/**
 * Logger — environment-aware logging utility.
 *
 * Requirements: lib/logger/logger.requirements.md
 *
 * In development/test (NODE_ENV !== 'production'):
 *   All methods forward to the browser Console with a '[PF]' prefix.
 *
 * In production (NODE_ENV === 'production'):
 *   All methods are no-ops.  Vite's build-time constant folding replaces
 *   process.env.NODE_ENV with the literal string 'production', so the dead-
 *   code elimination pass removes every logger call from the production bundle.
 *
 * RULE: Never call console.log / console.warn / console.error directly in
 * application code.  All debug output must go through this module.
 * The codebase scan (RULE-09) enforces this on every commit.
 */

// ---------------------------------------------------------------------------
// Exported for testing only — allows tests to mutate process.env.NODE_ENV
// and observe the effect without module re-import.
// ---------------------------------------------------------------------------
export function _isDevEnv(): boolean {
    return process.env.NODE_ENV !== 'production'
}

// ---------------------------------------------------------------------------
// Logger
// ---------------------------------------------------------------------------

export const logger = {
    /** General informational message. */
    log: (...args: unknown[]): void => {
        if (_isDevEnv()) console.log('[PF]', ...args)
    },

    /** Warning that does not halt execution. */
    warn: (...args: unknown[]): void => {
        if (_isDevEnv()) console.warn('[PF]', ...args)
    },

    /** Error message — use for caught exceptions and unexpected states. */
    error: (...args: unknown[]): void => {
        if (_isDevEnv()) console.error('[PF]', ...args)
    },

    /**
     * Log an outgoing API request.
     * Call this immediately BEFORE the api-client issues the underlying network request.
     *
     * @param method  HTTP method string (e.g. 'GET')
     * @param url     Request URL
     * @param body    Optional request body (omit for GET/DELETE)
     */
    request: (method: string, url: string, body?: unknown): void => {
        if (!_isDevEnv()) return
        console.group(`[PF] ▶ ${method.toUpperCase()} ${url}`)
        if (body !== undefined) console.log('Request body:', body)
        console.groupEnd()
    },

    /**
     * Log a successful API response.
     * Call this after `handleResponse` completes without throwing.
     *
     * @param method  HTTP method string
     * @param url     Request URL
     * @param status  HTTP status code from the response
     * @param body    Optional parsed response body
     */
    response: (method: string, url: string, status: number, body?: unknown): void => {
        if (!_isDevEnv()) return
        const icon = status >= 400 ? '✗' : '✓'
        console.group(`[PF] ${icon} ${status} ${method.toUpperCase()} ${url}`)
        if (body !== undefined) console.log('Response:', body)
        console.groupEnd()
    },

    /**
     * Log an API error (non-2xx response or network failure).
     * Call this inside the error branch of `handleResponse`.
     *
     * @param method  HTTP method string
     * @param url     Request URL
     * @param status  HTTP status code (use 0 for network errors)
     * @param detail  Optional error detail (parsed body or Error object)
     */
    apiError: (method: string, url: string, status: number, detail?: unknown): void => {
        if (!_isDevEnv()) return
        console.group(`[PF] ✗ ERROR ${status} ${method.toUpperCase()} ${url}`)
        if (detail !== undefined) console.error('Detail:', detail)
        console.groupEnd()
    },
}

export default logger
