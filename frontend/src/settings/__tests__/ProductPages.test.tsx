/**
 * TESTS — Settings: Product Pages
 * Second artifact. Requirements: settings.requirements.md §3c
 * Test naming: T-SETTINGS-PRODUCTS-R{NN}
 */

import { render, screen, waitFor, within } from '@testing-library/react'
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

const MOCK_CATEGORIES = [
  { id: 1, name: 'Property Catagory', productCount: 3 },
  { id: 2, name: 'Marine Catagory', productCount: 1 },
]

const MOCK_PRODUCTS = [
  { id: 1, name: 'Property Open Market', code: 'PROP-OM', product_type: 'Property Catagory', productCategoryId: 1, productCategoryName: 'Property Catagory', line_of_business: 'Property', underwriting_year: 2026, description: 'Standard property coverage', is_active: true },
  { id: 2, name: 'Marine Delegated', code: 'MAR-DEL', product_type: 'Marine Catagory', productCategoryId: 2, productCategoryName: 'Marine Catagory', line_of_business: 'Marine', underwriting_year: 2026, description: 'Delegated marine product', is_active: false },
]

const MOCK_STEPS = [
  { id: 1, step_name: 'Submission Review', step_code: 'REVIEW', description: 'Initial review', is_active: true, is_default: true, sort_order: 1 },
  { id: 2, step_name: 'Pricing', step_code: 'PRICING', description: 'Quote pricing', is_active: true, is_default: false, sort_order: 2 },
]

const MOCK_AUDIT = [
  { action: 'Product Updated', user: 'Admin', date: '2026-05-01T10:00:00Z', details: 'Updated product defaults.' },
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
        <Route path="/settings/products/new" element={<ProductConfigPage />} />
        <Route path="/settings/products/:id" element={<ProductConfigPage />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  jest.clearAllMocks();
  (apiClient.get as jest.Mock).mockImplementation((url: string) => {
    if (url === '/api/settings/products') return Promise.resolve(MOCK_PRODUCTS)
    if (url === '/api/settings/product-categories') return Promise.resolve(MOCK_CATEGORIES)
    if (url.match(/\/api\/settings\/products\/\d+\/workflow-steps/)) return Promise.resolve(MOCK_STEPS)
    if (url.match(/\/api\/settings\/products\/\d+$/)) return Promise.resolve(MOCK_PRODUCTS[0])
    if (url.match(/\/api\/audit\/Product\/\d+$/)) return Promise.resolve(MOCK_AUDIT)
    return Promise.resolve([])
  });
  (apiClient.post as jest.Mock).mockResolvedValue({ id: 3, name: 'New Product', code: MOCK_PRODUCTS[0].code, product_type: MOCK_PRODUCTS[0].product_type, productCategoryId: MOCK_PRODUCTS[0].productCategoryId, productCategoryName: MOCK_PRODUCTS[0].productCategoryName, line_of_business: MOCK_PRODUCTS[0].line_of_business, underwriting_year: MOCK_PRODUCTS[0].underwriting_year, description: MOCK_PRODUCTS[0].description, is_active: MOCK_PRODUCTS[0].is_active });
  (apiClient.put as jest.Mock).mockResolvedValue(MOCK_PRODUCTS[0])
})

// ---------------------------------------------------------------------------
// ProductListPage
// ---------------------------------------------------------------------------

describe('T-settings-products-R01: ProductListPage renders products in table rows', () => {
  it('fetches products and renders table rows with names', async () => {
    renderProductListPage()
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/products')
    })
    await waitFor(() => {
      expect(screen.getByText('Property Open Market')).toBeInTheDocument()
      expect(screen.getByText('Marine Delegated')).toBeInTheDocument()
    })
  })

  it('renders product name and type columns', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))
    expect(screen.getByRole('row', { name: /property open market property catagory property 2026 active/i })).toBeInTheDocument()
  })
})

describe('T-settings-products-R02: inline add product row', () => {
  it('renders add-product button in table header', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))
    expect(screen.getByRole('button', { name: /add product/i })).toBeInTheDocument()
  })

  it('opens inline row with product fields when add button is clicked', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /add product/i }))

    expect(screen.getByLabelText(/product name/i)).toBeInTheDocument()
    expect(screen.getAllByLabelText(/product catagory/i)).toHaveLength(2)
    const { useSidebarSection } = require('@/shell/SidebarContext')
    expect(useSidebarSection).toHaveBeenCalledWith(expect.objectContaining({
      items: expect.arrayContaining([
        expect.objectContaining({
          label: 'Create Product Catagory',
          to: '/settings/product-catagories',
        }),
      ]),
    }))
  })

  it('opens the new product detail page when magnifier is clicked', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /add product/i }))

    const openDetailBtn = screen.getByRole('button', { name: /view product configuration/i })
    await userEvent.click(openDetailBtn)

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(
        '/settings/products/new',
        expect.objectContaining({
          state: expect.objectContaining({ draftId: expect.any(Number) }),
        })
      )
    })
  })

  it('opens the detail page even when the draft name is blank', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /add product/i }))

    await userEvent.click(screen.getByRole('button', { name: /view product configuration/i }))

    expect(mockNavigate).toHaveBeenCalledWith(
      '/settings/products/new',
      expect.objectContaining({
        state: expect.objectContaining({ draftId: expect.any(Number) }),
      })
    )
  })
})

describe('T-settings-products-R03: open product action navigates to detail', () => {
  it('navigates to /settings/products/:id when open product is clicked', async () => {
    renderProductListPage()
    await waitFor(() => screen.getByText('Property Open Market'))

    const openButtons = screen.getAllByRole('button', { name: /view product/i })
    await userEvent.click(openButtons[0])

    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringContaining('/settings/products/1')
    )
  })
})

