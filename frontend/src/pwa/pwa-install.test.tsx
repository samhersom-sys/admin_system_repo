/**
 * TESTS — PWA Install Banner
 *
 * Requirements: pwa-install.requirements.md
 * Test IDs: T-PWA-R*
 */
import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import InstallBanner from './InstallBanner'
import { doRegister } from './registerServiceWorker'

// ---------------------------------------------------------------------------
// Mock the hook — beforeinstallprompt is not available in jsdom
// ---------------------------------------------------------------------------

const mockInstall = jest.fn()
const mockDismiss = jest.fn()

jest.mock('./usePwaInstall', () => ({
  usePwaInstall: jest.fn(),
}))

import { usePwaInstall } from './usePwaInstall'

beforeEach(() => {
  jest.clearAllMocks()
})

// ---------------------------------------------------------------------------
// T-PWA-R01: banner renders when canInstall is true
// ---------------------------------------------------------------------------

describe('T-PWA-R01: banner renders when install is available', () => {
  it('shows the install prompt when canInstall is true', () => {
    ; (usePwaInstall as jest.Mock).mockReturnValue({
      canInstall: true,
      install: mockInstall,
      dismiss: mockDismiss,
    })
    render(<InstallBanner />)
    expect(screen.getByText('PolicyForge')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Install$/i })).toBeInTheDocument()
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R02: banner does NOT render when canInstall is false
// ---------------------------------------------------------------------------

describe('T-PWA-R02: banner hidden when install is not available', () => {
  it('renders nothing when canInstall is false', () => {
    ; (usePwaInstall as jest.Mock).mockReturnValue({
      canInstall: false,
      install: mockInstall,
      dismiss: mockDismiss,
    })
    const { container } = render(<InstallBanner />)
    expect(container.firstChild).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R03: Install button calls install()
// ---------------------------------------------------------------------------

describe('T-PWA-R03: Install button triggers install()', () => {
  it('calls install() when the Install button is clicked', () => {
    ; (usePwaInstall as jest.Mock).mockReturnValue({
      canInstall: true,
      install: mockInstall,
      dismiss: mockDismiss,
    })
    render(<InstallBanner />)
    fireEvent.click(screen.getByRole('button', { name: /^Install$/i }))
    expect(mockInstall).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R04: Dismiss button calls dismiss()
// ---------------------------------------------------------------------------

describe('T-PWA-R04: Dismiss button triggers dismiss()', () => {
  it('calls dismiss() when the × button is clicked', () => {
    ; (usePwaInstall as jest.Mock).mockReturnValue({
      canInstall: true,
      install: mockInstall,
      dismiss: mockDismiss,
    })
    render(<InstallBanner />)
    fireEvent.click(screen.getByRole('button', { name: /Dismiss install prompt/i }))
    expect(mockDismiss).toHaveBeenCalledTimes(1)
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R05: SW registration called when serviceWorker supported
// ---------------------------------------------------------------------------

describe('T-PWA-R05: registerServiceWorker registers /sw.js when supported', () => {
  it('calls navigator.serviceWorker.register with /sw.js', () => {
    const mockRegister = jest.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      configurable: true,
    })
    doRegister()
    expect(mockRegister).toHaveBeenCalledWith('/sw.js')
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R06: SW registration silently skipped when not supported
// ---------------------------------------------------------------------------

describe('T-PWA-R06: registerServiceWorker skips silently when not supported', () => {
  it('does not throw when serviceWorker is not in navigator', () => {
    const nav = navigator as unknown as Record<string, unknown>
    const original = nav.serviceWorker
    delete nav.serviceWorker
    expect(() => doRegister()).not.toThrow()
    nav.serviceWorker = original
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R05: SW registration called when serviceWorker supported
// ---------------------------------------------------------------------------

describe('T-PWA-R05: registerServiceWorker registers /sw.js when supported', () => {
  it('calls navigator.serviceWorker.register with /sw.js', () => {
    const mockRegister = jest.fn().mockResolvedValue({})
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { register: mockRegister },
      configurable: true,
    })
    doRegister()
    expect(mockRegister).toHaveBeenCalledWith('/sw.js')
  })
})

// ---------------------------------------------------------------------------
// T-PWA-R06: SW registration silently skipped when not supported
// ---------------------------------------------------------------------------

describe('T-PWA-R06: registerServiceWorker skips silently when not supported', () => {
  it('does not throw when serviceWorker is not in navigator', () => {
    const nav = navigator as unknown as Record<string, unknown>
    const original = nav.serviceWorker
    delete nav.serviceWorker
    expect(() => doRegister()).not.toThrow()
    nav.serviceWorker = original
  })
})
