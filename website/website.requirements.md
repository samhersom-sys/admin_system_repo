# REQUIREMENTS — WEBSITE (Public Marketing Site)

**Domain Code:** `WEB`  
**Location:** `website/`  
**Status:** Tests written — code pending (page files to be created in Step 4)  
**Test files:** `website/website.test.tsx` (component behaviour), `website/__tests__/codebase-scan.test.js` (architectural constraints)  
**First artifact** in the three-artifact rule: requirements → tests → code  
**Standard:** Written per [Guideline 13 — Requirements Writing Standards](../documentation/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Scope

**In scope:**
- `ExternalNavbar` — navigation bar shared across all four public pages
- Homepage at route `/`
- About page at route `/about`
- Services page at route `/services`
- Contact page at route `/contact`

**Out of scope:**
- Login, logout, or any authentication UI — auth remains in `frontend/` at `app.policyforge.com`
- Any API data fetching or backend integration
- A CMS or admin-editable content layer
- Any domain-specific logic (submissions, parties, finance, etc.)

---

## 2. Impact Analysis

| Area | Impact |
|------|--------|
| UI | New standalone `website/` Next.js 14 app |
| API | None — no API calls from this app |
| DB | None |
| `frontend/` | Routes for `/`, `/about`, `/services`, `/contact` will be removed and replaced with `/` → `/login` redirect; the `frontend/app/features/external/` folder will be deleted |
| Domain modules | None |

---

## 3. Requirements

### 3.1 ExternalNavbar

**REQ-WEB-F-001:** The `ExternalNavbar` component shall render on all four public pages: `/`, `/about`, `/services`, and `/contact`.

**REQ-WEB-F-002:** The `ExternalNavbar` component shall display four navigation links labelled HOME, ABOUT, SERVICES, and CONTACT, linking to `/`, `/about`, `/services`, and `/contact` respectively using Next.js `<Link>`.

**REQ-WEB-F-003:** The `ExternalNavbar` component shall display a brand logo that links back to `/` using Next.js `<Link>`.

**REQ-WEB-F-004:** The `ExternalNavbar` component shall display a LOGIN navigation item rendered as a plain HTML `<a>` element (not Next.js `<Link>`) whose `href` resolves to `${NEXT_PUBLIC_APP_URL}/login`.

**REQ-WEB-F-005:** The `ExternalNavbar` component shall apply transparent absolute positioning over the page content (class `absolute top-0 left-0 right-0`) when the current pathname is `/`, `/about`, or `/services`.

**REQ-WEB-F-006:** The `ExternalNavbar` component shall apply sticky white positioning with a bottom border (class `sticky top-0 bg-white border-b`) when the current pathname is `/contact`.

**REQ-WEB-F-007:** The `ExternalNavbar` component shall render the active navigation link with a visible bottom underline indicator. A link is considered active when the current pathname exactly matches its `href` (with `/` only matching an exact `/` path).

**REQ-WEB-F-008:** The `ExternalNavbar` component shall render nav link text in white on dark-hero pages (`/`, `/about`, `/services`) and in dark text on `/contact`.

**REQ-WEB-C-001:** The `ExternalNavbar` component shall not import from any module outside `website/` (no imports from `frontend/`, `backend/`, or any `domains/` folder).

**REQ-WEB-C-002:** The `ExternalNavbar` component shall not call `fetch()` or any API client method.

---

### 3.2 Homepage — Route `/`

**REQ-WEB-F-009:** The homepage shall be accessible at the route `/` and shall be the default (`page.tsx`) in the Next.js App Router.

**REQ-WEB-F-010:** The homepage shall render a full-width dark hero section displaying a background image (`/dark-image-hero.jpg`), a hero heading, and a hero subtitle paragraph over a semi-transparent dark overlay.

**REQ-WEB-F-011:** The homepage hero image shall recover from a load failure by switching its `src` to an inline SVG data URI fallback via an `onError` handler.

**REQ-WEB-F-012:** The homepage shall render a "What We Do" section below (and visually overlapping) the hero, with a background colour sourced from `brandColors.ui.homeBeige` applied as an inline `style` prop.

**REQ-WEB-F-013:** The homepage shall render a "Who We Connect" section on a white background listing at minimum the following participant types with label and description: Insurers, MGAs, Brokers, TPAs, and "And many more".

**REQ-WEB-F-014:** The homepage shall render a page-level footer displaying a copyright notice including the current calendar year and the text "The Policy Forge. All rights reserved."

**REQ-WEB-C-003:** The homepage shall source its beige background colour from `brandColors.ui.homeBeige` (imported from `website/lib/design-tokens/brandColors`) and shall not hardcode the hex value inline.

**REQ-WEB-C-004:** The homepage shall not import from any module outside `website/`.

**REQ-WEB-C-005:** The homepage shall not call `fetch()` or any API client method.

---

### 3.3 About Page — Route `/about`

**REQ-WEB-F-015:** The About page shall be accessible at the route `/about`.

**REQ-WEB-F-016:** The About page shall render a dark hero section (full-width background image with dark overlay) displaying the heading "About Us".

**REQ-WEB-F-017:** The About page shall render a content section below the hero with the heading "Our Story" and a paragraph of body copy.

**REQ-WEB-C-006:** The About page shall not import from any module outside `website/`.

**REQ-WEB-C-007:** The About page shall not call `fetch()` or any API client method.

---

### 3.4 Services Page — Route `/services`

**REQ-WEB-F-018:** The Services page shall be accessible at the route `/services`.

**REQ-WEB-F-019:** The Services page shall render a dark hero section displaying the heading "Services".

**REQ-WEB-F-020:** The Services page shall render a "What We Offer" grid of at least four service cards, each containing an icon, title, and description. The four required services are: Submission Management, Rating & Quoting, Delegated Authority, and Reporting & Analytics.

**REQ-WEB-C-008:** The Services page shall not import from any module outside `website/`.

**REQ-WEB-C-009:** The Services page shall not call `fetch()` or any API client method.

---

### 3.5 Contact Page — Route `/contact`

**REQ-WEB-F-021:** The Contact page shall be accessible at the route `/contact`.

**REQ-WEB-F-022:** The Contact page shall render a "Contact Us" heading and an introductory paragraph.

**REQ-WEB-F-023:** The Contact page shall render at least two information cards: one titled "General Enquiries" and one titled "Support".

**REQ-WEB-F-024:** The Contact page shall render a map or contact-form placeholder section (may be a styled `<div>` with placeholder text until real implementation is decided).

**REQ-WEB-C-010:** The Contact page shall not import from any module outside `website/`.

**REQ-WEB-C-011:** The Contact page shall not call `fetch()` or any API client method.

---

### 3.6 Architectural Constraints (all `website/` code)

**REQ-WEB-C-012:** The `website/` application shall maintain its own `package.json` and `node_modules`; it shall not share dependencies with `frontend/` or `backend/`.

**REQ-WEB-C-013:** All colour values in `website/` source files shall be expressed as Tailwind utility classes or as references to named tokens in `website/lib/design-tokens/brandColors`; no raw hex values shall appear in JSX `style` props or CSS files (except inside the SVG data URI fallback which encodes hex as `%23` to avoid scanner conflicts).

**REQ-WEB-C-014:** The `website/` app shall read the cross-origin authenticated-app URL exclusively from the `NEXT_PUBLIC_APP_URL` environment variable. This value shall not be hardcoded in any source file.

**REQ-WEB-C-015:** The `website/` app shall not import from any path beginning with `frontend/`, `backend/`, or `domains/`.

---

## 4. Traceability

| Requirement | Test | Status |
|-------------|------|--------|
| REQ-WEB-F-001 | implicitly by each page describe block in `website.test.tsx` | Tests written |
| REQ-WEB-F-002 | `T-WEB-navbar-R002` | Tests written |
| REQ-WEB-F-003 | `T-WEB-navbar-R003` | Tests written |
| REQ-WEB-F-004 | `T-WEB-navbar-R004` | Tests written |
| REQ-WEB-F-005 | `T-WEB-navbar-R005` (×3) | Tests written |
| REQ-WEB-F-006 | `T-WEB-navbar-R006` | Tests written |
| REQ-WEB-F-007 | `T-WEB-navbar-R007` (×2) | Tests written |
| REQ-WEB-F-008 | `T-WEB-navbar-R008` (×2) | Tests written |
| REQ-WEB-F-009 | `T-WEB-homepage-R009-R010` | Tests written |
| REQ-WEB-F-010 | `T-WEB-homepage-R009-R010` | Tests written |
| REQ-WEB-F-011 | `T-WEB-homepage-R011` | Tests written |
| REQ-WEB-F-012 | `T-WEB-homepage-R012` | Tests written |
| REQ-WEB-F-013 | `T-WEB-homepage-R013` (×2) | Tests written |
| REQ-WEB-F-014 | `T-WEB-homepage-R014` | Tests written |
| REQ-WEB-F-015 | `T-WEB-about-R015-R016` | Tests written |
| REQ-WEB-F-016 | `T-WEB-about-R015-R016` | Tests written |
| REQ-WEB-F-017 | `T-WEB-about-R017` | Tests written |
| REQ-WEB-F-018 | `T-WEB-services-R018-R019` | Tests written |
| REQ-WEB-F-019 | `T-WEB-services-R018-R019` | Tests written |
| REQ-WEB-F-020 | `T-WEB-services-R020` | Tests written |
| REQ-WEB-F-021 | `T-WEB-contact-R021-R022` | Tests written |
| REQ-WEB-F-022 | `T-WEB-contact-R021-R022`, `T-WEB-contact-R022` | Tests written |
| REQ-WEB-F-023 | `T-WEB-contact-R023` | Tests written |
| REQ-WEB-F-024 | `T-WEB-contact-R024` | Tests written |
| REQ-WEB-C-001 | `T-WEB-arch-C001-C015` (scan) | Tests written |
| REQ-WEB-C-002 | `T-WEB-arch-C002` (scan) | Tests written |
| REQ-WEB-C-003 | `T-WEB-homepage-R012-C003` | Tests written |
| REQ-WEB-C-004 | `T-WEB-arch-C001-C015` (scan) | Tests written |
| REQ-WEB-C-005 | `T-WEB-arch-C002` (scan) | Tests written |
| REQ-WEB-C-006 | `T-WEB-arch-C001-C015` (scan) | Tests written |
| REQ-WEB-C-007 | `T-WEB-arch-C002` (scan) | Tests written |
| REQ-WEB-C-008 | `T-WEB-arch-C001-C015` (scan) | Tests written |
| REQ-WEB-C-009 | `T-WEB-arch-C002` (scan) | Tests written |
| REQ-WEB-C-010 | `T-WEB-arch-C001-C015` (scan) | Tests written |
| REQ-WEB-C-011 | `T-WEB-arch-C002` (scan) | Tests written |
| REQ-WEB-C-012 | `T-WEB-arch-C012` (scan) | Tests written |
| REQ-WEB-C-013 | `T-WEB-arch-C013` (scan) | Tests written |
| REQ-WEB-C-014 | `T-WEB-arch-C014` (scan) | Tests written |
| REQ-WEB-C-015 | `T-WEB-arch-C001-C015` (scan) | Tests written |

---

## 5. Open Questions

None at this stage. Key architectural decisions (Next.js 14, token copy vs shared package, login cross-origin link, `NEXT_PUBLIC_APP_URL` env var) are all resolved.

---

## 6. Change Log

| Date | Author | Change |
|------|--------|--------|
| 2026-03-18 | AI | Initial draft — domain code WEB registered in Guideline 13 §4.1 |
| 2026-03-18 | AI | Tests written — traceability table updated; status: tests written, code pending |
