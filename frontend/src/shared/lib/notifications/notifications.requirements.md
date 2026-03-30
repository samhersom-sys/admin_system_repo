# REQUIREMENTS — notifications (lib service)

**Domain Code:** `NOTIF-SVC`  
**Location:** `lib/notifications/`  
**Status:** Implementation pending  
**Test file:** `lib/notifications/notifications.test.ts`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** HTTP wrappers for list, create, delete (by DB id), mark-as-read, and bulk-delete; `AppNotification` and `CreateNotificationPayload` type definitions.  
**Out of scope:** Local-only fallback logic; clientId resolution; React context state — those belong in the NotificationContext layer.

---

## 2. Requirements

**REQ-NOTIF-SVC-F-001:** The `fetchNotifications(params?)` function shall call `GET /api/notifications` and return a parsed `AppNotification[]` on success.

**REQ-NOTIF-SVC-F-002:** The `fetchNotifications(params?)` function shall omit the query string from the URL when both `userName` and `orgCode` params are absent or empty.

**REQ-NOTIF-SVC-F-003:** The `createNotification(payload)` function shall call `POST /api/notifications` with a JSON body containing `userName`, `orgCode`, `type`, `message`, and `payload`, and shall return the saved `AppNotification`.

**REQ-NOTIF-SVC-F-004:** The `deleteNotification(id)` function shall call `DELETE /api/notifications/:id` using the provided numeric or string id in the URL path.

**REQ-NOTIF-SVC-F-005:** The `markNotificationRead(id)` function shall call `PATCH /api/notifications/:id/read` using the provided numeric id in the URL path.

**REQ-NOTIF-SVC-F-006:** The `bulkDeleteNotifications(ids)` function shall call `DELETE /api/notifications/bulk` with a JSON body of `{ ids }` and shall throw (not swallow) when the server returns a non-2xx response.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-NOTIF-SVC-F-001 | `lib/notifications/notifications.test.ts` | pending |
| REQ-NOTIF-SVC-F-002 | `lib/notifications/notifications.test.ts` | pending |
| REQ-NOTIF-SVC-F-003 | `lib/notifications/notifications.test.ts` | pending |
| REQ-NOTIF-SVC-F-004 | `lib/notifications/notifications.test.ts` | pending |
| REQ-NOTIF-SVC-F-005 | `lib/notifications/notifications.test.ts` | pending |
| REQ-NOTIF-SVC-F-006 | `lib/notifications/notifications.test.ts` | pending |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-NOTIF-SVC-{TYPE}-{NNN} format per Guideline 13 |
