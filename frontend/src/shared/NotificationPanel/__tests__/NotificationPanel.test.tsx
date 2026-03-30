/**
 * TESTS — components/NotificationPanel
 * Second artifact. Requirements: components/NotificationPanel/requirements.md
 * Test ID format: T-NotificationPanel-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=components/NotificationPanel
 */

import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import NotificationPanel from '../NotificationPanel'
import type { AppNotification } from '@/shared/lib/notifications/notifications'

const onRemove = jest.fn()
const onClearAll = jest.fn()
const onClose = jest.fn()

beforeEach(() => jest.clearAllMocks())

const baseProps = { onRemove, onClearAll, onClose }

const info: AppNotification = { id: 1, message: 'Info msg', type: 'info' }
const warning: AppNotification = { id: 2, message: 'Warning msg', type: 'warning' }
const error: AppNotification = { id: 3, message: 'Error msg', type: 'error' }
const success: AppNotification = { id: 4, message: 'Success msg', type: 'success' }

// ---------------------------------------------------------------------------
// R01 — Empty state
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R01: empty state', () => {
    it('renders "No notifications" when list is empty', () => {
        render(<NotificationPanel notifications={[]} {...baseProps} />)
        expect(screen.getByText('No notifications')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R02 — Notification list
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R02: notification list', () => {
    it('renders each notification message', () => {
        render(
            <NotificationPanel notifications={[info, warning]} {...baseProps} />
        )
        expect(screen.getByText('Info msg')).toBeInTheDocument()
        expect(screen.getByText('Warning msg')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R03 — Type-based styling
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R03: type-based styling', () => {
    it('panel header is red when any notification is an error', () => {
        render(
            <NotificationPanel notifications={[error]} {...baseProps} />
        )
        const heading = screen.getByText('Notifications')
        expect(heading.className).toMatch(/red/)
    })

    it('panel header is not red when there are no errors', () => {
        render(
            <NotificationPanel notifications={[info]} {...baseProps} />
        )
        const heading = screen.getByText('Notifications')
        expect(heading.className).not.toMatch(/red/)
    })
})

// ---------------------------------------------------------------------------
// R04 — Per-item dismiss
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R04: per-item dismiss', () => {
    it('calls onRemove with the notification id when × is clicked', () => {
        render(<NotificationPanel notifications={[info]} {...baseProps} />)
        // Each item has a ×  dismiss button
        const dismissButtons = screen.getAllByRole('button', { name: '×' })
        fireEvent.click(dismissButtons[0])
        expect(onRemove).toHaveBeenCalledWith(info.id)
    })
})

// ---------------------------------------------------------------------------
// R05 — Clear all
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R05: clear all button', () => {
    it('calls onClearAll when Clear is clicked and list is non-empty', () => {
        render(<NotificationPanel notifications={[info]} {...baseProps} />)
        fireEvent.click(screen.getByRole('button', { name: /clear/i }))
        expect(onClearAll).toHaveBeenCalledTimes(1)
    })

    it('does not call onClearAll when list is empty', () => {
        render(<NotificationPanel notifications={[]} {...baseProps} />)
        const clearBtn = screen.getByRole('button', { name: /clear/i })
        fireEvent.click(clearBtn)
        expect(onClearAll).not.toHaveBeenCalled()
    })

    it('Clear button is disabled when list is empty', () => {
        render(<NotificationPanel notifications={[]} {...baseProps} />)
        expect(screen.getByRole('button', { name: /clear/i })).toBeDisabled()
    })
})

// ---------------------------------------------------------------------------
// R06 — Close button
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R06: close button', () => {
    it('calls onClose when the X icon button is clicked', () => {
        render(<NotificationPanel notifications={[]} {...baseProps} />)
        // The close button wraps the X icon; use title or aria-label
        fireEvent.click(screen.getByTitle('Close'))
        expect(onClose).toHaveBeenCalledTimes(1)
    })
})

// ---------------------------------------------------------------------------
// R07 — Action buttons
// ---------------------------------------------------------------------------

describe('T-NotificationPanel-R07: action buttons', () => {
    it('renders action buttons when notification has actions array', () => {
        const actionMock = jest.fn()
        const withActions: AppNotification = {
            id: 10,
            message: 'Has actions',
            type: 'info',
            payload: {
                actions: [
                    { label: 'Retry', onClick: actionMock },
                    { label: 'Dismiss', onClick: jest.fn(), variant: 'danger' },
                ],
            },
        }
        render(<NotificationPanel notifications={[withActions]} {...baseProps} />)
        expect(screen.getByText('Retry')).toBeInTheDocument()
        expect(screen.getByText('Dismiss')).toBeInTheDocument()
    })

    it('calls action onClick when action button is clicked', () => {
        const actionMock = jest.fn()
        const withAction: AppNotification = {
            id: 11,
            message: 'Clickable',
            type: 'info',
            payload: { actions: [{ label: 'Go', onClick: actionMock }] },
        }
        render(<NotificationPanel notifications={[withAction]} {...baseProps} />)
        fireEvent.click(screen.getByText('Go'))
        expect(actionMock).toHaveBeenCalledTimes(1)
    })
})
