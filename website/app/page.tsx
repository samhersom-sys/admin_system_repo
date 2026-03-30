'use client'

/**
 * Homepage — public route: /
 *
 * Ported from frontend/app/features/external/ExternalHomePage.tsx.
 * Visual output is identical — only the framework primitives change
 * (React Router → Next.js).
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching or API calls.
 *   - Colours via brandColors tokens only (REQ-WEB-C-003).
 *   - SVG fallback uses URL-encoded hex (%23 not #) to satisfy REQ-WEB-C-013.
 */
import { brandColors } from '@/lib/design-tokens/brandColors'
import ExternalNavbar from '@/components/ExternalNavbar'

// Placeholder images — replace with real assets in production
const DarkHeroImagePath = '/dark-image-hero.jpg'
const DarkHeroImageFallback =
    'data:image/svg+xml;utf8,' +
    '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="600">' +
    '<rect width="100%" height="100%" fill="%231a1a1a"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle"' +
    ' font-family="Inter, system-ui, sans-serif" font-size="24" fill="%23666">' +
    'Hero Image Placeholder</text>' +
    '</svg>'

const HERO_HEADING = 'Fuel your underwriting with the tech you deserve.'
const HERO_SUBTITLE =
    'We pair entrepreneurial spirit with expert-led innovation to help you scale ' +
    'faster—no more messy integrations or disconnected data. By replacing your ' +
    'patchwork of apps with our seamless end-to-end solution, we simplify your ' +
    'day and supercharge your success.'

const WHO_WE_CONNECT = [
    { icon: '🏛️', label: 'Insurers', desc: 'Capacity providers seeking cleaner data and tighter portfolio control.' },
    { icon: '🏢', label: "MGA's", desc: 'Managing General Agents running delegated authority with confidence.' },
    { icon: '🤝', label: 'Brokers', desc: 'Intermediaries placing risk simply and efficiently across markets.' },
    { icon: '⚙️', label: "TPA's", desc: 'Third Party Administrators managing claims and operations end-to-end.' },
    { icon: '➕', label: 'And many more', desc: 'Coverholders, reinsurers, and risk carriers — all connected.' },
]

export default function HomePage() {
    const year = new Date().getFullYear()

    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-white">
            {/* ── Navbar ─────────────────────────────────────────────────────── */}
            <ExternalNavbar />

            {/* ── Hero — dark background image ───────────────────────────────── */}
            <section className="relative w-full" style={{ minHeight: '680px' }}>
                {/* Background image with SVG fallback */}
                <img
                    src={DarkHeroImagePath}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                    onError={(e) => {
                        try {
                            e.currentTarget.onerror = null
                            e.currentTarget.src = DarkHeroImageFallback
                        } catch (_) { /* noop */ }
                    }}
                />
                {/* Dark overlay for text readability */}
                <div className="absolute inset-0 bg-black/50" />

                {/* Hero content */}
                <div
                    className="relative z-10 flex flex-col items-start justify-center text-left py-24 sm:py-32"
                    style={{ minHeight: '680px' }}
                >
                    <div className="mx-auto w-full max-w-7xl px-6 sm:px-8 lg:px-10">
                        <h1 className="max-w-4xl text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-tight">
                            <span className="text-white">{HERO_HEADING}</span>
                        </h1>
                        <p className="mt-6 max-w-3xl text-base sm:text-lg text-gray-200 leading-relaxed">
                            {HERO_SUBTITLE}
                        </p>
                    </div>
                </div>
            </section>

            {/* ── What We Do — beige section ──────────────────────────────────── */}
            <section
                className="relative z-20 w-full -mt-24 sm:-mt-36 pb-10"
                style={{ backgroundColor: brandColors.ui.homeBeige }}
            >
                <div className="pt-16 sm:pt-20 pb-10 px-6 sm:px-8 lg:px-10 max-w-7xl mx-auto">
                    <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                        What We Do
                    </h2>
                    <p className="mt-6 text-base sm:text-lg text-gray-600 leading-relaxed">
                        We partner with ambitious underwriters to launch and scale their operations
                        with confidence. You bring the talent — we provide the technology.
                    </p>
                    <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                        Our platform is built to connect the insurance supply chain and drive true
                        market collaboration. Whether you're a broker looking to place risk more
                        simply, an MGA managing portfolios, or a capacity provider overseeing
                        exposure, we give you the tools to work smarter and move faster.
                    </p>
                    <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                        We understand operations, technology, and data analytics — and we use that
                        knowledge to help you succeed. By improving data quality at every step, we
                        enable better decisions, closer relationships, and clearer visibility into risk.
                    </p>
                    <p className="mt-4 text-base sm:text-lg text-gray-600 leading-relaxed">
                        As a small firm with a mighty bandwidth of knowledge, we combine strategic
                        thinking with deep technical expertise to deliver solutions that are not only
                        beautifully designed, but built to perform. Together, we create digital
                        products and operational foundations that make a measurable difference.
                    </p>
                </div>
            </section>

            {/* ── Who We Connect — white section with image ─────────────────── */}
            <section className="relative z-20 w-full bg-white">
                {/* Right half image (desktop only) */}
                <div className="absolute inset-y-0 right-0 w-1/2 hidden lg:block">
                    <img
                        src="/second-placeholder.jpg"
                        alt=""
                        className="w-full h-full object-cover"
                    />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-10">
                    <div className="lg:w-1/2 lg:pr-12 py-16 sm:py-24 flex flex-col gap-8">
                        <div>
                            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight">
                                Who We Connect
                            </h2>
                            <p className="mt-4 text-base text-gray-600 leading-relaxed">
                                Our platform brings together every part of the insurance supply chain —
                                giving each participant the tools they need to collaborate, transact,
                                and grow.
                            </p>
                        </div>

                        <ul className="flex flex-col gap-4">
                            {WHO_WE_CONNECT.map(({ icon, label, desc }) => (
                                <li key={label} className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                        <span className="text-lg">{icon}</span>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-gray-900">{label}</p>
                                        <p className="text-sm text-gray-600 mt-0.5">{desc}</p>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        {/* Mobile image */}
                        <div className="block lg:hidden w-full aspect-[4/3] overflow-hidden">
                            <img src="/second-placeholder.jpg" alt="" className="w-full h-full object-cover" />
                        </div>
                    </div>
                </div>
            </section>

            {/* ── Footer ─────────────────────────────────────────────────────── */}
            <footer
                className="relative w-full py-8 bg-cover bg-center"
                style={{ backgroundImage: "url('/footer-image.jpg')" }}
            >
                <div className="absolute inset-0 bg-black/50" />
                <div className="relative z-10 mx-auto max-w-7xl px-6 sm:px-8 lg:px-10">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                        <p className="text-sm text-white/80">
                            © {year} The Policy Forge. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
