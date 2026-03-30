# REQUIREMENTS — PWA Install Prompt

**Feature Code:** `PWA-INSTALL`  
**Location:** `app/features/pwa/`  
**Status:** Active — install banner + service worker built  
**Test file:** `pwa-install.test.tsx`

---

## 1. Scope

**In scope:**
- A dismissible floating banner prompting users to install the app as a PWA
- Rendered on both public (homepage) and authenticated app routes
- Triggered automatically when the browser fires `beforeinstallprompt`
- Dismissal persisted in `sessionStorage` — user not re-prompted in the same session
- Calls the browser's native install dialog on confirmation
- A minimal service worker registered at startup to satisfy PWA installability criteria
- An SVG app icon declared in the manifest so Chrome/Edge can show the install prompt

**Out of scope:**
- Persisting dismissal across sessions (deliberate — if user reopens the browser, they may want to reconsider)
- Custom install instructions for iOS (Safari does not support `beforeinstallprompt`)
- Offline caching strategies (service worker is minimal — network-first only)
- Push notifications

---

## 2. Requirements

**REQ-PWA-F-001:** The install banner shall only render when the browser fires the `beforeinstallprompt` event, **and** the device is a desktop/laptop (pointer + hover capable), **and** the app is not already running as an installed PWA (standalone or minimal-ui display mode). It must not render in browsers that do not support PWA installation (e.g. Safari on iOS) or on touch-primary mobile devices.

**REQ-PWA-F-002:** The banner shall appear as a fixed floating element (bottom-centre of the viewport) and must not occlude page content in a way that blocks interaction.

**REQ-PWA-F-003:** The banner shall contain an Install button. Clicking it shall invoke the browser's native install prompt (`promptEvent.prompt()`).

**REQ-PWA-F-004:** The banner shall contain a dismiss button (×). Clicking it shall hide the banner and set a `sessionStorage` flag (`pf_pwa_dismissed`) so the banner does not re-appear during the same session.

**REQ-PWA-F-005:** The banner shall render on both authenticated (app) and public (homepage) routes.

**REQ-PWA-F-006:** The application shall register a service worker (`/sw.js`) on page load via `registerServiceWorker()`. If the browser does not support service workers, registration shall be silently skipped.

**REQ-PWA-F-007:** The web app manifest shall declare at least one icon (SVG, `sizes: any`) so Chrome/Edge meet their PWA installability icon criteria and will fire `beforeinstallprompt`.

**REQ-PWA-F-008:** The banner shall be suppressed on non-desktop environments (touch-primary / mobile devices) where installing as a PWA does not produce the desktop title-bar theme-colour effect. Detection shall use the CSS media query `(hover: hover) and (pointer: fine)`. It shall also be suppressed if the app is already running in `standalone` or `minimal-ui` display mode (i.e. already installed).

---

## 3. Traceability

| Requirement ID | Test file | Test ID |
|----------------|-----------|---------|
| REQ-PWA-F-001 | `pwa-install.test.tsx` | T-PWA-R01 |
| REQ-PWA-F-001 | `pwa-install.test.tsx` | T-PWA-R02 |
| REQ-PWA-F-003 | `pwa-install.test.tsx` | T-PWA-R03 |
| REQ-PWA-F-004 | `pwa-install.test.tsx` | T-PWA-R04 |
| REQ-PWA-F-006 | `pwa-install.test.tsx` | T-PWA-R05 |
| REQ-PWA-F-006 | `pwa-install.test.tsx` | T-PWA-R06 |
| REQ-PWA-F-008 | `pwa-install.test.tsx` | T-PWA-R07 |
| REQ-PWA-F-008 | `pwa-install.test.tsx` | T-PWA-R08 |

---

## 4. Change Log

| Date | Change |
|------|--------|
| 2026-03-13 | Initial requirements — PWA install prompt feature |
| 2026-03-13 | Added REQ-PWA-F-006 (service worker) and REQ-PWA-F-007 (icon) to enable auto-prompt |
