/**
 * Finance Domain — Service Layer
 *
 * Requirements: frontend/src/finance/finance.requirements.md
 * Tests: frontend/src/finance/__tests__/finance.test.tsx
 *
 * REQ-FIN-FE-C-001 — all API calls via @/shared/lib/api-client/api-client
 */

import { get, post, put } from '@/shared/lib/api-client/api-client'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface FinanceSummary {
    outstandingCash: number
    outstandingInvoices: number
    pendingPayments: number
    totalReceivables: number
}

export type CashBatchStatus = 'Open' | 'Partial' | 'Closed'

export interface CashBatch {
    id: number
    reference: string
    amount: number
    currency: string
    allocated: number
    remaining: number
    status: CashBatchStatus
    assigned_to?: string | null
    created_date?: string | null
}

export interface CreateCashBatchInput {
    amount: number
    currency: string
    reference: string
    assigned_to?: string | null
}

export type InvoiceStatus = 'Outstanding' | 'Paid' | 'Overdue' | 'Cancelled'
export type InvoiceType = 'Premium' | 'Claim' | 'Commission'

export interface Invoice {
    id: number
    reference: string
    type: InvoiceType
    policy_reference?: string | null
    policy_id?: number | null
    insured_name?: string | null
    amount: number
    outstanding: number
    status: InvoiceStatus
    due_date?: string | null
    issue_date?: string | null
    currency?: string | null
}

export interface CreateInvoiceInput {
    type: InvoiceType
    policy_reference?: string | null
    insured_name?: string | null
    amount: number
    due_date?: string | null
    currency?: string | null
}

export type PaymentStatus = 'Pending' | 'Cleared' | 'Failed' | 'Reversed'
export type PaymentType = 'Receipt' | 'Payment'
export type PaymentMethod = 'Wire' | 'Cheque' | 'BACS' | 'Direct Debit'

export interface Payment {
    id: number
    reference: string
    type: PaymentType
    source?: string | null
    amount: number
    currency?: string | null
    method?: PaymentMethod | null
    status: PaymentStatus
    date?: string | null
}

export interface CreatePaymentInput {
    type: PaymentType
    source?: string | null
    amount: number
    currency?: string | null
    method?: PaymentMethod | null
    date?: string | null
}

export interface TrialBalanceRow {
    account: string
    debit: number
    credit: number
}

// ---------------------------------------------------------------------------
// API adapters
// ---------------------------------------------------------------------------

export async function getFinanceSummary(): Promise<FinanceSummary> {
    return get<FinanceSummary>('/api/finance/summary')
}

export async function getCashBatches(): Promise<CashBatch[]> {
    return get<CashBatch[]>('/api/finance/cash-batches')
}

export async function createCashBatch(input: CreateCashBatchInput): Promise<CashBatch> {
    return post<CashBatch>('/api/finance/cash-batches', input)
}

export async function updateCashBatch(id: number, patch: Partial<CashBatch>): Promise<CashBatch> {
    return put<CashBatch>(`/api/finance/cash-batches/${id}`, patch)
}

export async function getInvoices(): Promise<Invoice[]> {
    return get<Invoice[]>('/api/finance/invoices')
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
    return post<Invoice>('/api/finance/invoices', input)
}

export async function updateInvoice(id: number, patch: Partial<Invoice>): Promise<Invoice> {
    return put<Invoice>(`/api/finance/invoices/${id}`, patch)
}

export async function getPayments(): Promise<Payment[]> {
    return get<Payment[]>('/api/finance/payments')
}

export async function createPayment(input: CreatePaymentInput): Promise<Payment> {
    return post<Payment>('/api/finance/payments', input)
}

export async function getTrialBalance(): Promise<TrialBalanceRow[]> {
    return get<TrialBalanceRow[]>('/api/finance/trial-balance')
}
