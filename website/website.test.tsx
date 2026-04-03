/**
 * WEB Domain — Component Behaviour Tests
 *
 * Traceable to: website/website.requirements.md
 * Domain code:  WEB
 * Test file:    website/website.test.tsx
 *
 * Covers:
 *   ExternalNavbar  REQ-WEB-F-001 → F-008, C-001 → C-002
 *   Homepage        REQ-WEB-F-009 → F-014, C-003 → C-005
 *   About           REQ-WEB-F-015 → F-017, C-006 → C-007
 *   Services        REQ-WEB-F-018 → F-020, C-008 → C-009
 *   Contact         REQ-WEB-F-021 → F-024, C-010 → C-011
 *
 * NOTE (TDD): The four page files do not exist until Step 4.
 * Running this file before they are created produces a Jest "Cannot find module"
 * error — that is the expected red phase.  Create the page files (Step 4) to
 * move to green.
 */

import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'

// ── Next.js module mocks ──────────────────────────────────────────────────────

// Mock next/link as a plain <a> so RTL can inspect href and className
jest.mock('next/link', () => {
    return function MockLink({
        href,
        className,
        children,
    }: {
        href: string
        className?: string
        children: React.ReactNode
    }) {
        return (
            <a href={href} className={className}>
                {children}
            </a>
        )
    }
})

// usePathname is configured per-test via mockReturnValue
const mockUsePathname = jest.fn(() => '/')
jest.mock('next/navigation', () => ({
    usePathname: () => mockUsePathname(),
}))

// ── Component imports ─────────────────────────────────────────────────────────
// ExternalNavbar already exists.
// The four page imports will trigger "Cannot find module" until Step 4 creates them.
import ExternalNavbar from '@/components/ExternalNavbar'
import HomePage from '@/app/page'
import AboutPage from '@/app/about/page'
import ServicesPage from '@/app/services/page'
import ContactPage from '@/app/contact/page'

// =============================================================================
// ExternalNavbar
// =============================================================================

