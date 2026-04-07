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

## 1a. Impact Analysis

### UI Components

None — `notifications` is an HTTP service library. The React context layer (`NotificationContext`) is a separate consumer.

### API Endpoints (consumed)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/notifications` | Fetch notifications list (optional `userName`, `orgCode` params) |
| POST | `/api/notifications` | Create notification with `{ userName, orgCode, type, message, payload }` |
| DELETE | `/api/notifications/:id` | Delete single notification by DB id |
| PATCH | `/api/notifications/:id/read` | Mark single notification as read |
| DELETE | `/api/notifications/bulk` | Bulk delete with `{ ids }` body |

### Database Tables (read / written by API)

| Table | Key Columns | Role |
|-------|-------------|------|
| `notification_messages` | id, user_name, org_code, type, message, payload, read, created_at | Notification storage |

### Dependencies

- `lib/api-client` — HTTP wrapper for all 5 endpoints

### Consumers

- `NotificationContext` (in `app/AppLayout/`) — React context that calls these service functions
- `NotificationDock` — UI panel that renders notifications
- Any domain page that calls `createNotification()` for toast/banner alerts

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
| 2026-04-05 | Added Impact Analysis (§1a): 5 API endpoints, 1 DB table, 1 dependency, 3 consumer components |
