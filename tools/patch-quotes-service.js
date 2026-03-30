/**
 * patch-quotes-service.js
 * Stage 3 — inject AuditService into QuotesService, refactor getAudit / postAudit / decline.
 * Run with: node patch-quotes-service.js
 */
const fs = require('fs')
const path = require('path')

const filePath = path.resolve(__dirname, '../backend/nest/src/quotes/quotes.service.ts')
let text = fs.readFileSync(filePath, 'utf8')

// Normalize CRLF -> LF for reliable matching
text = text.replace(/\r\n/g, '\n')
const before = text

// ---------------------------------------------------------------------------
// 1. Add AuditService import (idempotent)
// ---------------------------------------------------------------------------
if (!text.includes("import { AuditService }")) {
    text = text.replace(
        "import { QuoteSection } from '../entities/quote-section.entity'",
        "import { QuoteSection } from '../entities/quote-section.entity'\nimport { AuditService } from '../audit/audit.service'"
    )
    console.log('Change 1 applied — AuditService import added')
} else {
    console.log('Change 1 already applied — skipping')
}

// ---------------------------------------------------------------------------
// 2. Add auditService constructor parameter
// ---------------------------------------------------------------------------
const old2 = [
    '        @InjectDataSource()',
    '        private readonly dataSource: DataSource,',
    '    ) { }',
].join('\n')
const new2 = [
    '        @InjectDataSource()',
    '        private readonly dataSource: DataSource,',
    '        private readonly auditService: AuditService,',
    '    ) { }',
].join('\n')

if (text.includes(old2)) {
    text = text.replace(old2, new2)
    console.log('Change 2 applied — auditService constructor param added')
} else if (text.includes('private readonly auditService: AuditService,')) {
    console.log('Change 2 already applied — skipping')
} else {
    console.error('ERROR: Change 2 pattern not found!')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// 3. Refactor decline() — replace raw SQL UPDATE with JS merge + save()
// Targets only the SQL code (no garbled em-dash comment lines in pattern).
// ---------------------------------------------------------------------------
const old3 = [
    '            await this.dataSource.query(',
    '                `UPDATE quotes SET status = \'Declined\', payload = payload || $2::jsonb WHERE id = $1`,',
    '                [id, JSON.stringify({ declineReasonCode: reasonCode, declineReasonText: reasonText ?? \'\' })],',
    '            )',
    '            return this.quoteRepo.findOne({ where: { id } }) as Promise<Quote>',
].join('\n')
const new3 = [
    '            // JS merge (per OQ-QUO-BE-NE-005) -- no raw SQL JSONB merge needed',
    '            const existingPayload = (typeof quote.payload === \'object\' && quote.payload !== null) ? quote.payload : {}',
    '            quote.status = \'Declined\'',
    '            quote.payload = { ...existingPayload, declineReasonCode: reasonCode, declineReasonText: reasonText ?? \'\' } as any',
    '            return this.quoteRepo.save(quote)',
].join('\n')

if (text.includes(old3)) {
    text = text.replace(old3, new3)
    console.log('Change 3 applied — decline() JS merge refactor')
} else if (text.includes('const existingPayload')) {
    console.log('Change 3 already applied — skipping')
} else {
    console.error('ERROR: Change 3 pattern not found!')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// 4. Refactor getAudit() — delegate to auditService.getHistory
// ---------------------------------------------------------------------------
const old4 = [
    '        const events = await this.dataSource.query<any[]>(',
    '            `SELECT action, user_name, user_id, created_at, details',
    '             FROM public.audit_event',
    '             WHERE entity_type = \'Quote\' AND entity_id = $1',
    '             ORDER BY created_at ASC, id ASC`,',
    '            [id],',
    '        )',
    '        return events.map((e: any) => ({',
    '            action: e.action,',
    '            user: e.user_name,',
    '            userId: e.user_id,',
    '            date: e.created_at,',
    '            details: e.details?.details ?? undefined,',
    '            changes: e.details?.changes ?? undefined,',
    '        }))',
].join('\n')
const new4 = "        return this.auditService.getHistory('Quote', id)"

if (text.includes(old4)) {
    text = text.replace(old4, new4)
    console.log('Change 4 applied — getAudit() delegates to auditService.getHistory')
} else if (text.includes("return this.auditService.getHistory('Quote', id)")) {
    console.log('Change 4 already applied — skipping')
} else {
    console.error('ERROR: Change 4 pattern not found!')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// 5. Refactor postAudit() — delegate to auditService.writeEvent + getHistory
// ---------------------------------------------------------------------------
const old5 = [
    '        const userId = user.id ?? null',
    '        const storedDetails = (details && typeof details === \'object\') ? details : {}',
    '        const rows = await this.dataSource.query<any[]>(',
    '            `INSERT INTO public.audit_event',
    '                (entity_type, entity_id, action, details, created_by, user_id, user_name)',
    '             VALUES (\'Quote\', $1, $2, $3, $4, $5, $6)',
    '             RETURNING *`,',
    '            [id, action, JSON.stringify(storedDetails), userName, userId, userName],',
    '        )',
    '        return rows[0]',
].join('\n')
const new5 = [
    '        const writeResult = await this.auditService.writeEvent(',
    '            { entityType: \'Quote\', entityId: id, action, details },',
    '            user,',
    '        )',
    '        const audit = await this.auditService.getHistory(\'Quote\', id)',
    '        return { success: true, audit, otherUsersOpen: writeResult.otherUsersOpen ?? [] }',
].join('\n')

if (text.includes(old5)) {
    text = text.replace(old5, new5)
    console.log('Change 5 applied — postAudit() delegates to auditService')
} else if (text.includes('auditService.writeEvent(')) {
    console.log('Change 5 already applied — skipping')
} else {
    console.error('ERROR: Change 5 pattern not found!')
    process.exit(1)
}

// ---------------------------------------------------------------------------
// Restore CRLF and write back
// ---------------------------------------------------------------------------
text = text.replace(/\n/g, '\r\n')
fs.writeFileSync(filePath, text, 'utf8')
console.log('\nquotes.service.ts patched successfully.')
