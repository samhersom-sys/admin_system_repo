# patch-quotes-service.ps1
# Stage 3: inject AuditService into QuotesService, refactor getAudit / postAudit / decline.
# Uses ReadAllText with UTF-8 encoding and LF normalization to avoid CRLF/encoding issues.

$path = "c:\Users\samhe\OneDrive\Desktop\Cleaned\backend\nest\src\quotes\quotes.service.ts"
$enc  = [System.Text.Encoding]::UTF8
$text = [System.IO.File]::ReadAllText($path, $enc)

# Normalize CRLF → LF for reliable string matching
$text = [regex]::Replace($text, "`r`n", "`n")

Write-Host "File length after read: $($text.Length)"

# ---------------------------------------------------------------------------
# 1. Add AuditService import after QuoteSection import
# ---------------------------------------------------------------------------
$old1 = "import { QuoteSection } from '../entities/quote-section.entity'"
$new1 = "import { QuoteSection } from '../entities/quote-section.entity'`nimport { AuditService } from '../audit/audit.service'"

$count1 = ([regex]::Matches($text, [regex]::Escape($old1))).Count
Write-Host "Change 1 matches: $count1"
if ($text -notmatch [regex]::Escape("import { AuditService } from '../audit/audit.service'")) {
    $text = $text.Replace($old1, $new1)
    Write-Host "Change 1 applied."
} else {
    Write-Host "Change 1 already applied — skipping."
}

# ---------------------------------------------------------------------------
# 2. Add auditService constructor parameter after dataSource
# ---------------------------------------------------------------------------
$old2 = @'
        @InjectDataSource()
        private readonly dataSource: DataSource,
    ) { }
'@
$new2 = @'
        @InjectDataSource()
        private readonly dataSource: DataSource,
        private readonly auditService: AuditService,
    ) { }
'@

$old2  = $old2.Replace("`r`n", "`n")
$new2  = $new2.Replace("`r`n", "`n")
$count2 = ([regex]::Matches($text, [regex]::Escape($old2))).Count
Write-Host "Change 2 matches: $count2"
$text = $text.Replace($old2, $new2)

# ---------------------------------------------------------------------------
# 3. Refactor decline() -- replace raw SQL UPDATE with JS merge + repository.save()
# Avoids matching the garbled em-dash comment above the try block.
# ---------------------------------------------------------------------------
$old3 = @'
            await this.dataSource.query(
                `UPDATE quotes SET status = 'Declined', payload = payload || $2::jsonb WHERE id = $1`,
                [id, JSON.stringify({ declineReasonCode: reasonCode, declineReasonText: reasonText ?? '' })],
            )
            return this.quoteRepo.findOne({ where: { id } }) as Promise<Quote>
'@
$new3 = @'
            // JS merge (per OQ-QUO-BE-NE-005) — no raw SQL JSONB merge needed
            const existingPayload = (typeof quote.payload === 'object' && quote.payload !== null) ? quote.payload : {}
            quote.status = 'Declined'
            quote.payload = { ...existingPayload, declineReasonCode: reasonCode, declineReasonText: reasonText ?? '' } as any
            return this.quoteRepo.save(quote)
'@

$old3  = $old3.Replace("`r`n", "`n")
$new3  = $new3.Replace("`r`n", "`n")
$count3 = ([regex]::Matches($text, [regex]::Escape($old3))).Count
Write-Host "Change 3 matches: $count3"
$text = $text.Replace($old3, $new3)

# ---------------------------------------------------------------------------
# 4. Refactor getAudit() -- delegate to auditService.getHistory
# ---------------------------------------------------------------------------
$old4 = @'
        const events = await this.dataSource.query<any[]>(
            `SELECT action, user_name, user_id, created_at, details
             FROM public.audit_event
             WHERE entity_type = 'Quote' AND entity_id = $1
             ORDER BY created_at ASC, id ASC`,
            [id],
        )
        return events.map((e: any) => ({
            action: e.action,
            user: e.user_name,
            userId: e.user_id,
            date: e.created_at,
            details: e.details?.details ?? undefined,
            changes: e.details?.changes ?? undefined,
        }))
'@
$new4 = "        return this.auditService.getHistory('Quote', id)`n"

$old4  = $old4.Replace("`r`n", "`n")
$count4 = ([regex]::Matches($text, [regex]::Escape($old4))).Count
Write-Host "Change 4 matches: $count4"
$text = $text.Replace($old4, $new4)

# ---------------------------------------------------------------------------
# 5. Refactor postAudit() -- delegate to auditService.writeEvent + getHistory
# ---------------------------------------------------------------------------
$old5 = @'
        const userId = user.id ?? null
        const storedDetails = (details && typeof details === 'object') ? details : {}
        const rows = await this.dataSource.query<any[]>(
            `INSERT INTO public.audit_event
                (entity_type, entity_id, action, details, created_by, user_id, user_name)
             VALUES ('Quote', $1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [id, action, JSON.stringify(storedDetails), userName, userId, userName],
        )
        return rows[0]
'@
$new5 = @'
        const writeResult = await this.auditService.writeEvent(
            { entityType: 'Quote', entityId: id, action, details },
            user,
        )
        const audit = await this.auditService.getHistory('Quote', id)
        return { success: true, audit, otherUsersOpen: writeResult.otherUsersOpen ?? [] }
'@

$old5  = $old5.Replace("`r`n", "`n")
$new5  = $new5.Replace("`r`n", "`n")
$count5 = ([regex]::Matches($text, [regex]::Escape($old5))).Count
Write-Host "Change 5 matches: $count5"
$text = $text.Replace($old5, $new5)

# ---------------------------------------------------------------------------
# Restore CRLF line endings and write back
# ---------------------------------------------------------------------------
$text = $text.Replace("`n", "`r`n")
[System.IO.File]::WriteAllText($path, $text, $enc)
Write-Host "quotes.service.ts patched successfully."
