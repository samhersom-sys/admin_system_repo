# REQUIREMENTS — NotificationDock

**Domain Code:** `NOTIF-DOCK`  
**Location:** `app/AppLayout/NotificationDock.jsx`  
**Status:** Implementation pending  
**Test file:** `app/AppLayout/NotificationDock.test.tsx`  
**Standard:** Written per [Guideline 13](../../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:** `NotificationProvider` context with `notifications`, `addNotification`, `removeNotification` (supports clientId), `markAsRead`, `clearAll`; `NotificationDock` bell button with severity badge colouring; badge count; auto-open on new notification; auto-close after 5 s; manual toggle.  
**Out of scope:** Chat/workspace dock buttons, message threading, push-notification subscriptions (deferred).

---

## 2. Requirements

**REQ-NOTIF-DOCK-F-001:** The `useNotifications()` hook shall return an object containing `{ notifications, addNotification, removeNotification, markAsRead, clearAll }`; `notifications` shall be an empty array before the API responds.

**REQ-NOTIF-DOCK-F-002:** The `NotificationDock` component shall render a bell button that is visible at all times within the authenticated shell regardless of notification count.

**REQ-NOTIF-DOCK-F-003:** The bell button shall render a badge displaying the total notification count when notifications are present, and shall not render a badge when the notifications array is empty.

**REQ-NOTIF-DOCK-F-004:** The bell button background shall reflect the highest-severity active notification using the following priority: any `error` → red; any `warning` (and no errors) → yellow; any `success` (and no errors or warnings) → green; no notifications or info only → neutral grey.

**REQ-NOTIF-DOCK-F-005:** Clicking the bell button shall open the `NotificationPanel` when the panel is closed, and shall close it when the panel is already open.

**REQ-NOTIF-DOCK-F-006:** The `NotificationPanel` shall open automatically when a new notification is added (notifications array length increases).

**REQ-NOTIF-DOCK-F-007:** The `NotificationPanel` shall auto-close 5 seconds after it was auto-opened for `info` or `success` notifications; `warning` and `error` notifications shall remain open until the user dismisses or toggles the panel. Manually clicking the bell button shall cancel the auto-close timer.

**REQ-NOTIF-DOCK-F-008:** The `removeNotification(id)` function shall, when called with a non-numeric string (clientId), remove from local state all notifications whose `payload.clientId` matches the argument and shall issue DELETE requests for the corresponding database rows via the notifications service.

**REQ-NOTIF-DOCK-F-009:** The `clearAll()` function shall remove all notifications from local state and shall issue DELETE requests for all server-persisted (numeric id) notifications.

---

## 3. Traceability

| Requirement ID | Test file | Test ID(s) |
|----------------|-----------|------------|
| REQ-NOTIF-DOCK-F-001 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R01 |
| REQ-NOTIF-DOCK-F-002 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R02 |
| REQ-NOTIF-DOCK-F-003 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R03 |
| REQ-NOTIF-DOCK-F-004 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R04 |
| REQ-NOTIF-DOCK-F-005 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R05 |
| REQ-NOTIF-DOCK-F-006 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R06 |
| REQ-NOTIF-DOCK-F-007 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R07 |
| REQ-NOTIF-DOCK-F-008 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R08 |
| REQ-NOTIF-DOCK-F-009 | `app/AppLayout/NotificationDock.test.tsx` | T-NotificationDock-R09 |

---

## 4. Open Questions

None.

---

## 5. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Initial requirements written |
| 2026-03-11 | Rewritten into formal REQ-NOTIF-DOCK-{TYPE}-{NNN} format per Guideline 13 |

---

## 6. Design Notes

### Dependencies

- `lib/notifications` — HTTP service for CRUD operations
- `lib/auth-session` — session for API scoping
