/**
 * TESTS — shared/components/TabsNav
 *
 * Requirements: ../requirements.md
 * Test ID format: T-SHARED-TABS-R[NN]
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import TabsNav from '../TabsNav'
import type { TabItem } from '../TabsNav'

const TABS: TabItem[] = [
    { key: 'details', label: 'Details' },
    { key: 'sections', label: 'Sections' },
    { key: 'audit', label: 'Audit' },
]

describe('TabsNav', () => {
    // REQ-SHARED-TABS-F-001
    test('T-SHARED-TABS-R01 — renders one button per tab entry', () => {
        render(<TabsNav tabs={TABS} activeTab="details" onChange={() => { }} />)
        expect(screen.getAllByRole('button')).toHaveLength(3)
        expect(screen.getByText('Details')).toBeInTheDocument()
        expect(screen.getByText('Sections')).toBeInTheDocument()
        expect(screen.getByText('Audit')).toBeInTheDocument()
    })

    // REQ-SHARED-TABS-F-002
    test('T-SHARED-TABS-R02 — active tab has brand-500 border class; inactive does not', () => {
        render(<TabsNav tabs={TABS} activeTab="sections" onChange={() => { }} />)
        expect(screen.getByTestId('tab-sections')).toHaveClass('border-brand-500')
        expect(screen.getByTestId('tab-details')).not.toHaveClass('border-brand-500')
    })

    // REQ-SHARED-TABS-F-003
    test('T-SHARED-TABS-R03 — onChange is called with the tab key on click', () => {
        const onChange = jest.fn()
        render(<TabsNav tabs={TABS} activeTab="details" onChange={onChange} />)
        fireEvent.click(screen.getByTestId('tab-audit'))
        expect(onChange).toHaveBeenCalledWith('audit')
    })

    // REQ-SHARED-TABS-F-004
    test('T-SHARED-TABS-R04 — each button has data-testid="tab-{key}"', () => {
        render(<TabsNav tabs={TABS} activeTab="details" onChange={() => { }} />)
        expect(screen.getByTestId('tab-details')).toBeInTheDocument()
        expect(screen.getByTestId('tab-sections')).toBeInTheDocument()
        expect(screen.getByTestId('tab-audit')).toBeInTheDocument()
    })
})
