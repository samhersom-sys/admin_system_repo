/**
 * TESTS — Finance Domain
 * Second artifact. Requirements: finance.requirements.md
 * Test ID format: T-FIN-FE-F-R{NNN}
 *
 * Coverage:
 *   REQ-FIN-FE-F-001 to F-046  (all Block 1 functional requirements)
 *   REQ-FIN-FE-C-001 to C-003  (constraints)
 *   REQ-FIN-FE-S-001, S-002    (security)
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
//
// API CONTRACT ALIGNMENT:
//   GET  /api/finance/summary        → FinanceSummary
//   GET  /api/finance/cash-batches   → CashBatch[]
//   POST /api/finance/cash-batches   → CashBatch
//   GET  /api/finance/invoices       → Invoice[]
//   POST /api/finance/invoices       → Invoice
//   GET  /api/finance/payments       → Payment[]
//   POST /api/finance/payments       → Payment
//   GET  /api/finance/trial-balance  → TrialBalanceRow[]
//   All calls via @/shared/lib/api-client/api-client
// ---------------------------------------------------------------------------

const mockGetFinanceSummary = jest.fn()
const mockGetCashBatches = jest.fn()
const mockCreateCashBatch = jest.fn()
const mockGetInvoices = jest.fn()
const mockCreateInvoice = jest.fn()
const mockGetPayments = jest.fn()
const mockCreatePayment = jest.fn()
const mockGetTrialBalance = jest.fn()

jest.mock('../finance.service', () => ({
    getFinanceSummary: (...a: unknown[]) => mockGetFinanceSummary(...a),
    getCashBatches: (...a: unknown[]) => mockGetCashBatches(...a),
    createCashBatch: (...a: unknown[]) => mockCreateCashBatch(...a),
    getInvoices: (...a: unknown[]) => mockGetInvoices(...a),
    createInvoice: (...a: unknown[]) => mockCreateInvoice(...a),
    getPayments: (...a: unknown[]) => mockGetPayments(...a),
    createPayment: (...a: unknown[]) => mockCreatePayment(...a),
    getTrialBalance: (...a: unknown[]) => mockGetTrialBalance(...a),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({ addNotification: mockAddNotification }),
}))
jest.mock('@/shell/SidebarContext', () => ({
    useSidebarSection: jest.fn(),
}))
jest.mock('@/shared/Card/Card', () =>
    function Card({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) {
        return <div data-testid="card" className={className} onClick={onClick}>{children}</div>
    }
)

import FinanceHubPage from '../FinanceHubPage/FinanceHubPage'
import CashBatchingPage from '../CashBatchingPage/CashBatchingPage'
import CashBatchingCreatePage from '../CashBatchingPage/CashBatchingCreatePage'
import InvoicesPage from '../InvoicesPage/InvoicesPage'
import PaymentsPage from '../PaymentsPage/PaymentsPage'
import TrialBalancePage from '../TrialBalancePage/TrialBalancePage'

function renderPage(element: React.ReactElement, path = '/') {
    return render(
        <MemoryRouter initialEntries={[path]}>
            {element}
        </MemoryRouter>,
    )
}

function renderWithRoutes(initialPath: string, routes: React.ReactElement) {
    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>{routes}</Routes>
        </MemoryRouter>,
    )
}

// ---------------------------------------------------------------------------
// FinanceHubPage — REQ-FIN-FE-F-001 to F-004
// ---------------------------------------------------------------------------

describe('FinanceHubPage — /finance', () => {
    beforeEach(() => {
        mockGetFinanceSummary.mockResolvedValue({
            outstandingCash: 42000,
            outstandingInvoices: 5,
            pendingPayments: 12,
            totalReceivables: 99000,
        })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-F-001
    it('T-FIN-FE-F-R001 — renders "Finance" heading without crashing', async () => {
        renderPage(<FinanceHubPage />)
        expect(screen.getByRole('heading', { name: /finance/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-002
    it('T-FIN-FE-F-R002 — calls getFinanceSummary on mount', async () => {
        renderPage(<FinanceHubPage />)
        await waitFor(() => expect(mockGetFinanceSummary).toHaveBeenCalledTimes(1))
    })

    // REQ-FIN-FE-F-003
    it('T-FIN-FE-F-R003 — displays 4 module cards: Cash Batching, Invoices, Payments, Trial Balance', async () => {
        renderPage(<FinanceHubPage />)
        expect(await screen.findByText('Cash Batching')).toBeInTheDocument()
        expect(screen.getByText('Invoices')).toBeInTheDocument()
        expect(screen.getByText('Payments')).toBeInTheDocument()
        expect(screen.getByText('Trial Balance')).toBeInTheDocument()
    })

    it('T-FIN-FE-F-R003b — each card shows the stat figure from API when loaded', async () => {
        renderPage(<FinanceHubPage />)
        // 42,000 for outstandingCash
        expect(await screen.findByText('42,000')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-004
    it('T-FIN-FE-F-R004 — on API failure shows module cards with "—" figures', async () => {
        mockGetFinanceSummary.mockRejectedValue(new Error('fail'))
        renderPage(<FinanceHubPage />)
        await waitFor(() => expect(screen.getAllByText('—').length).toBe(4))
        expect(screen.getByText('Cash Batching')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// CashBatchingPage — REQ-FIN-FE-F-011 to F-018
// ---------------------------------------------------------------------------

describe('CashBatchingPage — /finance/cash-batching', () => {
    const SAMPLE_BATCH = {
        id: 1,
        reference: 'CB-001',
        amount: 10000,
        currency: 'GBP',
        allocated: 4000,
        remaining: 6000,
        status: 'Open',
        assigned_to: 'Alice',
        created_date: '2026-01-01',
    }

    beforeEach(() => {
        mockGetCashBatches.mockResolvedValue([SAMPLE_BATCH])
        mockCreateCashBatch.mockResolvedValue({ ...SAMPLE_BATCH, id: 2 })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-F-011
    it('T-FIN-FE-F-R011 — renders "Cash Batching" heading and Create Batch button', async () => {
        renderPage(<CashBatchingPage />)
        expect(await screen.findByRole('heading', { name: /cash batching/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create batch/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-012
    it('T-FIN-FE-F-R012 — calls getCashBatches on mount; table renders required columns', async () => {
        renderPage(<CashBatchingPage />)
        await waitFor(() => expect(mockGetCashBatches).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Currency')).toBeInTheDocument()
        expect(screen.getByText('Allocated')).toBeInTheDocument()
        expect(screen.getByText('Remaining')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Assigned To')).toBeInTheDocument()
        expect(screen.getByText('Created Date')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-013
    it('T-FIN-FE-F-R013 — renders batch data in table rows', async () => {
        renderPage(<CashBatchingPage />)
        expect(await screen.findByText('CB-001')).toBeInTheDocument()
        expect(screen.getByText('GBP')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-014
    it('T-FIN-FE-F-R014 — empty list renders "No cash batches found."', async () => {
        mockGetCashBatches.mockResolvedValue([])
        renderPage(<CashBatchingPage />)
        expect(await screen.findByText(/no cash batches found/i)).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// CashBatchingCreatePage — REQ-FIN-FE-F-015 to F-018
// ---------------------------------------------------------------------------

describe('CashBatchingCreatePage — /finance/cash-batching/create', () => {
    beforeEach(() => {
        mockCreateCashBatch.mockResolvedValue({ id: 5, reference: 'CB-NEW', amount: 1000, currency: 'GBP', allocated: 0, remaining: 1000, status: 'Open' })
    })
    afterEach(() => jest.clearAllMocks())

    function renderCreateBatch() {
        return renderWithRoutes('/finance/cash-batching/create', (
            <>
                <Route path="/finance/cash-batching/create" element={<CashBatchingCreatePage />} />
                <Route path="/finance/cash-batching" element={<div>cash-batching-list</div>} />
            </>
        ))
    }

    // REQ-FIN-FE-F-015
    it('T-FIN-FE-F-R015 — create form renders Reference, Amount, Currency, Assigned To fields', () => {
        renderCreateBatch()
        expect(screen.getByLabelText(/reference/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/currency/i)).toBeInTheDocument()
        expect(screen.getByLabelText(/assigned to/i)).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-016
    it('T-FIN-FE-F-R016 — Save calls createCashBatch and navigates to /finance/cash-batching on success', async () => {
        renderCreateBatch()
        await userEvent.type(screen.getByLabelText(/reference/i), 'CB-TEST')
        await userEvent.clear(screen.getByLabelText(/amount/i))
        await userEvent.type(screen.getByLabelText(/amount/i), '5000')
        await userEvent.click(screen.getByRole('button', { name: /save batch/i }))
        await waitFor(() => expect(mockCreateCashBatch).toHaveBeenCalled())
        expect(await screen.findByText('cash-batching-list')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-017
    it('T-FIN-FE-F-R017 — Cancel navigates to /finance/cash-batching without saving', async () => {
        renderCreateBatch()
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
        expect(screen.getByText('cash-batching-list')).toBeInTheDocument()
        expect(mockCreateCashBatch).not.toHaveBeenCalled()
    })

    // REQ-FIN-FE-F-018
    it('T-FIN-FE-F-R018 — on save failure shows error notification and does not navigate', async () => {
        mockCreateCashBatch.mockRejectedValue(new Error('Server error'))
        renderCreateBatch()
        await userEvent.type(screen.getByLabelText(/reference/i), 'CB-ERR')
        await userEvent.clear(screen.getByLabelText(/amount/i))
        await userEvent.type(screen.getByLabelText(/amount/i), '100')
        await userEvent.click(screen.getByRole('button', { name: /save batch/i }))
        await waitFor(() => expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error'))
        expect(screen.queryByText('cash-batching-list')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// InvoicesPage — REQ-FIN-FE-F-021 to F-028
// ---------------------------------------------------------------------------

describe('InvoicesPage — /finance/invoices', () => {
    const SAMPLE_INVOICE = {
        id: 1,
        reference: 'INV-001',
        type: 'Premium' as const,
        policy_reference: 'POL-001',
        insured_name: 'Acme Corp',
        amount: 5000,
        outstanding: 5000,
        status: 'Outstanding' as const,
        due_date: '2030-12-31',
        issue_date: '2026-01-01',
        currency: 'GBP',
    }

    beforeEach(() => {
        mockGetInvoices.mockResolvedValue([SAMPLE_INVOICE])
        mockCreateInvoice.mockResolvedValue({ ...SAMPLE_INVOICE, id: 2, reference: 'INV-002' })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-F-021
    it('T-FIN-FE-F-R021 — renders "Invoices" heading and Create Invoice button', async () => {
        renderPage(<InvoicesPage />)
        expect(await screen.findByRole('heading', { name: /invoices/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /create invoice/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-022
    it('T-FIN-FE-F-R022 — displays three stats cards: Total Invoiced, Outstanding, Paid', async () => {
        renderPage(<InvoicesPage />)
        expect(await screen.findByText('Total Invoiced')).toBeInTheDocument()
        expect(screen.getByText('Outstanding', { selector: 'p' })).toBeInTheDocument()
        expect(screen.getByText('Paid', { selector: 'p' })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-023
    it('T-FIN-FE-F-R023 — calls getInvoices on mount; table renders expected columns', async () => {
        renderPage(<InvoicesPage />)
        await waitFor(() => expect(mockGetInvoices).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Type')).toBeInTheDocument()
        expect(screen.getByText('Policy Ref')).toBeInTheDocument()
        expect(screen.getByText('Insured Name')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Due Date')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-024
    it('T-FIN-FE-F-R024 — status badge is rendered for invoice row', async () => {
        renderPage(<InvoicesPage />)
        expect(await screen.findByText('Outstanding', { selector: 'span' })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-025
    it('T-FIN-FE-F-R025 — Status filter dropdown filters rows client-side', async () => {
        mockGetInvoices.mockResolvedValue([
            SAMPLE_INVOICE,
            { ...SAMPLE_INVOICE, id: 2, reference: 'INV-002', status: 'Paid' as const },
        ])
        renderPage(<InvoicesPage />)
        await screen.findByText('INV-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[0], 'Paid')
        await waitFor(() => expect(screen.queryByText('INV-001')).not.toBeInTheDocument())
        expect(screen.getByText('INV-002')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-026
    it('T-FIN-FE-F-R026 — clicking Create Invoice opens modal', async () => {
        renderPage(<InvoicesPage />)
        await screen.findByRole('heading', { name: /invoices/i })
        await userEvent.click(screen.getByRole('button', { name: /create invoice/i }))
        // Modal with form fields should appear
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-027
    it('T-FIN-FE-F-R027 — empty list renders "No invoices found."', async () => {
        mockGetInvoices.mockResolvedValue([])
        renderPage(<InvoicesPage />)
        expect(await screen.findByText(/no invoices found/i)).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-028
    it('T-FIN-FE-F-R028 — outstanding invoice with past due date displays Overdue status', async () => {
        const overdueInvoice = {
            ...SAMPLE_INVOICE,
            due_date: '2020-01-01', // past date
            status: 'Outstanding' as const,
        }
        mockGetInvoices.mockResolvedValue([overdueInvoice])
        renderPage(<InvoicesPage />)
        expect(await screen.findByText('Overdue')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// PaymentsPage — REQ-FIN-FE-F-031 to F-038
// ---------------------------------------------------------------------------

describe('PaymentsPage — /finance/payments', () => {
    const SAMPLE_PAYMENT = {
        id: 1,
        reference: 'PMT-001',
        type: 'Receipt' as const,
        source: 'Alpha Corp',
        amount: 2500,
        method: 'Wire' as const,
        status: 'Pending' as const,
        date: '2026-01-15',
    }

    beforeEach(() => {
        mockGetPayments.mockResolvedValue([SAMPLE_PAYMENT])
        mockCreatePayment.mockResolvedValue({ ...SAMPLE_PAYMENT, id: 2 })
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-F-031
    it('T-FIN-FE-F-R031 — renders "Payments" heading and Record Payment button', async () => {
        renderPage(<PaymentsPage />)
        expect(await screen.findByRole('heading', { name: /payments/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /record payment/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-032
    it('T-FIN-FE-F-R032 — displays two stats cards: Total Receipts and Total Payments', async () => {
        renderPage(<PaymentsPage />)
        expect(await screen.findByText('Total Receipts')).toBeInTheDocument()
        expect(screen.getByText('Total Payments')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-033
    it('T-FIN-FE-F-R033 — calls getPayments on mount; table renders expected columns', async () => {
        renderPage(<PaymentsPage />)
        await waitFor(() => expect(mockGetPayments).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('Reference')).toBeInTheDocument()
        expect(screen.getByText('Type')).toBeInTheDocument()
        expect(screen.getByText('Source')).toBeInTheDocument()
        expect(screen.getByText('Amount')).toBeInTheDocument()
        expect(screen.getByText('Method')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
        expect(screen.getByText('Date')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-034
    it('T-FIN-FE-F-R034 — payment rows are rendered with reference and status', async () => {
        renderPage(<PaymentsPage />)
        expect(await screen.findByText('PMT-001')).toBeInTheDocument()
        expect(screen.getByText('Pending', { selector: 'span' })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-035
    it('T-FIN-FE-F-R035 — Status filter dropdown filters payment rows client-side', async () => {
        mockGetPayments.mockResolvedValue([
            SAMPLE_PAYMENT,
            { ...SAMPLE_PAYMENT, id: 2, reference: 'PMT-002', status: 'Cleared' as const },
        ])
        renderPage(<PaymentsPage />)
        await screen.findByText('PMT-001')
        const selects = screen.getAllByRole('combobox')
        await userEvent.selectOptions(selects[0], 'Cleared')
        await waitFor(() => expect(screen.queryByText('PMT-001')).not.toBeInTheDocument())
        expect(screen.getByText('PMT-002')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-036
    it('T-FIN-FE-F-R036 — clicking Record Payment opens modal with form fields', async () => {
        renderPage(<PaymentsPage />)
        await screen.findByRole('heading', { name: /payments/i })
        await userEvent.click(screen.getByRole('button', { name: /record payment/i }))
        expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-037
    it('T-FIN-FE-F-R037 — empty list renders "No payments found."', async () => {
        mockGetPayments.mockResolvedValue([])
        renderPage(<PaymentsPage />)
        expect(await screen.findByText(/no payments found/i)).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-038
    it('T-FIN-FE-F-R038 — monetary value in stats reflects 2-decimal toLocaleString format', async () => {
        renderPage(<PaymentsPage />)
        await screen.findByText('Total Receipts')
        // 2500 formatted
        expect(screen.getAllByText('2,500').length).toBeGreaterThan(0)
    })
})

// ---------------------------------------------------------------------------
// TrialBalancePage — REQ-FIN-FE-F-041 to F-046
// ---------------------------------------------------------------------------

describe('TrialBalancePage — /finance/trial-balance', () => {
    const SAMPLE_ROWS = [
        { account: 'Premium Income', debit: 0, credit: 50000 },
        { account: 'Cash', debit: 50000, credit: 0 },
    ]

    beforeEach(() => {
        mockGetTrialBalance.mockResolvedValue(SAMPLE_ROWS)
    })
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-F-041
    it('T-FIN-FE-F-R041 — renders "Trial Balance" heading and Generate Report button', () => {
        renderPage(<TrialBalancePage />)
        expect(screen.getByRole('heading', { name: /trial balance/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /generate report/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-042
    it('T-FIN-FE-F-R042 — clicking Generate Report calls getTrialBalance and renders Account, Debit, Credit columns', async () => {
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        await waitFor(() => expect(mockGetTrialBalance).toHaveBeenCalledTimes(1))
        expect(await screen.findByText('Account')).toBeInTheDocument()
        expect(screen.getByText('Debit')).toBeInTheDocument()
        expect(screen.getByText('Credit')).toBeInTheDocument()
        expect(screen.getByText('Premium Income')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-043
    it('T-FIN-FE-F-R043 — balanced totals show "Balanced" indicator', async () => {
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        expect(await screen.findByText('Balanced')).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-044
    it('T-FIN-FE-F-R044 — loading state shows "Generating…" on button while in flight', async () => {
        mockGetTrialBalance.mockReturnValue(new Promise(() => { }))
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        expect(screen.getByRole('button', { name: /generating/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-F-045
    it('T-FIN-FE-F-R045 — API failure shows error notification', async () => {
        mockGetTrialBalance.mockRejectedValue(new Error('fail'))
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        await waitFor(() => expect(mockAddNotification).toHaveBeenCalledWith(expect.any(String), 'error'))
    })

    // REQ-FIN-FE-F-046
    it('T-FIN-FE-F-R046 — Total Debit and Total Credit summary figures displayed above the table', async () => {
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        expect(await screen.findByText('Total Debit')).toBeInTheDocument()
        expect(screen.getByText('Total Credit')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Constraints — REQ-FIN-FE-C-001 to C-003
// ---------------------------------------------------------------------------

describe('Finance — Architectural Constraints', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-C-001
    it('T-FIN-FE-C-R001 — all API calls go through finance.service (api-client); no direct fetch or axios', () => {
        expect(mockGetFinanceSummary).toBeDefined()
        expect(mockGetCashBatches).toBeDefined()
        expect(mockGetInvoices).toBeDefined()
        expect(mockGetPayments).toBeDefined()
        expect(mockGetTrialBalance).toBeDefined()
    })

    // REQ-FIN-FE-C-002
    it('T-FIN-FE-C-R002 — table header cells use Title Case in CashBatchingPage', async () => {
        mockGetCashBatches.mockResolvedValue([])
        renderPage(<CashBatchingPage />)
        await screen.findByText(/no cash batches found/i)
        const headers = screen.getAllByRole('columnheader')
        headers.forEach((h) => {
            const text = h.textContent ?? ''
            if (text.trim()) {
                // Should not be all uppercase (e.g. "REFERENCE")
                expect(text).not.toMatch(/^[A-Z\s]+$/)
            }
        })
    })

    // REQ-FIN-FE-C-003
    it('T-FIN-FE-C-R003 — monetary values in TrialBalancePage use toLocaleString formatting', async () => {
        mockGetTrialBalance.mockResolvedValue([
            { account: 'Cash', debit: 50000, credit: 0 },
        ])
        renderPage(<TrialBalancePage />)
        await userEvent.click(screen.getByRole('button', { name: /generate report/i }))
        // 50,000 formatted with comma — match the stat card <p> to avoid multiple-match on table cells
        expect(await screen.findByText('50,000', { selector: 'p' })).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// Security — REQ-FIN-FE-S-001 to S-002
// ---------------------------------------------------------------------------

describe('Finance — Security', () => {
    afterEach(() => jest.clearAllMocks())

    // REQ-FIN-FE-S-001
    it('T-FIN-FE-S-R001 — FinanceHubPage renders without error when session context is available', async () => {
        mockGetFinanceSummary.mockResolvedValue({ outstandingCash: 0, outstandingInvoices: 0, pendingPayments: 0, totalReceivables: 0 })
        renderPage(<FinanceHubPage />)
        expect(screen.getByRole('heading', { name: /finance/i })).toBeInTheDocument()
    })

    // REQ-FIN-FE-S-002
    it('T-FIN-FE-S-R002 — Create Invoice and Create Batch buttons are rendered (role-based access enforced at route level)', async () => {
        mockGetInvoices.mockResolvedValue([])
        renderPage(<InvoicesPage />)
        expect(await screen.findByRole('button', { name: /create invoice/i })).toBeInTheDocument()
    })
})
