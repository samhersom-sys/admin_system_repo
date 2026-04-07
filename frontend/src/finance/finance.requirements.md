# REQUIREMENTS — Finance Domain (Frontend)

**Domain Code:** `FIN-FE`  
**Location:** `frontend/src/finance/`  
**Status:** Full requirements written — pending tests  
**Test file:** `frontend/src/finance/__tests__/finance.test.tsx`  
**Standard:** Written per [Guideline 13](../../../../docs/AI%20Guidelines/13-Requirements-Standards.md)

---

## 1. Backup Coverage Map

Sources read from `policy-forge-chat (BackUp)/`:
- `src/layouts/AppLayout/.../Finance/FinancePage.jsx`
- `src/layouts/AppLayout/.../Finance/CashBatchingPage.jsx`
- `src/layouts/AppLayout/.../Finance/CashBatchingCreatePage.jsx`
- `src/layouts/AppLayout/.../Finance/InvoicesPage.jsx`
- `src/layouts/AppLayout/.../Finance/PaymentsPage.jsx`
- `src/layouts/AppLayout/.../Finance/TrialBalancePage.jsx`

| # | BackUp Feature | REQ ID | Status |
|---|---|---|---|
| 1 | Finance hub page — 4 module cards with quick stats | F-001–F-004 | COVERED |
| 2 | Cash Batching — list, create, allocate | F-011–F-018 | COVERED |
| 3 | Invoices — list, create, filters, stats | F-021–F-028 | COVERED |
| 4 | Payments — list, record, filters, stats | F-031–F-038 | COVERED |
| 5 | Trial Balance — account list, generate report | F-041–F-046 | COVERED |
| 6 | Multi-currency support | C-003 | COVERED |

---

## 2. Impact Analysis

### Files to create (Block 1)
- `frontend/src/finance/FinanceHubPage/FinanceHubPage.tsx`
- `frontend/src/finance/CashBatchingPage/CashBatchingPage.tsx`
- `frontend/src/finance/InvoicesPage/InvoicesPage.tsx`
- `frontend/src/finance/PaymentsPage/PaymentsPage.tsx`
- `frontend/src/finance/TrialBalancePage/TrialBalancePage.tsx`
- `frontend/src/finance/finance.service.ts`
- `frontend/src/finance/__tests__/finance.test.tsx`

### Files to modify
- `frontend/src/main.jsx` — add routes: `/finance`, `/finance/cash-batching`, `/finance/cash-batching/create`, `/finance/invoices`, `/finance/payments`, `/finance/trial-balance`
- `frontend/src/shell/AppSidebar.tsx` — register sidebar sections

### Dependencies
- `@/shared/lib/api-client/api-client` — `get`, `post`, `put`, `del`
- `@/shared/lib/auth-session/auth-session` — `getSession`
- `react-router-dom` — `useNavigate`, `useParams`, `Link`
- `@/shell/SidebarContext` — `useSidebarSection`

### API Endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/finance/summary` | Hub page stats (outstanding, pending, unallocated, receivables) |
| GET | `/api/finance/cash-batches` | List cash batches |
| POST | `/api/finance/cash-batches` | Create cash batch |
| PUT | `/api/finance/cash-batches/:id` | Update allocation |
| GET | `/api/finance/invoices` | List invoices |
| POST | `/api/finance/invoices` | Create invoice |
| PUT | `/api/finance/invoices/:id` | Update invoice |
| GET | `/api/finance/payments` | List payments |
| POST | `/api/finance/payments` | Record payment |
| GET | `/api/finance/trial-balance` | Generate trial balance |
| GET | `/api/users` | Users for assignment dropdowns |

### Database Tables
| Table | Impact |
|---|---|
| `finance_cash_batches` | CRUD (to be created) |
| `finance_invoices` | CRUD (to be created) |
| `finance_payments` | CRUD (to be created) |
| `finance_gl_accounts` | Read (trial balance) |

---

## 3. Scope

**In scope (Block 1):** FinanceHubPage (`/finance`) — navigation hub with quick stats; CashBatchingPage (`/finance/cash-batching`) — list, create, allocate cash batches; InvoicesPage (`/finance/invoices`) — list, create, filter invoices; PaymentsPage (`/finance/payments`) — list, record, filter payments; TrialBalancePage (`/finance/trial-balance`) — account list with debit/credit totals.

**Deferred to Block 2:** Cash allocation workflow (matching payments to invoices); automated reconciliation.

**Out of scope:** General ledger integration; bank feeds; tax filing.

---

## 4. Requirements

### 4.1 FinanceHubPage — /finance

**REQ-FIN-FE-F-001:** The Finance hub page shall render a heading with the text `"Finance"` without throwing an uncaught JavaScript exception on initial render.

