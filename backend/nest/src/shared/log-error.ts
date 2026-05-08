/**
 * logError — shared error logging utility (§16-Error-Handling-Standards.md)
 *
 * Every backend service must call this before throwing any 4xx or 5xx
 * NestJS exception so that the error is recorded in the error_log table.
 *
 * Usage inside a service:
 *
 *   import { logError } from '../shared/log-error'
 *
 *   await logError(this.dataSource, orgCode, userName,
 *     'POST /api/quotes', 'ERR_QUOTE_NOT_FOUND', 'Quote not found', { id })
 *   throw new NotFoundException('Quote not found')
 *
 * The function is intentionally non-fatal: if the INSERT fails, a console
 * warning is emitted and execution continues so the primary response is
 * never blocked by a logging failure.
 */

import { DataSource } from 'typeorm'

export async function logError(
    dataSource: DataSource,
    orgCode: string | null,
    userName: string | null,
    source: string,
    errorCode: string,
    description: string,
    context: Record<string, unknown> = {},
): Promise<void> {
    try {
        await dataSource.query(
            `INSERT INTO error_log (org_code, user_name, source, error_code, description, context)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [orgCode, userName, source, errorCode, description, JSON.stringify(context)],
        )
    } catch (logErr: any) {
        console.warn('[logError] Failed to write to error_log:', logErr.message)
    }
}
