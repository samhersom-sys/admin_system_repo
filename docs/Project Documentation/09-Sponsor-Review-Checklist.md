# Policy Forge — Sponsor Review Checklist

This is a living document.  It records the manual walkthrough steps that the **Project Sponsor / Product Owner** should perform to verify that each delivered feature works correctly from a business perspective.

It is written in plain language.  No technical knowledge is required to follow these steps.

---

## How to Use This Document

Each entry describes one thing to check.  Follow the steps in order, then confirm the expected outcome is what you see.

**Status values:**
- `Draft` — written by the Business Analyst at Gate 1, not yet confirmed against the live system
- `Confirmed` — verified by the Developer after implementation; steps and outcomes are accurate
- `Validated` — personally checked by the Project Sponsor in the running application

If an outcome does not match what you see, raise it immediately.  Record the discrepancy in `docs/Technical Documentation/08-Open-Questions.md`.

---

## How Entries Are Added

1. **Business Analyst** writes draft review steps as part of the Gate 1 Requirements Sign-Off.  The Project Sponsor reviews and approves them alongside the requirements.
2. **Developer** confirms and refines the steps after implementation — updating any navigation paths, button labels, or expected values that changed during build.  Status moves to `Confirmed`.
3. **Project Sponsor** performs the walkthrough in the running application and marks items `Validated`.

Entries are **never removed** unless the feature is deliberately removed from the product.  If a feature changes, the existing entry is updated and status resets to `Confirmed` until re-validated.

---

## Entry Format

```
### [DOMAIN]-[NNN]: [Short feature name]

**Status:** Draft | Confirmed | Validated
**Added:** YYYY-MM-DD
**Last confirmed:** YYYY-MM-DD
**Requirements:** REQ-[DOMAIN]-[TYPE]-[NNN], ...

**Steps:**
1. Log in as [role]
2. Navigate to [page / menu path]
3. [Action to perform]
4. [Next action]

**Expected outcomes:**
- [ ] [Specific thing you should see — be precise about labels, values, statuses]
- [ ] [Another specific outcome]
- [ ] [Edge case or error scenario to check if applicable]
```

---

## Checklist Entries

> No entries yet.  Entries are added by the Business Analyst as features are delivered.
> The first entry will appear after the first Gate 1 approval.

<!-- ============================================================
     ENTRIES ARE APPENDED BELOW THIS LINE IN DELIVERY ORDER
     ============================================================ -->

---

### HOME-CFG-001: Default homepage shown on first login

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-001, REQ-HOME-CFG-FE-F-005  

**Steps:**
1. Log in as a **brand new user** (one whose account was just created and who has never logged in before).
2. Navigate to the home page (click the "Home" icon or go to `/app-home`).

**Expected outcomes:**
- [ ] The home page loads and shows a pre-built dashboard containing: a KPI strip, two GWP charts, a Recent Records table, and a My Tasks table — matching the layout that exists today on the "Overview" tab.
- [ ] No "Overview" tab label is visible — the homepage is the master homepage dashboard itself.
- [ ] The page does not show an error message or a blank screen.

---

### HOME-CFG-002: Setting a custom dashboard as the master homepage

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-002, REQ-HOME-CFG-FE-F-003, REQ-HOME-CFG-FE-F-010  

**Steps:**
1. Log in as any user.
2. Navigate to **Reporting → Report Library** (`/reports`).
3. In the **Core Homepages** section at the top, find the dashboard you want to use as your homepage.
4. Click the filled circle button in the **Homepage** column on the dashboard's row to set it as the master homepage.
5. Navigate to the home page (`/app-home`).

**Expected outcomes:**
- [ ] The Core Homepages section lists available dashboard-type report templates.
- [ ] After step 4, the Homepage toggle on the selected dashboard row shows as active (filled); all other Homepage toggles are inactive.
- [ ] Navigating to `/app-home` now renders the selected dashboard, not the default HomeDashboard.
- [ ] No "Overview" tab is visible — the master dashboard renders directly.

---

### HOME-CFG-003: Removing the master homepage designation

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-004  

**Steps:**
1. Log in as a user who has a master homepage set (the Homepage toggle is active on one dashboard in the Report Library → Core Homepages section).
2. Navigate to **Reporting → Report Library** (`/reports`).
3. In the **Core Homepages** section, click the active Homepage toggle on the currently-selected dashboard to deactivate it.
4. Navigate to the home page (`/app-home`).

