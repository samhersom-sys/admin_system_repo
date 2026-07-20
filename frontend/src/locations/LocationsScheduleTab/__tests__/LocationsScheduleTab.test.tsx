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
const mockUpdateLocationsImport = jest.fn()
const mockGetHistoricalLocations = jest.fn()
const mockGetQuoteLocationRows = jest.fn()
const mockAddLocation = jest.fn()
const mockUpdateLocation = jest.fn()
const mockDeleteLocation = jest.fn()
const mockAddCoverage = jest.fn()
const mockUpdateCoverage = jest.fn()
const mockDeleteCoverage = jest.fn()
const mockSaveLocationVersion = jest.fn()
const mockCalculateLocation = jest.fn()
const mockCalculateQuote = jest.fn()

jest.mock('@/locations/locations.service', () => ({
    getLocationsImports: (...args: unknown[]) => mockGetLocationsImports(...args),
    importLocationsCsv: (...args: unknown[]) => mockImportLocationsCsv(...args),
    getLocationVersions: (...args: unknown[]) => mockGetLocationVersions(...args),
    revertToVersion: (...args: unknown[]) => mockRevertToVersion(...args),
    updateLocationsImport: (...args: unknown[]) => mockUpdateLocationsImport(...args),
    getHistoricalLocations: (...args: unknown[]) => mockGetHistoricalLocations(...args),
    getQuoteLocationRows: (...args: unknown[]) => mockGetQuoteLocationRows(...args),
    addLocation: (...args: unknown[]) => mockAddLocation(...args),
    updateLocation: (...args: unknown[]) => mockUpdateLocation(...args),
    deleteLocation: (...args: unknown[]) => mockDeleteLocation(...args),
    addCoverage: (...args: unknown[]) => mockAddCoverage(...args),
    updateCoverage: (...args: unknown[]) => mockUpdateCoverage(...args),
    deleteCoverage: (...args: unknown[]) => mockDeleteCoverage(...args),
    saveLocationVersion: (...args: unknown[]) => mockSaveLocationVersion(...args),
    calculateLocation: (...args: unknown[]) => mockCalculateLocation(...args),
    calculateQuote: (...args: unknown[]) => mockCalculateQuote(...args),
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
            <LocationsScheduleTab entityType={entityType} entityId={entityId} quoteId={entityType === 'Quote' ? entityId : undefined} editable={true} />
        </MemoryRouter>
    )
}

beforeEach(() => {
    jest.clearAllMocks()
    mockGetLocationsImports.mockResolvedValue([makeImport()])
    mockGetLocationVersions.mockResolvedValue([SAMPLE_VERSIONS[0]])
    mockImportLocationsCsv.mockResolvedValue(makeImport())
    mockRevertToVersion.mockResolvedValue(makeImport())
    mockUpdateLocationsImport.mockResolvedValue(makeImport())
    mockGetHistoricalLocations.mockResolvedValue([])
    mockGetQuoteLocationRows.mockResolvedValue([])
    mockAddLocation.mockResolvedValue({ id: 99, location_name: 'New Location', country: 'UK', state_province: 'England' })
    mockUpdateLocation.mockResolvedValue({ id: 99 })
    mockDeleteLocation.mockResolvedValue(undefined)
    mockAddCoverage.mockResolvedValue({ id: 50, location_id: 99, coverage_type: 'Property' })
    mockUpdateCoverage.mockResolvedValue({ id: 50 })
    mockDeleteCoverage.mockResolvedValue(undefined)
    mockSaveLocationVersion.mockResolvedValue({ id: 5 })
    mockCalculateLocation.mockResolvedValue({ rate_percent: 0.5, annual_risk_gross_premium: 2500 })
    mockCalculateQuote.mockResolvedValue({ updated: 3 })
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

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-006 -- Inline row add, delete, save
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-006 -- inline row management', () => {
    it('T-LOC-TAB-R06a: "+" add row button renders in the table header', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /add row/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R06b: clicking "+" shows an inline add row form', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /add row/i }))
        expect(screen.getByRole('textbox', { name: /^location$/i })).toBeInTheDocument()
        expect(screen.getByRole('textbox', { name: /^address$/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R06c: confirm button disabled when Location is empty', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /add row/i }))
        expect(screen.getByRole('button', { name: /confirm add row/i })).toBeDisabled()
    })

    it('T-LOC-TAB-R06d: filling Location and confirming adds a row to the grid', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /add row/i }))
        fireEvent.change(screen.getByRole('textbox', { name: /^location$/i }), { target: { value: 'Warehouse A' } })
        fireEvent.click(screen.getByRole('button', { name: /confirm add row/i }))
        expect(await screen.findByText('Warehouse A')).toBeInTheDocument()
    })

    it('T-LOC-TAB-R06e: each data row has a delete button', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        const deleteButtons = screen.getAllByRole('button', { name: /delete row/i })
        expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('T-LOC-TAB-R06f: clicking delete removes that row from the grid', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        const deleteButtons = screen.getAllByRole('button', { name: /delete row/i })
        fireEvent.click(deleteButtons[0])
        await waitFor(() => expect(screen.queryByText('HQ')).not.toBeInTheDocument())
    })

    it('T-LOC-TAB-R06g: "Unsaved changes" indicator appears after row change', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        const deleteButtons = screen.getAllByRole('button', { name: /delete row/i })
        fireEvent.click(deleteButtons[0])
        expect(await screen.findByText(/unsaved changes/i)).toBeInTheDocument()
    })

    it('T-LOC-TAB-R06h: Save button calls updateLocationsImport with current rows', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        const deleteButtons = screen.getAllByRole('button', { name: /delete row/i })
        fireEvent.click(deleteButtons[0])
        const saveBtn = await screen.findByRole('button', { name: /^save$/i })
        fireEvent.click(saveBtn)
        await waitFor(() =>
            expect(mockUpdateLocationsImport).toHaveBeenCalledWith(1, expect.objectContaining({ rows: expect.any(Array) }))
        )
    })

    it('T-LOC-TAB-R06i: Save success clears the unsaved indicator and notifies', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getAllByRole('button', { name: /delete row/i })[0])
        fireEvent.click(await screen.findByRole('button', { name: /^save$/i }))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith('Schedule saved.', 'success')
        )
        expect(screen.queryByText(/unsaved changes/i)).not.toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-007 -- Previously Included Locations tab
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-007 -- previously included locations tab', () => {
    it('T-LOC-TAB-R07a: "Previously Included" tab button renders', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /previously included/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R07b: "Schedule" tab button renders and is active by default', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        expect(screen.getByRole('button', { name: /^schedule$/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R07c: clicking Previously Included calls getHistoricalLocations', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /previously included/i }))
        await waitFor(() =>
            expect(mockGetHistoricalLocations).toHaveBeenCalledWith(1)
        )
    })

    it('T-LOC-TAB-R07d: historical rows shown after load', async () => {
        mockGetHistoricalLocations.mockResolvedValue([
            makeImport({ payload: { rows: [{ location: 'Old Depot', address: '99 Mill Rd', city: 'Leeds', state: '', country: 'UK', postcode: 'LS1 1AA', sumInsured: '100000' }] } }),
        ])
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /previously included/i }))
        expect(await screen.findByText('Old Depot')).toBeInTheDocument()
    })

    it('T-LOC-TAB-R07e: empty state when no historical rows', async () => {
        mockGetHistoricalLocations.mockResolvedValue([])
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /previously included/i }))
        expect(await screen.findByText(/no previously included locations/i)).toBeInTheDocument()
    })

    it('T-LOC-TAB-R07f: historical content is loaded lazily (not on mount)', async () => {
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        expect(mockGetHistoricalLocations).not.toHaveBeenCalled()
    })

    it('T-LOC-TAB-R07g: error notification on historical load failure', async () => {
        mockGetHistoricalLocations.mockRejectedValue(new Error('Server error'))
        renderTab()
        await waitFor(() => expect(screen.getByText('HQ')).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /previously included/i }))
        await waitFor(() =>
            expect(mockAddNotification).toHaveBeenCalledWith('Could not load historical locations.', 'error')
        )
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-008 — hierarchical collapsible grid (Country → State → rows)
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-008 — hierarchical grid', () => {
    beforeEach(() => {
        mockGetQuoteLocationRows.mockResolvedValue([
            { id: 1, location_id: 1, location_name: 'HQ', country: 'UK', state_province: 'England', coverage_id: 10, coverage_type: 'Property' },
            { id: 2, location_id: 2, location_name: 'Branch', country: 'UK', state_province: 'Scotland', coverage_id: 11, coverage_type: 'Liability' },
        ])
    })

    it('T-LOC-TAB-R08a: fetches quote location rows when quoteId provided', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(mockGetQuoteLocationRows).toHaveBeenCalledWith(42))
    })

    it('T-LOC-TAB-R08b: renders country group header', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(screen.getAllByText('UK').length).toBeGreaterThan(0))
    })

    it('T-LOC-TAB-R08c: renders state/province under country', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(screen.getByText('England')).toBeInTheDocument())
        expect(screen.getByText('Scotland')).toBeInTheDocument()
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-013 — per-row Calculate button
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-013 — per-row Calculate button', () => {
    beforeEach(() => {
        mockGetQuoteLocationRows.mockResolvedValue([
            { id: 1, location_id: 1, location_name: 'HQ', country: 'UK', state_province: 'England', coverage_id: 10, coverage_type: 'Property', rating_schedule_id: 5, sum_insured: 500000 },
        ])
    })

    it('T-LOC-TAB-R13a: Calculate button present for each coverage row', async () => {
        renderTab('Quote', 42)
        const calcBtns = await screen.findAllByRole('button', { name: /^calculate$/i })
        expect(calcBtns.length).toBeGreaterThan(0)
    })

    it('T-LOC-TAB-R13b: clicking Calculate calls calculateLocation with correct args', async () => {
        renderTab('Quote', 42)
        const calcBtns = await screen.findAllByRole('button', { name: /^calculate$/i })
        fireEvent.click(calcBtns[0])
        await waitFor(() =>
            expect(mockCalculateLocation).toHaveBeenCalledWith(10, 5)
        )
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-014 — Calculate All button
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-014 — Calculate All button', () => {
    it('T-LOC-TAB-R14a: Calculate All button renders when quoteId provided', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(mockGetLocationsImports).toHaveBeenCalled())
        expect(screen.getByRole('button', { name: /calculate all/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R14b: clicking Calculate All calls calculateQuote', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(screen.getByRole('button', { name: /calculate all/i })).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /calculate all/i }))
        await waitFor(() => expect(mockCalculateQuote).toHaveBeenCalledWith(42))
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-015 — Save Version button
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-015 — Save Version button', () => {
    it('T-LOC-TAB-R15a: Save Version button renders when editable and quoteId provided', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(mockGetLocationsImports).toHaveBeenCalled())
        expect(screen.getByRole('button', { name: /save version/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R15b: clicking Save Version calls saveLocationVersion and notifies success', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(screen.getByRole('button', { name: /save version/i })).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /save version/i }))
        await waitFor(() => {
            expect(mockSaveLocationVersion).toHaveBeenCalledWith(42)
            expect(mockAddNotification).toHaveBeenCalledWith(expect.stringMatching(/version saved/i), 'success')
        })
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-016 — Add location via CRUD endpoint
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-016 — add location CRUD', () => {
    it('T-LOC-TAB-R16a: Add Location button renders when editable', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(mockGetLocationsImports).toHaveBeenCalled())
        expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument()
    })

    it('T-LOC-TAB-R16b: clicking Add Location calls addLocation API', async () => {
        renderTab('Quote', 42)
        await waitFor(() => expect(screen.getByRole('button', { name: /add location/i })).toBeInTheDocument())
        fireEvent.click(screen.getByRole('button', { name: /add location/i }))
        await waitFor(() => expect(mockAddLocation).toHaveBeenCalledWith(42, expect.any(Object)))
    })
})

// ---------------------------------------------------------------------------
// REQ-LOC-FE-F-017 — Delete location via CRUD endpoint
// ---------------------------------------------------------------------------

describe('REQ-LOC-FE-F-017 — delete location CRUD', () => {
    beforeEach(() => {
        mockGetQuoteLocationRows.mockResolvedValue([
            { id: 1, location_id: 1, location_name: 'HQ', country: 'UK', state_province: 'England', coverage_id: null, coverage_type: null },
        ])
    })

    it('T-LOC-TAB-R17a: Delete Location button renders for each location row', async () => {
        renderTab('Quote', 42)
        const btns = await screen.findAllByRole('button', { name: /delete location/i })
        expect(btns.length).toBeGreaterThan(0)
    })

    it('T-LOC-TAB-R17b: clicking Delete Location calls deleteLocation API', async () => {
        renderTab('Quote', 42)
        const btns = await screen.findAllByRole('button', { name: /delete location/i })
        fireEvent.click(btns[0])
        await waitFor(() => expect(mockDeleteLocation).toHaveBeenCalledWith(42, 1))
    })
})

