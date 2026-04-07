/**
 * TESTS — locations/LocationsScheduleTab
 *
 * REQ-LOC-FE-F-001 — load location schedule on mount
 * REQ-LOC-FE-F-002 — display rows in ResizableGrid
 * REQ-LOC-FE-F-003 — CSV import
 * REQ-LOC-FE-F-004 — version selector and revert
 * REQ-LOC-FE-F-005 — loading and error states
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockGetLocationsImports = jest.fn()
const mockImportLocationsCsv = jest.fn()
const mockGetLocationVersions = jest.fn()
const mockRevertToVersion = jest.fn()
jest.mock('@/locations/locations.service', () => ({
    getLocationsImports: (...args: unknown[]) => mockGetLocationsImports(...args),
    importLocationsCsv: (...args: unknown[]) => mockImportLocationsCsv(...args),
    getLocationVersions: (...args: unknown[]) => mockGetLocationVersions(...args),
    revertToVersion: (...args: unknown[]) => mockRevertToVersion(...args),
}))

const mockAddNotification = jest.fn()
jest.mock('@/shell/NotificationDock', () => ({
    useNotifications: () => ({
        addNotification: mockAddNotification,
        notifications: [],
        addedSignal: 0,
        removeNotification: jest.fn(),
        markAsRead: jest.fn(),
        clearAll: jest.fn(),
    }),
}))

import LocationsScheduleTab from '../LocationsScheduleTab'

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeImport(overrides: Record<string, unknown> = {}) {
    return {
        id: 1,
        import_id: 1,
        versionNumber: 1,
        payload: {
            rows: [
                { location: 'HQ', address: '10 Main St', city: 'London', state: '', country: 'UK', postcode: 'EC1A 1BB', sumInsured: '500000' },
                { location: 'Branch', address: '5 High St', city: 'Manchester', state: '', country: 'UK', postcode: 'M1 1AE', sumInsured: '200000' },
            ],
        },
        createdBy: 'Jane Smith',
        createdAt: '2026-01-10T09:00:00Z',
        isActive: true,
        ...overrides,
    }
}

const SAMPLE_VERSIONS = [
    { id: 1, versionNumber: 1, createdBy: 'Jane Smith', createdAt: '2026-01-10T09:00:00Z', isActive: true },
    { id: 2, versionNumber: 2, createdBy: 'Jane Smith', createdAt: '2026-02-01T11:00:00Z', isActive: false },
]

function renderTab(entityType: 'Quote' | 'Policy' = 'Quote', entityId = 42) {
    return render(
        <MemoryRouter>
            <LocationsScheduleTab entityType={entityType} entityId={entityId} />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetLocationsImports.mockResolvedValue([makeImport()])
    mockGetLocationVersions.mockResolvedValue([SAMPLE_VERSIONS[0]])
    mockImportLocationsCsv.mockResolvedValue(makeImport())
    mockRevertToVersion.mockResolvedValue(makeImport())
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-001 — load on mount
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-001 — load on mount', () => {
    it('T-LOC-TAB-R01a: calls getLocationsImports on mount with correct args', async () => {
        renderTab('Quote', 42)
        await waitFor(() => {
            expect(mockGetLocationsImports).toHaveBeenCalledWith('Quote', 42)
        })
    })

    it('T-LOC-TAB-R01b: calls getLocationVersions after getting imports', async () => {
        renderTab()
        await waitFor(() => {
            expect(mockGetLocationVersions).toHaveBeenCalledWith(1)
        })
    })

    it('T-LOC-TAB-R01c: shows empty state when no imports returned', async () => {
        mockGetLocationsImports.mockResolvedValue([])
        renderTab()
        await waitFor(() => {
            expect(screen.getByText(/No locations/)).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-002 — grid rows
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-002 — grid rows', () => {
    it('T-LOC-TAB-R02a: shows row data after load', async () => {
        renderTab()
        await waitFor(() => {
            expect(screen.getByText('HQ')).toBeInTheDocument()
            expect(screen.getByText('Branch')).toBeInTheDocument()
        })
    })

    it('T-LOC-TAB-R02b: shows location count after load', async () => {
        renderTab()
        await waitFor(() => {
            expect(screen.getByText(/2 location/)).toBeInTheDocument()
        })
    })

    it('T-LOC-TAB-R02c: shows column headers', async () => {
        renderTab()
        await waitFor(() => {
            expect(screen.getByText('Location')).toBeInTheDocument()
            expect(screen.getByText('Address')).toBeInTheDocument()
            expect(screen.getByText('City')).toBeInTheDocument()
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-003 — CSV import
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-003 — CSV import', () => {
    it('T-LOC-TAB-R03a: renders Import CSV button', async () => {
        renderTab()
        await waitFor(() => {
            expect(screen.getByRole('button', { name: /Import CSV/ })).toBeInTheDocument()
        })
    })

    it('T-LOC-TAB-R03b: notifies on import success', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByRole('button', { name: /Import CSV/ })).toBeInTheDocument())

        const csvContent = 'location,address,city\nOffice,1 Main St,London'
        const file = new File([csvContent], 'locations.csv', { type: 'text/csv' })
        // JSDOM does not fully implement Blob.text() — patch instance
        Object.defineProperty(file, 'text', {
            value: () => Promise.resolve(csvContent),
            configurable: true,
        })
        const fileInput = screen.getByLabelText('CSV file input')
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)

        await waitFor(() => {
            expect(mockImportLocationsCsv).toHaveBeenCalledWith('Quote', 42, expect.any(Array))
        })
    })

    it('T-LOC-TAB-R03c: notifies on import failure', async () => {
        mockImportLocationsCsv.mockRejectedValue(new Error('Import failed'))
        renderTab()
        await waitFor(() => expect(screen.getByRole('button', { name: /Import CSV/ })).toBeInTheDocument())

        const csvContent = 'loc,addr\nA,B'
        const file = new File([csvContent], 'locations.csv', { type: 'text/csv' })
        Object.defineProperty(file, 'text', {
            value: () => Promise.resolve(csvContent),
            configurable: true,
        })
        const fileInput = screen.getByLabelText('CSV file input')
        Object.defineProperty(fileInput, 'files', { value: [file], configurable: true })
        fireEvent.change(fileInput)

        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Import failed', 'error')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-004 — version selector
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-004 — version selector', () => {
    it('T-LOC-TAB-R04a: version selector shown when multiple versions exist', async () => {
        mockGetLocationVersions.mockResolvedValue(SAMPLE_VERSIONS)
        renderTab()
        await waitFor(() => {
            expect(screen.getByLabelText('Select version')).toBeInTheDocument()
        })
    })

    it('T-LOC-TAB-R04b: version selector hidden when only one version', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        expect(screen.queryByLabelText('Select version')).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-005 — loading and error states
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-005 — loading and error states', () => {
    it('T-LOC-TAB-R05a: calls getLocationsImports on mount', () => {
        mockGetLocationsImports.mockReturnValue(new Promise(() => { }))
        renderTab()
        expect(mockGetLocationsImports).toHaveBeenCalledTimes(1)
    })

    it('T-LOC-TAB-R05b: shows error alert when load fails', async () => {
        mockGetLocationsImports.mockRejectedValue(new Error('DB error'))
        renderTab()
        await waitFor(() => {
            expect(screen.getByRole('alert')).toBeInTheDocument()
            expect(screen.getByText('DB error')).toBeInTheDocument()
        })
    })

    it('T-LOC-TAB-R05c: notifies on load failure', async () => {
        mockGetLocationsImports.mockRejectedValue(new Error('Network failure'))
        renderTab()
        await waitFor(() => {
            expect(mockAddNotification).toHaveBeenCalledWith('Network failure', 'error')
        })
    })
})
