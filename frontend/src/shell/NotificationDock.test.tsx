/**
 * TESTS � app/AppLayout/NotificationDock (context + bell button)
 * Second artifact. Requirements: app/AppLayout/notification-dock.requirements.md
 * Test ID format: T-NotificationDock-R[NN]
 * Run: npx jest --config jest.config.js --testPathPattern=NotificationDock
 */

import React, { act } from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { NotificationProvider, NotificationDock, useNotifications } from './NotificationDock'
import type { AppNotification } from '@/shared/lib/notifications/notifications'

// ---------------------------------------------------------------------------
// Mock the notifications service so no real HTTP calls happen
// ---------------------------------------------------------------------------

jest.mock('@/shared/lib/notifications/notifications', () => ({
    fetchNotifications: jest.fn().mockResolvedValue([]),
    createNotification: jest.fn().mockResolvedValue({ id: 99, message: 'mock', type: 'info' }),
    deleteNotification: jest.fn().mockResolvedValue(undefined),
    markNotificationRead: jest.fn().mockResolvedValue(undefined),
    bulkDeleteNotifications: jest.fn().mockResolvedValue(undefined),
}))

import * as notifService from '@/shared/lib/notifications/notifications'
const mockFetch = notifService.fetchNotifications as jest.Mock
const mockCreate = notifService.createNotification as jest.Mock
const mockDelete = notifService.deleteNotification as jest.Mock

beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockResolvedValue([])
})

// ---------------------------------------------------------------------------
// Helper: renders NotificationDock inside NotificationProvider
// ---------------------------------------------------------------------------

function DockWithProvider() {
    return (
        <NotificationProvider>
            <NotificationDock />
        </NotificationProvider>
    )
}

// ---------------------------------------------------------------------------
// R02 � Bell button always visible
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R02: bell button always visible', () => {
    it('renders the bell button with no notifications', async () => {
        render(<DockWithProvider />)
        await waitFor(() =>
            expect(screen.getByTitle('Notifications')).toBeInTheDocument()
        )
    })
})

// ---------------------------------------------------------------------------
// R03 � Badge count
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R03: badge count', () => {
    it('shows a badge with count when notifications are present', async () => {
        const items: AppNotification[] = [
            { id: 1, message: 'A', type: 'info' },
            { id: 2, message: 'B', type: 'info' },
        ]
        mockFetch.mockResolvedValue(items)
        render(<DockWithProvider />)
        await waitFor(() => expect(screen.getByText('2')).toBeInTheDocument())
    })

    it('does not render a badge when the list is empty', async () => {
        mockFetch.mockResolvedValue([])
        render(<DockWithProvider />)
        // Wait for mount to settle
        await waitFor(() =>
            expect(screen.queryByRole('status')).not.toBeInTheDocument()
        )
    })
})

// ---------------------------------------------------------------------------
// R04 � Bell severity colour
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R04: bell severity colour', () => {
    it('applies error (red) styling when any notification is an error', async () => {
        mockFetch.mockResolvedValue([{ id: 1, message: 'Oops', type: 'error' }])
        render(<DockWithProvider />)
        await waitFor(() => {
            const bell = screen.getByTitle('Notifications')
            expect(bell.className).toMatch(/red/)
        })
    })

    it('applies neutral styling when all notifications are info', async () => {
        mockFetch.mockResolvedValue([{ id: 1, message: 'FYI', type: 'info' }])
        render(<DockWithProvider />)
        await waitFor(() => {
            const bell = screen.getByTitle('Notifications')
            expect(bell.className).not.toMatch(/red/)
            expect(bell.className).not.toMatch(/yellow/)
            expect(bell.className).not.toMatch(/green-5/)
        })
    })
})