**Expected outcomes:**
- [ ] After step 3, no Homepage toggle is active in the Core Homepages section.
- [ ] After step 4, the home page shows the default HomeDashboard (KPI strip, GWP charts, Recent Records, My Tasks widgets) — no user-configured dashboard.
- [ ] No error message appears.

---

### HOME-CFG-004: Recent Records appears as a runnable core report

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-006  

**Steps:**
1. Log in as any user.
2. Navigate to **Reporting → Reports** (`/reports`).
3. Look at the **Core Reports** table at the top of the page.
4. Find the row labelled **"Recent Records"** and click **"Run"**.

**Expected outcomes:**
- [ ] A "Recent Records" row is visible in the Core Reports section.
- [ ] Clicking Run opens the Report Run page showing a results table with columns: Reference, Record Type, Submission Type, Policy Status, Record Status, Insured, Broker, Last Opened, User.
- [ ] The table shows recent records for the logged-in user (the same records that appear on the homepage "Recent Records" widget).

---

### HOME-CFG-005: My Tasks appears as a runnable core report

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-007  

**Steps:**
1. Log in as a user who has at least one task assigned to them.
2. Navigate to **Reporting → Reports** (`/reports`).
3. Find the row labelled **"My Tasks"** in the Core Reports section and click **"Run"**.

**Expected outcomes:**
- [ ] A "My Tasks" row is visible in the Core Reports section.
- [ ] Clicking Run opens the Report Run page showing a table with columns: Task, Source, Due.
- [ ] The table shows only tasks assigned to the currently logged-in user (not tasks for other users).
- [ ] An overdue task (past its due date) is visually indicated.

---

### HOME-CFG-006: Adding Recent Records and My Tasks as widgets to a custom homepage

**Status:** Confirmed  
**Added:** 2026-06-29  
**Requirements:** REQ-HOME-CFG-FE-F-008, REQ-HOME-CFG-FE-F-009  

**Steps:**
1. Log in as any user.
2. Create a new dashboard (with "Show on Homepage" ticked).
3. Navigate to configure the dashboard's widgets (click "Configure Widgets" in the sidebar or navigate to `/dashboards/configure/:id`).
4. Click to add a widget to an empty slot. Select widget type **"Table"** and, in the data source dropdown, choose **"Recent Records"**.
5. Check that a live data preview appears in the widget editor showing recent records.
6. Save the widget.
7. Repeat steps 4–6 for a **"My Tasks"** widget.
8. Set this dashboard as the master homepage and navigate to `/app-home`.

**Expected outcomes:**
- [ ] Both "Recent Records" and "My Tasks" appear as selectable data sources in the widget editor.
- [ ] A live preview table appears in the widget editor before saving (for both data sources).
- [ ] After saving, both widgets render live data in the dashboard slots.
- [ ] The home page at `/app-home` shows the configured homepage with both widgets displaying real data.

**Validation / error scenario:**
- [ ] If no tasks exist for the user, the My Tasks widget shows "No tasks assigned." rather than an error.
- [ ] If the Recent Records API is unavailable, the widget shows an error message (not a blank space).

---

### EARN-001: Earning Engine — view earning periods on a policy section

**Status:** Confirmed  
**Added:** 2026-07-10  
**Requirements:** REQ-EARN-F-001, REQ-EARN-F-003 through F-007, REQ-EARN-F-010, REQ-EARN-F-011, REQ-EARN-F-014, REQ-EARN-F-015  

**Steps:**
1. Log in as **client_admin**.
2. Navigate to an active policy that has at least one section with inception and expiry dates set.
3. Open the policy section (click its reference in the Sections tab).
4. On the section view, navigate to Settings → **Earnings Config** and confirm the section has a resolved earning pattern (run pattern resolver if not).
5. Call `POST /api/earning-engine/sections/{sectionId}/calculate` (or wait for the nightly run) to generate earning periods.
6. On the policy section view page, click the **Finance Summary** tab.

**Expected outcomes:**
- [ ] The Finance Summary tab is visible in the section's tab strip.
- [ ] A table appears with columns: Calendar Period, Total Premium, GWP Earn, Unearned, Basis, Days.
- [ ] Each row represents one calendar month within the section's inception–expiry range.
- [ ] The Unearned amount for a month in the future equals its Total Premium; the Unearned for a fully elapsed month is 0.
- [ ] No data from another organisation's sections is visible.

---