// ---------------------------------------------------------------------------
// ProductConfigPage
// ---------------------------------------------------------------------------

describe('T-settings-products-R04: Product details page shows editable fields', () => {
  it('fetches product and displays Name in an editable input', async () => {
    renderProductConfigPage('1')
    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/products/1')
    })
    await waitFor(() => {
      expect(screen.getByDisplayValue('Property Open Market')).toBeInTheDocument()
    })
  })

  it('renders Product Catagory label', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))
    expect(screen.getByRole('combobox', { name: /product catagory/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Property Catagory')).toBeInTheDocument()
  })

  it('Save action calls PUT and shows toast', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))

    window.dispatchEvent(new Event('product:save'))

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

  it('renders Year of Account label', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))
    expect(screen.getByLabelText(/year of account/i)).toBeInTheDocument()
  })

  it('highlights the name field when saving with an empty name', async () => {
    const { default: ProductConfigPage } = require('../ProductConfigPage')
    render(
      <MemoryRouter initialEntries={['/settings/products/new']}>
        <Routes>
          <Route path="/settings/products/new" element={<ProductConfigPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => screen.getByText('Product Configuration'))

    window.dispatchEvent(new Event('product:save'))

    await waitFor(() => {
      expect(screen.getByLabelText(/^name$/i)).toHaveClass('border-red-500')
    })
    expect(apiClient.post).not.toHaveBeenCalled()
  })
})

describe('T-settings-products-R04b: new product detail route opens without an id', () => {
  it('renders a blank Product Configuration page for /settings/products/new', async () => {
    const { default: ProductConfigPage } = require('../ProductConfigPage')
    render(
      <MemoryRouter initialEntries={['/settings/products/new']}>
        <Routes>
          <Route path="/settings/products/new" element={<ProductConfigPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(screen.getByText('Product Configuration')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: /section default/i }))

    await waitFor(() => {
      expect(screen.getByText('Policy Grain')).toBeInTheDocument()
    })

    expect(screen.queryByDisplayValue('Section')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Coverage')).not.toBeInTheDocument()
    expect(screen.queryByDisplayValue('Coverage Element')).not.toBeInTheDocument()
  })
})

describe('T-settings-products-R04c: product category management page', () => {
  it('renders categories and allows create/delete actions', async () => {
    const { default: ProductCategoriesPage } = require('../ProductCategoriesPage')
    render(
      <MemoryRouter initialEntries={['/settings/product-catagories']}>
        <Routes>
          <Route path="/settings/product-catagories" element={<ProductCategoriesPage />} />
        </Routes>
      </MemoryRouter>
    )

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/settings/product-categories')
    })

    expect(await screen.findByText('Property Catagory')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /create product catagory/i }))
    expect(screen.getByLabelText(/product catagory name/i)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/product catagory name/i), 'New Catagory')
    await userEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(apiClient.post).toHaveBeenCalledWith('/api/settings/product-categories', { name: 'New Catagory' })
    })
  })
})

describe('T-settings-products-R05: Product details tabs and audit history', () => {
  it('renders Product Details and Audit tabs', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))
    expect(screen.getByRole('button', { name: /product details/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /audit/i })).toBeInTheDocument()
  })

  it('drills from sections to coverages to coverage elements', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /section default/i }))

    await waitFor(() => {
      expect(screen.getByText('Policy Grain')).toBeInTheDocument()
    })

    expect(screen.getByRole('button', { name: /add policy grain section/i })).toBeInTheDocument()
    const firstSectionRow = screen.getAllByDisplayValue('Section')[0]?.closest('tr')
    expect(firstSectionRow).not.toBeNull()
    expect(within(firstSectionRow as HTMLTableRowElement).getByRole('link', { name: /open section row/i })).toHaveAttribute('href', '/settings/products/1/policy-grain/section/1/defaults')
    expect(screen.getAllByDisplayValue('Section').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('Coverage').length).toBeGreaterThan(0)
    expect(screen.getAllByDisplayValue('Coverage Element').length).toBeGreaterThan(0)

    const sectionRow = firstSectionRow
    expect(sectionRow).not.toBeNull()
    await userEvent.click(within(sectionRow as HTMLTableRowElement).getByRole('button', { name: /move section down/i }))

    await waitFor(() => {
      expect(screen.getByText('Policy Grain')).toBeInTheDocument()
    })

    await userEvent.click(within(sectionRow as HTMLTableRowElement).getByRole('button', { name: /add coverage/i }))

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Coverage').length).toBeGreaterThan(2)
    })

    const coverageRow = screen.getAllByDisplayValue('Coverage')[0]?.closest('tr')
    expect(coverageRow).not.toBeNull()
    await userEvent.click(within(coverageRow as HTMLTableRowElement).getByRole('button', { name: /add coverage detail/i }))

    await waitFor(() => {
      expect(screen.getAllByDisplayValue('Coverage Element').length).toBeGreaterThan(0)
    })
  })

  it('fetches and displays product audit history on Audit tab click', async () => {
    renderProductConfigPage('1')
    await waitFor(() => screen.getByDisplayValue('Property Open Market'))

    await userEvent.click(screen.getByRole('button', { name: /audit/i }))

    await waitFor(() => {
      expect(apiClient.get).toHaveBeenCalledWith('/api/audit/Product/1')
    })
    await waitFor(() => {
      expect(screen.getByText('Product Updated')).toBeInTheDocument()
    })
  })
})