describe('ExternalNavbar', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/')
    })

    // REQ-WEB-F-001: renders on all pages — implicitly proven by each page describe block below.

    it('T-WEB-navbar-R002: renders all five nav items — HOME, ABOUT, SERVICES, CONTACT, LOGIN', () => {
        render(<ExternalNavbar />)
        expect(screen.getByText('HOME')).toBeInTheDocument()
        expect(screen.getByText('ABOUT')).toBeInTheDocument()
        expect(screen.getByText('SERVICES')).toBeInTheDocument()
        expect(screen.getByText('CONTACT')).toBeInTheDocument()
        expect(screen.getByText('LOGIN')).toBeInTheDocument()
    })

    it('T-WEB-navbar-R003: brand logo is a link pointing to /', () => {
        render(<ExternalNavbar />)
        // The logo text is inside the link — find the closest anchor
        const logo = screen.getByText(/The Policy Forge/).closest('a')
        expect(logo).toHaveAttribute('href', '/')
    })

    it('T-WEB-navbar-R004: LOGIN opens Production and UAT plain <a> links whose href values contain /login', () => {
        render(<ExternalNavbar />)
        const loginButton = screen.getByRole('button', { name: 'LOGIN' })
        fireEvent.click(loginButton)

        const productionLink = screen.getByText('Production')
        const uatLink = screen.getByText('UAT')

        expect(productionLink.tagName).toBe('A')
        expect(uatLink.tagName).toBe('A')
        expect(productionLink).toHaveAttribute('href', expect.stringContaining('/login'))
        expect(uatLink).toHaveAttribute('href', expect.stringContaining('/login'))
    })

    it('T-WEB-navbar-R005: nav has absolute transparent positioning on / (dark-hero page)', () => {
        mockUsePathname.mockReturnValue('/')
        const { container } = render(<ExternalNavbar />)
        const nav = container.querySelector('nav')
        expect(nav?.className).toContain('absolute')
        expect(nav?.className).toContain('bg-transparent')
    })

    it('T-WEB-navbar-R005: nav has absolute transparent positioning on /about (dark-hero page)', () => {
        mockUsePathname.mockReturnValue('/about')
        const { container } = render(<ExternalNavbar />)
        const nav = container.querySelector('nav')
        expect(nav?.className).toContain('absolute')
        expect(nav?.className).toContain('bg-transparent')
    })

    it('T-WEB-navbar-R005: nav has absolute transparent positioning on /services (dark-hero page)', () => {
        mockUsePathname.mockReturnValue('/services')
        const { container } = render(<ExternalNavbar />)
        const nav = container.querySelector('nav')
        expect(nav?.className).toContain('absolute')
        expect(nav?.className).toContain('bg-transparent')
    })

    it('T-WEB-navbar-R006: nav has sticky white positioning on /contact (light page)', () => {
        mockUsePathname.mockReturnValue('/contact')
        const { container } = render(<ExternalNavbar />)
        const nav = container.querySelector('nav')
        expect(nav?.className).toContain('sticky')
        expect(nav?.className).toContain('bg-white')
    })

    it('T-WEB-navbar-R007: active link has border-current underline indicator; inactive links have border-transparent', () => {
        mockUsePathname.mockReturnValue('/about')
        render(<ExternalNavbar />)
        const aboutLink = screen.getByText('ABOUT').closest('a')
        const homeLink = screen.getByText('HOME').closest('a')
        expect(aboutLink?.className).toContain('border-current')
        expect(homeLink?.className).toContain('border-transparent')
    })

    it('T-WEB-navbar-R007: HOME link is active only on exact / match (not prefix-matched by /about)', () => {
        mockUsePathname.mockReturnValue('/')
        render(<ExternalNavbar />)
        const homeLink = screen.getByText('HOME').closest('a')
        const aboutLink = screen.getByText('ABOUT').closest('a')
        expect(homeLink?.className).toContain('border-current')
        expect(aboutLink?.className).toContain('border-transparent')
    })

    it('T-WEB-navbar-R008: nav links use white text classes on dark-hero pages (/)', () => {
        mockUsePathname.mockReturnValue('/')
        render(<ExternalNavbar />)
        const homeLink = screen.getByText('HOME').closest('a')
        expect(homeLink?.className).toContain('text-white')
    })

    it('T-WEB-navbar-R008: nav links use dark text classes on /contact (light page)', () => {
        mockUsePathname.mockReturnValue('/contact')
        render(<ExternalNavbar />)
        const contactLink = screen.getByText('CONTACT').closest('a')
        expect(contactLink?.className).toContain('text-gray-900')
    })
})

// =============================================================================
// Homepage — /
// =============================================================================

