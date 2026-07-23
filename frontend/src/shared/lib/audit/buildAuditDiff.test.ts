/**
 * buildAuditDiff unit tests
 *
 * REQ-SHARED-AUDIT-F-001 — no diff returns empty string
 * REQ-SHARED-AUDIT-F-002 — changed fields produce "Label: old → new"
 * REQ-SHARED-AUDIT-F-003 — null/undefined → em-dash; only label keys compared
 */
import { buildAuditDiff } from './buildAuditDiff'

describe('buildAuditDiff', () => {
    // ── T-SHARED-AUDIT-R001 ───────────────────────────────────────────────────
    describe('T-SHARED-AUDIT-R001 — no diff', () => {
        it('returns empty string when all labeled fields are equal', () => {
            expect(buildAuditDiff({ a: 'x' }, { a: 'x' }, { a: 'Field A' })).toBe('')
        })

        it('returns empty string when labels is empty', () => {
            expect(buildAuditDiff({ a: 'x' }, { a: 'y' }, {})).toBe('')
        })

        it('returns empty string when both objects are empty', () => {
            expect(buildAuditDiff({}, {}, { a: 'Field A' })).toBe('')
        })
    })

    // ── T-SHARED-AUDIT-R002 ───────────────────────────────────────────────────
    describe('T-SHARED-AUDIT-R002 — changed fields', () => {
        it('produces "Label: old → new" for a single changed field', () => {
            expect(buildAuditDiff({ a: 'x' }, { a: 'y' }, { a: 'Field A' })).toBe('Field A: x → y')
        })

        it('produces semicolon-joined entries for multiple changed fields', () => {
            const result = buildAuditDiff(
                { a: 'x', b: '1' },
                { a: 'y', b: '2' },
                { a: 'Field A', b: 'Field B' },
            )
            expect(result).toBe('Field A: x → y; Field B: 1 → 2')
        })

        it('only includes changed fields in the output', () => {
            const result = buildAuditDiff(
                { a: 'x', b: 'same' },
                { a: 'y', b: 'same' },
                { a: 'Field A', b: 'Field B' },
            )
            expect(result).toBe('Field A: x → y')
        })
    })

    // ── T-SHARED-AUDIT-R003 ───────────────────────────────────────────────────
    describe('T-SHARED-AUDIT-R003 — null/undefined handling and label filtering', () => {
        it('ignores fields not present in labels', () => {
            const result = buildAuditDiff(
                { a: 'x', b: 'y' },
                { a: 'z', b: 'w' },
                { a: 'A' },
            )
            expect(result).toBe('A: x → z')
        })

        it('displays null old value as em-dash', () => {
            expect(buildAuditDiff({ a: null }, { a: 'val' }, { a: 'Field A' })).toBe('Field A: — → val')
        })

        it('displays null new value as em-dash', () => {
            expect(buildAuditDiff({ a: 'val' }, { a: null }, { a: 'Field A' })).toBe('Field A: val → —')
        })

        it('treats empty string and undefined as equal (no diff)', () => {
            expect(buildAuditDiff({ a: '' }, { a: undefined }, { a: 'Field A' })).toBe('')
        })

        it('treats null and undefined as equal (no diff)', () => {
            expect(buildAuditDiff({ a: null }, { a: undefined }, { a: 'Field A' })).toBe('')
        })

        it('treats missing key and undefined as equal (no diff)', () => {
            expect(buildAuditDiff({}, { a: undefined }, { a: 'Field A' })).toBe('')
        })
    })
})
