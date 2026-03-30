/**
 * FieldGroup — <fieldset> wrapper with optional <legend> title.
 *
 * Requirements: requirements.md
 * Tests: __tests__/FieldGroup.test.tsx
 *
 * REQ-SHARED-FG-F-001 — legend when title is provided
 * REQ-SHARED-FG-F-002 — no legend when title is absent
 * REQ-SHARED-FG-F-003 — children rendered inside fieldset
 * REQ-SHARED-FG-C-001 — fieldset has border, rounded, bg-white classes
 */

import React from 'react'

interface FieldGroupProps {
    title?: string
    children: React.ReactNode
}

export default function FieldGroup({ title, children }: FieldGroupProps) {
    return (
        <fieldset className="border border-gray-300 rounded-md p-3 bg-white">
            {title && (
                <legend className="px-1 text-xs font-semibold text-gray-700 select-none">
                    {title}
                </legend>
            )}
            {children}
        </fieldset>
    )
}
