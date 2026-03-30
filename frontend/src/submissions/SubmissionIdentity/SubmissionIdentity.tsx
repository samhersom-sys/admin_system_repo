/**
 * SubmissionIdentity — displays system-managed reference and status.
 *
 * Requirements: requirements.md
 * Tests: test.tsx
 */

import React from 'react'
import type { SubmissionStatus } from '@/submissions/submissions.service'
import './SubmissionIdentity.css'

// ---------------------------------------------------------------------------
// Status → colour class mapping (R02)
// ---------------------------------------------------------------------------
function statusClass(status: SubmissionStatus): string {
    switch (status) {
        case 'Created':
        case 'In Review':
            return 'status--blue'
        case 'Outstanding':
            return 'status--amber'
        case 'Declined':
            return 'status--red'
        case 'Quote Created':
        case 'Quoted':
            return 'status--green'
        case 'Bound':
            return 'status--dark-green'
        default:
            return 'status--blue'
    }
}

// ---------------------------------------------------------------------------
// Props (R03)
// ---------------------------------------------------------------------------
export interface SubmissionIdentityProps {
    reference: string
    status: SubmissionStatus
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SubmissionIdentity({ reference, status }: SubmissionIdentityProps) {
    return (
        <div className="flex flex-wrap items-center gap-6">
            {/* R01 — Reference */}
            <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                    Reference
                </p>
                <span
                    data-testid="sub-reference"
                    className="text-sm font-mono font-semibold text-gray-800"
                >
                    {reference || 'Generating…'}
                </span>
            </div>

            {/* R02 — Status */}
            <div>
                <p className="text-xs font-medium text-gray-500 mb-0.5">
                    Status
                </p>
                <span
                    data-testid="sub-status"
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusClass(status)}`}
                >
                    {status}
                </span>
            </div>
        </div>
    )
}
