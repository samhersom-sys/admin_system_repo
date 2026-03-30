# useWindowSize — Requirements

**Component:** `useWindowSize`  
**Type:** React hook  
**Domain:** Shared lib  
**Location:** `lib/hooks/useWindowSize.ts`  
**Test file:** `lib/hooks/useWindowSize.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)  
**Guideline:** [AI Guideline 14 §14.9 RULE 10](../../documentation/AI%20Guidelines/14-UI-Component-Standards.md)

---

## 1. Purpose

Provides the current browser window dimensions (`width`, `height`) as reactive state that updates automatically when the window is resized. Intended for use when Tailwind responsive classes cannot express layout requirements imperatively.

---

## 2. Scope

**In scope:**
- Reading `window.innerWidth` and `window.innerHeight`
- Subscribing to `resize` events and re-rendering the consumer on change
- Cleanup of the event listener on unmount

**Out of scope:**
- Debouncing (deferred to caller if needed)
- Screen orientation
- Device pixel ratio

---

## 3. Requirements

**REQ-WIN-SIZE-001:** The hook shall return an object `{ width: number, height: number }`.

**REQ-WIN-SIZE-002:** The initial `width` and `height` shall equal `window.innerWidth` and `window.innerHeight` at the time the hook is called.

**REQ-WIN-SIZE-003:** When the browser window is resized, the hook shall update `width` and `height` to the new `window.innerWidth` and `window.innerHeight` values.

**REQ-WIN-SIZE-004:** The hook shall attach a `resize` listener to `window` on mount and remove it on unmount, leaving no orphaned listeners.

**REQ-WIN-SIZE-005:** The hook shall have no external dependencies beyond React.

---

## 4. Traceability

| Requirement ID | Test ID |
|---|---|
| REQ-WIN-SIZE-001 | T-WIN-SIZE-001 |
| REQ-WIN-SIZE-002 | T-WIN-SIZE-002 |
| REQ-WIN-SIZE-003 | T-WIN-SIZE-003 |
| REQ-WIN-SIZE-004 | T-WIN-SIZE-004 |

---

## 5. Change Log

| Date | Change |
|---|---|
| 2026-03-14 | Initial requirements — Guideline 14 RULE 10 |