**REQ-FIN-FE-F-002:** The page shall call `GET /api/finance/summary` on mount and display a loading indicator while in flight.

**REQ-FIN-FE-F-003:** On success, the page shall display four module cards, each showing a title, a quick-stat figure, and a link:

| Card | Stat Label | Link |
|---|---|---|
| Cash Batching | Outstanding Cash | `/finance/cash-batching` |
| Invoices | Outstanding Invoices | `/finance/invoices` |
| Payments | Pending Payments | `/finance/payments` |
| Trial Balance | Total Receivables | `/finance/trial-balance` |

**REQ-FIN-FE-F-004:** On API failure, the page shall display the module cards without stat figures and show a non-blocking notification that summary data could not be loaded.

### 4.2 CashBatchingPage — /finance/cash-batching

**REQ-FIN-FE-F-011:** The Cash Batching page shall render a heading `"Cash Batching"` and a `"+ Create Batch"` button that navigates to `/finance/cash-batching/create`.

**REQ-FIN-FE-F-012:** The page shall call `GET /api/finance/cash-batches` on mount and render a table with columns: Reference, Amount, Currency, Allocated, Remaining, Status, Assigned To, Created Date. The `<thead>` shall always be rendered.

**REQ-FIN-FE-F-013:** The Remaining column shall display `amount - allocated` and shall be highlighted red when Remaining > 0 and the status is not `Closed`.

**REQ-FIN-FE-F-014:** When the list is empty, the table body shall render `"No cash batches found."`. On failure, an error message shall be shown.

**REQ-FIN-FE-F-015:** The `/finance/cash-batching/create` page shall render a form with fields: Cash Amount (number, required), Currency (select: USD, EUR, GBP, CAD, AUD, JPY, required), Reference (text, required), Assigned To (select from `GET /api/users`, optional).

**REQ-FIN-FE-F-016:** Clicking `"Save"` shall call `POST /api/finance/cash-batches` and navigate to `/finance/cash-batching` on success.

**REQ-FIN-FE-F-017:** Clicking `"Cancel"` shall navigate to `/finance/cash-batching` without saving.

**REQ-FIN-FE-F-018:** On save failure, an inline error message shall be shown and the form values shall be preserved.

### 4.3 InvoicesPage — /finance/invoices

**REQ-FIN-FE-F-021:** The Invoices page shall render a heading `"Invoices"` and a `"+ Create Invoice"` button.

**REQ-FIN-FE-F-022:** The page shall display three stats cards at the top: **Total Invoiced**, **Outstanding**, **Paid**. Values computed from the loaded invoices.

**REQ-FIN-FE-F-023:** The page shall call `GET /api/finance/invoices` on mount and render a table with columns: Reference, Type (Premium, Claim, Commission), Policy Ref (linked to `/policies/:id`), Insured Name, Amount, Outstanding, Status (Outstanding, Paid, Overdue, Cancelled), Due Date, Issue Date.

**REQ-FIN-FE-F-024:** The Status column shall display badges: Outstanding (amber), Paid (green), Overdue (red), Cancelled (gray).

**REQ-FIN-FE-F-025:** The page shall include filter dropdowns for Status and Type. Selecting a filter shall show only matching rows.

**REQ-FIN-FE-F-026:** Clicking `"+ Create Invoice"` shall open a modal with fields: Type (select), Policy Reference (text), Insured Name (text), Amount (number), Due Date (date), Currency (select). Saving shall call `POST /api/finance/invoices`.

**REQ-FIN-FE-F-027:** When the list is empty, the table body shall render `"No invoices found."`. On failure, an error message shall be shown.

**REQ-FIN-FE-F-028:** Invoices where `dueDate` is past and `status` is `Outstanding` shall have their Status badge automatically display as `Overdue`.

### 4.4 PaymentsPage — /finance/payments

**REQ-FIN-FE-F-031:** The Payments page shall render a heading `"Payments"` and a `"+ Record Payment"` button.

**REQ-FIN-FE-F-032:** The page shall display two stats cards: **Total Receipts** and **Total Payments**. Values computed from loaded records.

**REQ-FIN-FE-F-033:** The page shall call `GET /api/finance/payments` on mount and render a table with columns: Reference, Type (Receipt, Payment), Source, Amount, Method (Wire, Cheque, BACS, Direct Debit), Status (Pending, Cleared, Failed, Reversed), Date.

**REQ-FIN-FE-F-034:** The Status column shall display badges: Pending (amber), Cleared (green), Failed (red), Reversed (gray).

**REQ-FIN-FE-F-035:** The page shall include filter dropdowns for Status and Type.

**REQ-FIN-FE-F-036:** Clicking `"+ Record Payment"` shall open a modal with fields: Type (select: Receipt, Payment), Source (text), Amount (number), Currency (select), Method (select), Date (date). Saving shall call `POST /api/finance/payments`.

