/**
 * buildAuditDiff — REQ-SHARED-AUDIT-F-001 to F-003
 *
 * Compares two form-value records and returns a human-readable diff string.
 * Only fields present in `labels` are compared.
 *
 * @returns "Label: old → new; Label2: old → new" or '' if nothing changed
 */
export function buildAuditDiff(
    prev: Record<string, unknown>,
    next: Record<string, unknown>,
    labels: Record<string, string>,
): string {
    const changes: string[] = []
    for (const [key, label] of Object.entries(labels)) {
        const oldVal = String(prev[key] ?? '')
        const newVal = String(next[key] ?? '')
        if (oldVal !== newVal) {
            const displayOld = prev[key] != null && prev[key] !== '' ? String(prev[key]) : '—'
            const displayNew = next[key] != null && next[key] !== '' ? String(next[key]) : '—'
            changes.push(`${label}: ${displayOld} → ${displayNew}`)
        }
    }
    return changes.join('; ')
}