// ---------------------------------------------------------------------------
// R05 � Manual toggle
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R05: manual toggle', () => {
    it('clicking bell opens the notification panel', async () => {
        mockFetch.mockResolvedValue([{ id: 1, message: 'Hello', type: 'info' }])
        render(<DockWithProvider />)
        await waitFor(() => screen.getByTitle('Notifications'))
        fireEvent.click(screen.getByTitle('Notifications'))
        expect(screen.getByText('Notifications')).toBeInTheDocument()
        expect(screen.getByText('Hello')).toBeInTheDocument()
    })

    it('clicking bell again closes the panel', async () => {
        mockFetch.mockResolvedValue([{ id: 1, message: 'Hello', type: 'info' }])
        render(<DockWithProvider />)
        await waitFor(() => screen.getByTitle('Notifications'))
        const bell = screen.getByTitle('Notifications')
        fireEvent.click(bell) // open
        fireEvent.click(bell) // close
        expect(screen.queryByText('Hello')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R06 + R07 � Auto-open and auto-close with fake timers
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R06/R07: auto-open and auto-close', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('auto-opens the panel when a new notification is added programmatically', async () => {
        let addFn: ((m: string, t?: string) => Promise<void>) | undefined
        function Probe() {
            const { addNotification } = useNotifications()
            addFn = addNotification as typeof addFn
            return null
        }
        mockFetch.mockResolvedValue([])
        mockCreate.mockResolvedValue({ id: 10, message: 'New one', type: 'info' })
        render(
            <NotificationProvider>
                <Probe />
                <NotificationDock />
            </NotificationProvider>
        )
        await act(async () => { })
        await act(async () => { await addFn!('New one', 'info') })
        expect(screen.queryByRole('heading', { name: /notifications/i })).toBeInTheDocument()
    })

    it('auto-closes after 5 seconds', async () => {
        let addFn: ((m: string, t?: string) => Promise<void>) | undefined
        function Probe() {
            const { addNotification } = useNotifications()
            addFn = addNotification as typeof addFn
            return null
        }
        mockFetch.mockResolvedValue([])
        mockCreate.mockResolvedValue({ id: 11, message: 'Temp', type: 'info' })
        render(
            <NotificationProvider>
                <Probe />
                <NotificationDock />
            </NotificationProvider>
        )
        await act(async () => { })
        await act(async () => { await addFn!('Temp', 'info') })
        act(() => jest.advanceTimersByTime(5100))
        // Panel should have closed
        expect(screen.queryByText('Temp')).not.toBeInTheDocument()
    })

    it('keeps warning notifications open until the user dismisses them', async () => {
        let addFn: ((m: string, t?: string) => Promise<void>) | undefined
        function Probe() {
            const { addNotification } = useNotifications()
            addFn = addNotification as typeof addFn
            return null
        }
        mockFetch.mockResolvedValue([])
        mockCreate.mockResolvedValue({ id: 12, message: 'Locked by Alex Underwriter', type: 'warning' })
        render(
            <NotificationProvider>
                <Probe />
                <NotificationDock />
            </NotificationProvider>
        )
        await act(async () => { })
        await act(async () => { await addFn!('Locked by Alex Underwriter', 'warning') })
        act(() => jest.advanceTimersByTime(5100))
        expect(screen.getByText('Locked by Alex Underwriter')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// R01 � Context provides operations
// ---------------------------------------------------------------------------

describe('T-NotificationDock-R01: context provides notification operations', () => {
    it('useNotifications returns required fields', async () => {
        let ctx: ReturnType<typeof useNotifications> | undefined
        function Probe() {
            ctx = useNotifications()
            return null
        }
        render(
            <NotificationProvider>
                <Probe />
            </NotificationProvider>
        )
        await waitFor(() => {
            expect(ctx).toBeDefined()
            expect(typeof ctx!.addNotification).toBe('function')
            expect(typeof ctx!.removeNotification).toBe('function')
            expect(typeof ctx!.markAsRead).toBe('function')
            expect(typeof ctx!.clearAll).toBe('function')
            expect(Array.isArray(ctx!.notifications)).toBe(true)
        })
    })
})