**REQ-FIN-FE-F-037:** When the list is empty, the table body shall render `"No payments found."`. On failure, an error message shall be shown.

**REQ-FIN-FE-F-038:** All monetary values shall display with 2 decimal places and the appropriate currency symbol.

### 4.5 TrialBalancePage — /finance/trial-balance

**REQ-FIN-FE-F-041:** The Trial Balance page shall render a heading `"Trial Balance"` and a `"Generate Report"` button.

**REQ-FIN-FE-F-042:** Clicking `"Generate Report"` shall call `GET /api/finance/trial-balance` and display results in a table with columns: Account, Debit, Credit. A totals row shall display the sum of all Debits and sum of all Credits.

**REQ-FIN-FE-F-043:** The totals row shall highlight in green when Total Debit equals Total Credit (balanced) and red when they differ (unbalanced).

**REQ-FIN-FE-F-044:** While the report is generating, a loading indicator with `"Generating trial balance…"` shall be shown.

**REQ-FIN-FE-F-045:** When no accounts exist, the table body shall render `"No accounts found."`. On failure, an error message shall be shown.

**REQ-FIN-FE-F-046:** The page shall display Total Debit and Total Credit as summary figures above the table.

### 4.6 Cross-cutting

**REQ-FIN-FE-C-001:** All API calls must go through `@/shared/lib/api-client/api-client`; no direct `fetch()` or `axios`.

**REQ-FIN-FE-C-002:** All table header cells shall use Title Case text (per §14.5 RULE 7).

**REQ-FIN-FE-C-003:** All monetary values shall be formatted with the locale-appropriate thousands separator, 2 decimal places, and the currency symbol based on the record's `currency` field. Supported currencies: USD ($), EUR (€), GBP (£), CAD (C$), AUD (A$), JPY (¥).

### 4.7 Security

**REQ-FIN-FE-S-001:** The finance pages shall not be accessible without a valid authenticated session.

**REQ-FIN-FE-S-002:** Creating invoices and recording payments shall only be available to users with `finance`, `manager`, or `admin` roles.

---

## 5. Traceability

| Requirement ID | Test file | Test ID(s) |
|---|---|---|
| REQ-FIN-FE-F-001 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-002 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-003 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-004 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-011 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-012 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-013 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-014 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-015 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-016 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-017 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-018 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-021 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-022 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-023 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-024 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-025 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-026 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-027 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-028 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-031 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-032 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-033 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-034 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-035 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-036 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-037 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-038 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-041 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-042 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-043 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-044 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-045 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-F-046 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-C-001 | code review | — |
| REQ-FIN-FE-C-002 | code review | — |
| REQ-FIN-FE-C-003 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-S-001 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |
| REQ-FIN-FE-S-002 | `frontend/src/finance/__tests__/finance.test.tsx` | pending |

---

## 6. Open Questions

| ID | Question | Status |
|----|----------|--------|
| OQ-FIN-001 | What database tables are needed for finance? Legacy had no finance tables — all data was sample/mock. | Open — tables to be designed |
| OQ-FIN-002 | Should exchange rates be live (external API) or configuration-managed? Legacy used hardcoded rates. | Open |
| OQ-FIN-003 | What GL account chart should the trial balance use? Legacy had 6 sample accounts. | Open |
| OQ-FIN-004 | Should cash batch allocation (matching payments to invoices) be in Block 1 or deferred? | Open — deferred to Block 2 |

---

## 7. Change Log

| Date | Change |
|------|--------|
| 2026-03-11 | Stub formatted per Guideline 13 |
| 2026-04-05 | Full requirements written from BackUp source. 32 functional + 3 constraint + 2 security REQs added. 5 pages: FinanceHubPage, CashBatchingPage, InvoicesPage, PaymentsPage, TrialBalancePage. Cash allocation deferred to Block 2. |

---

## 8. Design Notes

### Currency Configuration
| Code | Symbol | Name |
|---|---|---|
| USD | $ | US Dollar |
| EUR | € | Euro |
| GBP | £ | British Pound |
| CAD | C$ | Canadian Dollar |
| AUD | A$ | Australian Dollar |
| JPY | ¥ | Japanese Yen |

### Invoice Status Model
| Status | Badge Colour | Condition |
|---|---|---|
| Outstanding | Amber | Due date in future |
| Overdue | Red | Due date past + still outstanding |
| Paid | Green | Fully settled |
| Cancelled | Gray | Voided |

### Payment Method Options
Wire, Cheque, BACS, Direct Debit

### Trial Balance Account Types (sample)
Cash at Bank, Accounts Receivable, Premium Income, Claims Expense, Commissions Expense, Accounts Payable
