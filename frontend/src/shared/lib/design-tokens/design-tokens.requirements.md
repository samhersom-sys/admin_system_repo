# REQUIREMENTS — design-tokens

**Domain Code:** `TOKENS`  
**Location:** `lib/design-tokens/`  
**Status:** Implementation pending  
**Test file:** `lib/design-tokens/design-tokens.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `global.css` CSS custom properties; `brandColors.ts` typed hex constants; `brandClasses.ts` Tailwind class aliases.  
**Out of scope:** Component-specific one-off colours; hex values in any `.jsx`/`.tsx` file.

---

## 2. Requirements

**REQ-TOKENS-F-001:** The `global.css` file shall define all brand and semantic colours as CSS custom properties inside a `:root {}` block.

**REQ-TOKENS-C-001:** The `global.css` file shall not contain hex colour literals outside the `:root {}` block.

**REQ-TOKENS-F-002:** The `brandColors.ts` file shall export a typed object containing the canonical hex values for every brand colour used in the application.

**REQ-TOKENS-C-002:** The `brandColors.ts` file shall be the only file in the entire codebase that defines hardcoded hex colour literals.

**REQ-TOKENS-C-003:** Exactly one file named `brandColors.ts` shall exist in the project, located at `lib/design-tokens/brandColors.ts`.

**REQ-TOKENS-F-003:** The `brandClasses.ts` file shall export a typed `brandClasses` object containing Tailwind CSS class strings for at minimum the keys `button`, `badge`, `typography`, and `table`.

**REQ-TOKENS-C-004:** Every value in the `brandClasses` object shall be a non-empty string containing only Tailwind class names and shall not contain any hex colour literals.

**REQ-TOKENS-C-005:** Exactly one file named `brandClasses.ts` shall exist in the project, located at `lib/design-tokens/brandClasses.ts`.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-TOKENS-F-001 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-C-001 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-F-002 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-C-002 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-C-003 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-F-003 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-C-004 | `lib/design-tokens/design-tokens.test.ts` | pending |
| REQ-TOKENS-C-005 | `lib/design-tokens/design-tokens.test.ts` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-TOKENS-{TYPE}-{NNN} format per Guideline 13 |
