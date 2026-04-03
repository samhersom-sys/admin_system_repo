'use client'

/**
 * ExternalNavbar — navigation bar for the public-facing marketing pages.
 *
 * Transparent over dark hero images, solid white on light pages.
 * The "Login" control opens a cross-origin environment chooser for the app
 * origins (not a SPA navigation — the app is a separate origin).
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching.
 *   - Colours via brandColors tokens only (RULE-02).
 */
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

// In production: https://app.thepolicyforge.com
// In UAT: https://app.uat.thepolicyforge.com
// In local dev: http://localhost:5173 (Vite SPA)
const PRODUCTION_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173'
const UAT_APP_URL = process.env.NEXT_PUBLIC_UAT_APP_URL ?? PRODUCTION_APP_URL

const loginTargets = [
    { label: 'Production', href: `${PRODUCTION_APP_URL}/login` },
    { label: 'UAT', href: `${UAT_APP_URL}/login` },
]

export default function ExternalNavbar() {
    const pathname = usePathname()
    const isDarkHero = ['/', '/about', '/services'].includes(pathname.toLowerCase())
    const [menuOpen, setMenuOpen] = useState(false)
    const [loginMenuOpen, setLoginMenuOpen] = useState(false)

    const navClass = isDarkHero
        ? 'absolute top-0 left-0 right-0 z-50 bg-transparent'
        : 'sticky top-0 z-50 bg-white border-b border-gray-200'

    const logoClass = isDarkHero
        ? 'text-xl font-bold text-white hover:text-gray-200 flex items-center gap-2'
        : 'text-xl font-bold text-gray-900 hover:text-gray-700 flex items-center gap-2'

    const linkBase = isDarkHero
        ? 'text-sm font-medium text-white hover:text-gray-200'
        : 'text-sm font-medium text-gray-900 hover:text-gray-700'

    const mobileLinkBase = 'block text-sm font-medium text-gray-900 hover:text-gray-700 py-2'
    const loginMenuClass = 'absolute right-0 top-full mt-3 flex min-w-[10rem] flex-col items-end gap-3'

    const loginOptionClass = isDarkHero
        ? 'block text-sm font-medium text-white/90 hover:text-white'
        : 'block text-sm font-medium text-gray-900 hover:text-gray-700'

    function navLinkClass(href: string) {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return `${linkBase} ${isActive ? 'border-b-2 border-current pb-1' : 'border-b-2 border-transparent pb-1'}`
    }

    function mobileLinkClass(href: string) {
        const isActive = href === '/' ? pathname === '/' : pathname.startsWith(href)
        return `${mobileLinkBase} ${isActive ? 'font-semibold' : ''}`
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

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center space-x-8">
                        <Link href="/" className={navLinkClass('/')}>HOME</Link>
                        <Link href="/about" className={navLinkClass('/about')}>ABOUT</Link>
                        <Link href="/services" className={navLinkClass('/services')}>SERVICES</Link>
                        <Link href="/contact" className={navLinkClass('/contact')}>CONTACT</Link>
                        <div className="relative">
                            <button
                                type="button"
                                className={linkBase}
                                aria-expanded={loginMenuOpen}
                                aria-controls="login-target-menu"
                                onClick={() => setLoginMenuOpen((open) => !open)}
                            >
                                LOGIN
                            </button>
                            {loginMenuOpen && (
                                <div id="login-target-menu" className={loginMenuClass}>
                                    {loginTargets.map((target) => (
                                        <a key={target.label} href={target.href} className={loginOptionClass}>
                                            {target.label}
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
                        aria-label={menuOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={menuOpen}
                        onClick={() => {
                            setMenuOpen((open) => !open)
                            setLoginMenuOpen(false)
                        }}
                    >
                        <span className={`block w-6 h-0.5 transition-colors ${isDarkHero ? 'bg-white' : 'bg-gray-900'}`} />
                        <span className={`block w-6 h-0.5 transition-colors ${isDarkHero ? 'bg-white' : 'bg-gray-900'}`} />
                        <span className={`block w-6 h-0.5 transition-colors ${isDarkHero ? 'bg-white' : 'bg-gray-900'}`} />
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="md:hidden bg-white border-t border-gray-200 px-6 pb-4">
                    <Link href="/" className={mobileLinkClass('/')} onClick={() => setMenuOpen(false)}>HOME</Link>
                    <Link href="/about" className={mobileLinkClass('/about')} onClick={() => setMenuOpen(false)}>ABOUT</Link>
                    <Link href="/services" className={mobileLinkClass('/services')} onClick={() => setMenuOpen(false)}>SERVICES</Link>
                    <Link href="/contact" className={mobileLinkClass('/contact')} onClick={() => setMenuOpen(false)}>CONTACT</Link>
                    <div className="pt-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Login</p>
                        {loginTargets.map((target) => (
                            <a
                                key={target.label}
                                href={target.href}
                                className={mobileLinkBase}
                                onClick={() => setMenuOpen(false)}
                            >
                                {target.label}
                            </a>
                        ))}
                    </div>
                </div>
            )}
        </nav>
    )
}