### EARN-002: Earning Engine — Finance Summary tab at the policy layer

**Status:** Confirmed  
**Added:** 2026-07-10  
**Requirements:** REQ-EARN-F-016  

**Steps:**
1. Log in as **client_admin**.

---

### POL-SEC-ALIGN-001: Policy and Quote section alignment for grids and tabs

**Status:** Draft
**Added:** 2026-07-14
**Requirements:** REQ-POL-FE-F-056, REQ-POL-FE-F-057, REQ-POL-FE-F-058, REQ-POL-FE-F-059, REQ-POL-FE-F-060

**Steps:**
1. Log in as a policy operations user.
2. Open any policy and click the **Sections** tab.
3. Review the sections grid headers from left to right.
4. Confirm these columns are not shown: Written Order %, Signed Order %, Time Basis, Written Order Basis, Signed Order Basis, Written Line Total, Signed Line Total, DA Ref, DA Section Ref.
5. On the same policy page, click **Transactions**.
6. Confirm the Transactions grid loads and shows transaction rows.
7. Open a policy section from the policy sections grid.
8. Review the section tab strip and confirm it shows: Coverages, Deductions, Risk Codes, Participations, Section Financial Summary, Signings.
9. Confirm **Finance Summary** is not present on the policy section tab strip.
10. Open a quote section in a second browser tab and go to the **Coverages** tab.
11. Compare quote and policy coverage grid headers.

**Expected outcomes:**
- [ ] Policy Sections grid excludes all operational columns listed in step 4.
- [ ] Policy page still includes a Transactions tab and it remains functional.
- [ ] Policy Section tabs match quote section tabs and include Risk Codes.
- [ ] Policy Section tabs do not include Finance Summary.
- [ ] Quote and Policy coverage grids use the same unified 12-column header order.
- [ ] Rows with missing values render placeholders and do not crash the page.
2. Navigate to a policy that has earning periods calculated on at least one section.
3. On the policy view page, click the **Finance Summary** tab.

**Expected outcomes:**
- [ ] The Finance Summary tab is visible in the policy's tab strip.
- [ ] A table appears with one row per calendar month, showing aggregated earned and unearned amounts across all sections of the policy.
- [ ] Months are ordered chronologically (earliest first).
- [ ] No data from another organisation's policies is visible.

---

### EARN-003: Earnings Config — create a pattern and a matching rule

**Status:** Confirmed  
**Added:** 2026-07-10  
**Requirements:** REQ-EARN-F-001, REQ-EARN-F-002, REQ-EARN-F-017  

**Steps:**
1. Log in as **client_admin** or **internal_admin**.
2. Navigate to **Settings → Earnings Config**.
3. On the **Patterns** tab, click **New Pattern**. Enter a name, choose pattern type **Straight Line**, and save.
4. Switch to the **Rules** tab. Click **Add Rule**. Select the pattern just created, leave other fields blank, and save.
5. Confirm the rule appears in the rules list with the correct pattern name.

**Expected outcomes:**
- [ ] The new pattern appears in the Patterns list after saving.
- [ ] The new rule appears in the Rules list; it has no product selector field (product selection is not part of rule creation).
- [ ] The rule form shows a Pattern dropdown but no Product field.
- [ ] Deactivating the rule removes it from the active rules list immediately.

---

### QUO-SEC-001: Quote Sections grid excludes operational detail attributes

**Status:** Draft  
**Added:** 2026-07-14  
**Requirements:** REQ-QUOTES-F-001, REQ-QUOTES-F-002, REQ-QUOTES-F-005  

**Steps:**
1. Log in as a user who can edit Draft quotes.
2. Navigate to a quote with at least one section.
3. Open the **Sections** tab.
4. Confirm the grid headers do not include: Written Order %, Signed Order %, Time Basis, Written Order Basis, Signed Order Basis, Written Line Total, Signed Line Total, DA Ref, DA Section Ref.
5. Click a section reference to open **Quote Section Details**.
6. Confirm the following fields are visible in details: Written Order %, Signed Order %, Time Basis, Written Order Basis, Signed Order Basis, Written Line Total, Signed Line Total, Delegated Authority Reference, Delegated Authority Section Reference.
7. Confirm movement fields in details are read-only.

**Expected outcomes:**
- [ ] The Sections grid excludes all listed operational detail headers.
- [ ] Quote Section Details contains all listed operational fields.
- [ ] Movement fields are displayed but not editable.
