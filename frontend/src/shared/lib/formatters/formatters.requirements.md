# REQUIREMENTS — formatters

**Domain Code:** `FMT`  
**Location:** `lib/formatters/`  
**Status:** Implementation pending  
**Test file:** `lib/formatters/formatters.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `number`, `currency`, `date`, `monthYear`, `relativeTime` pure formatting functions.  
**Out of scope:** API calls, session reads, runtime locale switching.

---

## 2. Requirements

**REQ-FMT-F-001:** The `number(value, decimals?)` function shall return the string `'1,234,567'` when called with the integer `1234567`.

**REQ-FMT-F-002:** The `number(value, decimals?)` function shall return the string `'1,234.50'` when called with `1234.5` and `2` decimal places.

**REQ-FMT-F-003:** The `number(value, decimals?)` function shall return the string `'0'` when called with `0`.

**REQ-FMT-F-004:** The `currency(value, decimals?)` function shall return the string `'£1,000,000'` when called with `1000000`.

**REQ-FMT-F-005:** The `currency(value, decimals?)` function shall return the string `'£0'` when called with `0`.

**REQ-FMT-F-006:** The `currency(value, decimals?)` function shall return the string `'£1,234.56'` when called with `1234.56` and `2` decimal places.

**REQ-FMT-F-007:** The `date(isoString)` function shall return a string containing `'15'`, `'06'`, and `'2024'` when called with `'2024-06-15T10:00:00Z'`.

**REQ-FMT-F-008:** The `date(isoString)` function shall return the original input string (and shall not throw) when passed an invalid date string.

**REQ-FMT-F-009:** The `monthYear(isoString)` function shall return a string containing `'Jun'` and `'2024'` when called with `'2024-06-15'`.

**REQ-FMT-F-010:** The `monthYear(isoString)` function shall return the original input string (and shall not throw) when passed an invalid date string.

**REQ-FMT-F-011:** The `relativeTime(isoString)` function shall return the string `'just now'` when the input timestamp is less than 1 minute in the past.

**REQ-FMT-F-012:** The `relativeTime(isoString)` function shall return a string containing `'minute'` or `'minutes'` when the input timestamp is approximately 30 minutes in the past.

**REQ-FMT-F-013:** The `relativeTime(isoString)` function shall return a string containing `'hour'` when the input timestamp is approximately 2 hours in the past.

**REQ-FMT-F-014:** The `relativeTime(isoString)` function shall return a string containing `'day'` when the input timestamp is approximately 3 days in the past.

**REQ-FMT-F-015:** The `relativeTime(isoString)` function shall return the original input string (and shall not throw) when passed an invalid date string.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-FMT-F-001 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-002 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-003 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-004 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-005 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-006 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-007 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-008 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-009 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-010 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-011 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-012 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-013 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-014 | `lib/formatters/formatters.test.ts` | pending |
| REQ-FMT-F-015 | `lib/formatters/formatters.test.ts` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-FMT-{TYPE}-{NNN} format per Guideline 13 |

## Dependencies
- None (pure functions, no imports from other modules)