describe('Homepage — /', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/')
    })

    it('T-WEB-homepage-R009-R010: renders an h1 hero heading', () => {
        render(<HomePage />)
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
    })

    it('T-WEB-homepage-R011: hero section renders a background visual element (placeholder or real image)', () => {
        const { container } = render(<HomePage />)
        const heroSection = container.querySelector('section')
        expect(heroSection).not.toBeNull()
        const bgElement = heroSection!.querySelector('[class*="absolute"]')
        expect(bgElement).not.toBeNull()
    })

    it('T-WEB-homepage-R012: renders "What We Do" section', () => {
        render(<HomePage />)
        expect(screen.getByText('What We Do')).toBeInTheDocument()
    })

    it('T-WEB-homepage-R012-C003: "What We Do" section has a non-empty inline background-color style (homeBeige token)', () => {
        const { container } = render(<HomePage />)
        const whatWeDoSection = Array.from(container.querySelectorAll('section')).find((s) =>
            s.textContent?.includes('What We Do')
        )
        expect(whatWeDoSection).toBeTruthy()
        expect(whatWeDoSection?.getAttribute('style')).toMatch(/background/)
    })

    it('T-WEB-homepage-R013: renders "Who We Connect" heading', () => {
        render(<HomePage />)
        expect(screen.getByText('Who We Connect')).toBeInTheDocument()
    })

    it('T-WEB-homepage-R013: "Who We Connect" section lists all five participant types', () => {
        render(<HomePage />)
        expect(screen.getByText('Insurers')).toBeInTheDocument()
        // Use exact label text to avoid matching paragraph body copy that also mentions MGAs/TPAs
        expect(screen.getByText("MGA's")).toBeInTheDocument()
        expect(screen.getByText('Brokers')).toBeInTheDocument()
        expect(screen.getByText("TPA's")).toBeInTheDocument()
        expect(screen.getByText(/And many more/i)).toBeInTheDocument()
    })

    it('T-WEB-homepage-R014: footer contains current year and "The Policy Forge. All rights reserved."', () => {
        render(<HomePage />)
        const year = new Date().getFullYear().toString()
        // Year appears somewhere on the page (inside footer copyright)
        expect(screen.getByText(new RegExp(year))).toBeInTheDocument()
        expect(screen.getByText(/All rights reserved/i)).toBeInTheDocument()
    })
})

// =============================================================================
// About Page — /about
// =============================================================================

describe('About Page — /about', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/about')
    })

    it('T-WEB-about-R015-R016: renders an h1 hero heading "About Us"', () => {
        render(<AboutPage />)
        expect(screen.getByRole('heading', { level: 1, name: /About Us/i })).toBeInTheDocument()
    })

    it('T-WEB-about-R017: renders an "Our Story" content section below the hero', () => {
        render(<AboutPage />)
        expect(screen.getByRole('heading', { level: 2, name: /Our Story/i })).toBeInTheDocument()
        // Body copy — use text unique to the content section (navbar also has "The Policy Forge" so avoid /The Policy Forge/i)
        expect(screen.getByText(/helps insurance organizations/i)).toBeInTheDocument()
    })
})

// =============================================================================
// Services Page — /services
// =============================================================================

describe('Services Page — /services', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/services')
    })

    it('T-WEB-services-R018-R019: renders an h1 hero heading "Services"', () => {
        render(<ServicesPage />)
        expect(screen.getByRole('heading', { level: 1, name: /Services/i })).toBeInTheDocument()
    })

    it('T-WEB-services-R020: renders all four required service card titles', () => {
        render(<ServicesPage />)
        expect(screen.getByText('Submission Management')).toBeInTheDocument()
        expect(screen.getByText('Rating & Quoting')).toBeInTheDocument()
        expect(screen.getByText('Delegated Authority')).toBeInTheDocument()
        expect(screen.getByText('Reporting & Analytics')).toBeInTheDocument()
    })
})

// =============================================================================
// Contact Page — /contact
// =============================================================================

describe('Contact Page — /contact', () => {
    beforeEach(() => {
        mockUsePathname.mockReturnValue('/contact')
    })

    it('T-WEB-contact-R021-R022: renders h1 "Contact Us" heading', () => {
        render(<ContactPage />)
        expect(screen.getByRole('heading', { level: 1, name: /Contact Us/i })).toBeInTheDocument()
    })

    it('T-WEB-contact-R022: renders an introductory paragraph', () => {
        render(<ContactPage />)
        expect(screen.getByText(/Get in touch/i)).toBeInTheDocument()
    })

    it('T-WEB-contact-R023: renders "General Enquiries" and "Support" info cards', () => {
        render(<ContactPage />)
        expect(screen.getByText('General Enquiries')).toBeInTheDocument()
        expect(screen.getByText('Support')).toBeInTheDocument()
    })

    it('T-WEB-contact-R024: renders a map or contact-form placeholder section', () => {
        render(<ContactPage />)
        expect(screen.getByText(/map.*contact form placeholder/i)).toBeInTheDocument()
    })
})
