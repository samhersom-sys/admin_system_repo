'use client'

/**
 * ExternalNavbar — navigation bar for the public-facing marketing pages.
 *
 * Transparent over dark hero images, solid white on light pages.
 * The "Login" link is a cross-origin <a> pointing to app.policyforge.com/login
 * (not a SPA navigation — the app is a separate origin).
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching.
 *   - Colours via brandColors tokens only (RULE-02).
 */
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// In production: https://app.policyforge.com
// In local dev: http://localhost:5173 (Vite SPA)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'

export default function ExternalNavbar() {
    const pathname = usePathname()
    const isDarkHero = ['/', '/about', '/services'].includes(pathname.toLowerCase())

    const navClass = isDarkHero
        ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
        : 'sticky top-0 z-50 bg-white border-b border-gray-200'

    const logoClass = isDarkHero
        ? 'text-xl font-bold text-white hover:text-gray-200 flex items-center gap-2'
        : 'text-xl font-bold text-gray-900 hover:text-gray-700 flex items-center gap-2'

    const linkBase = isDarkHero
        ? 'text-sm font-medium text-white hover:text-gray-200'
        : 'text-sm font-medium text-gray-900 hover:text-gray-700'

    function navLinkClass(href: string) {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return `${linkBase} ${isActive ? 'border-b-2 border-current pb-1' : 'border-b-2 border-transparent pb-1'}`
    }

    return (
        <nav className={navClass} aria-label="Public navigation">
            <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
                <div className="flex justify-between items-center h-16">
                    {/* Brand */}
                    <Link href="/" className={logoClass}>
                        <span className="text-sm font-bold tracking-tight leading-tight">
                            The Policy Forge
                            <br />
                            <span className="font-normal text-xs opacity-80">Insurance Applications</span>
                        </span>
                    </Link>

                    {/* Nav links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/" className={navLinkClass('/')}>
                            HOME
                        </Link>
                        <Link href="/about" className={navLinkClass('/about')}>
                            ABOUT
                        </Link>
                        <Link href="/services" className={navLinkClass('/services')}>
                            SERVICES
                        </Link>
                        <Link href="/contact" className={navLinkClass('/contact')}>
                            CONTACT
                        </Link>
                        {/* Cross-origin link to the app — not a SPA route */}
                        <a
                            href={`${APP_URL}/login`}
                            className={linkBase}
                        >
                            LOGIN
                        </a>
                    </div>
                </div>
            </div>
        </nav>
    )
}
