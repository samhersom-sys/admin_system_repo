/**
 * TESTS — Settings: Product Pages
 * Second artifact. Requirements: settings.requirements.md §3c
 * Test naming: T-SETTINGS-PRODUCTS-R{NN}
 */

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// API CONTRACT ALIGNMENT (verified 2026-04-04 against real backend):
//   GET /api/products → Product[] (no .data wrapper)
//   GET /api/products/:id → Product
//   POST /api/products → Product
//   PUT /api/products/:id → Product

const mockNavigate = jest.fn()
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}))

jest.mock('@/shared/lib/api-client/api-client', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}))

jest.mock('@/shared/lib/auth-session/auth-session', () => ({
  getSession: jest.fn(() => ({
    token: 'tok',
    user: { id: 1, email: 'admin@example.com', orgCode: 'ORG-001', role: 'client_admin' },
  })),
}))

jest.mock('@/shell/NotificationDock', () => ({
  useNotifications: () => ({ addNotification: mockAddNotification }),
}))

jest.mock('@/shell/SidebarContext', () => ({
  useSidebarSection: jest.fn(),
}))

const mockAddNotification = jest.fn()

import * as apiClient from '@/shared/lib/api-client/api-client'

const MOCK_PRODUCTS = [
  { id: 1, name: 'Property Open Market', code: 'PROP-OM', product_type: 'open_market', line_of_business: 'Property', underwriting_year: 2026, description: 'Standard property coverage', is_active: true },
  { id: 2, name: 'Marine Delegated', code: 'MAR-DEL', product_type: 'delegated', line_of_business: 'Marine', underwriting_year: 2026, description: 'Delegated marine product', is_active: false },
]

const MOCK_STEPS = [
  { id: 1, step_name: 'Submission Review', step_code: 'REVIEW', description: 'Initial review', is_active: true, is_default: true, sort_order: 1 },
  { id: 2, step_name: 'Pricing', step_code: 'PRICING', description: 'Quote pricing', is_active: true, is_default: false, sort_order: 2 },
]

function renderProductListPage() {
  const { default: ProductListPage } = require('../ProductListPage')
  return render(
    <MemoryRouter>
      <ProductListPage />
    </MemoryRouter>
  )
}

function renderProductConfigPage(id = '1') {
  const { default: ProductConfigPage } = require('../ProductConfigPage')
  return render(
    <MemoryRouter initialEntries={[`/settings/products/${id}`]}>
      <Routes>
        <Route path="/settings/products/:id" element={<ProductConfigPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/settings/products') return Promise.resolve(MOCK_PRODUCTS)
    if (url.match(/\/api\/settings\/products\/\d+\/workflow-steps/)) return Promise.resolve(MOCK_STEPS)
    if (url.match(/\/api\/settings\/products\/\d+$/)) return Promise.resolve(MOCK_PRODUCTS[0])
    return Promise.resolve([])
  });
  (apiClient.post as jest.Mock).mockResolvedValue({ id: 3, name: 'New Product', code: MOCK_PRODUCTS[0].code, product_type: MOCK_PRODUCTS[0].product_type, line_of_business: MOCK_PRODUCTS[0].line_of_business, underwriting_year: MOCK_PRODUCTS[0].underwriting_year, description: MOCK_PRODUCTS[0].description, is_active: MOCK_PRODUCTS[0].is_active });
  (apiClient.put as jest.Mock).mockResolvedValue(MOCK_PRODUCTS[0])
})

// ---------------------------------------------------------------------------
// ProductListPage
// ---------------------------------------------------------------------------

describe('T-settings-products-R01: ProductListPage renders product cards', () => {
  it('fetches products and renders cards with names', async () => {
    renderProductListPage()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/products')
    })
    await waitFor(() => {
      expect(screen.getByText('Property Open Market')).toBeInTheDocument()
      expect(screen.getByText('Marine Delegated')).toBeInTheDocument()
    })
  })

  it('renders product code and type on each card', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))
    expect(screen.getByText('PROP-OM')).toBeInTheDocument()
  })
})

describe('T-settings-products-R02: + New Product button opens modal with form', () => {
  it('renders "New Product" button', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))
    expect(screen.getByRole('button', { name: /new product/i })).toBeInTheDocument()
  })

  it('opens a modal with Name, Code, Type, LoB, UW Year, Description fields', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /new product/i }))

    expect(screen.getByLabelText(/product name|name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/product type|type/i)).toBeInTheDocument()
  })

  it('calls POST /api/settings/products and shows toast on submit', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /new product/i }))

    const nameInput = screen.getByLabelText(/product name|name/i)
    await userEvent.type(nameInput, 'New Test Product')

    const createBtn = screen.getByRole('button', { name: /create product/i })
    await userEvent.click(createBtn)

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/settings/products',
        expect.objectContaining({ name: 'New Test Product' })
      )
    })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/product created/i),
        'success'
      )
    })
  })
})

describe('T-settings-products-R03: clicking a product card navigates to detail', () => {
  it('navigates to /settings/products/:id on card click', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByText('Property Open Market'))

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/settings/products/1')
    )
  })
})

// ---------------------------------------------------------------------------
// ProductConfigPage
// ---------------------------------------------------------------------------

describe('T-settings-products-R04: General tab shows editable product fields', () => {
  it('fetches product and displays Name in an editable input', async () => {
    renderProductConfigPage('1')
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/products/1')
    })
    await waitFor(() => {
      expect(screen.getByDisplayValue('Property Open Market')).toBeInTheDocument()
    })
  })

  it('Save button calls PUT and shows toast', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))

    const saveBtn = screen.getByRole('button', { name: /save/i })
    await userEvent.click(saveBtn)

    await waitFor(() => {
      expect(apiClient.put).toHaveBeenCalledWith(
        '/api/settings/products/1',
        expect.any(Object)
      )
    })
    await waitFor(() => {
      expect(mockAddNotification).toHaveBeenCalledWith(
        expect.stringMatching(/product saved/i),
        'success'
      )
    })
  })
})

describe('T-SETTINGS-PRODUCTS-R05: Workflow Steps tab displays steps and add form', () => {
  it('renders Workflow Steps tab', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))
    expect(screen.getByRole('tab', { name: /workflow steps/i })).toBeInTheDocument()
  })

  it('fetches and displays steps on Workflow Steps tab click', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))

    await userEvent.click(screen.getByRole('tab', { name: /workflow steps/i }))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/products/1/workflow-steps')
    })
    await waitFor(() => {
      expect(screen.getByText('Submission Review')).toBeInTheDocument()
    })
  })
})
