'use client'

/**
 * Services Page — public route: /services
 *
 * Ported from frontend/app/features/external/ServicesPage.tsx.
 * Visual output is identical.
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching.
 *   - Colours via Tailwind classes only (REQ-WEB-C-008).
 */
import ExternalNavbar from '@/components/ExternalNavbar'

const SERVICES = [
    {
        icon: '📋',
        title: 'Submission Management',
        desc: 'Streamline the end-to-end submission lifecycle from intake to bind.',
    },
    {
        icon: '💹',
        title: 'Rating & Quoting',
        desc: 'Configurable rating engines that produce accurate, real-time quotes.',
    },
    {
        icon: '🔗',
        title: 'Delegated Authority',
        desc: 'MGA and coverholder tools with full audit trails and capacity visibility.',
    },
    {
        icon: '📊',
        title: 'Reporting & Analytics',
        desc: 'Portfolio dashboards and custom reports to drive sharper decisions.',
    },
]

export default function ServicesPage() {
    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-white">
            <ExternalNavbar />

            {/* Hero */}
            <section className="relative w-full" style={{ minHeight: '320px' }}>
                <img
                    src="/dark-image-hero.jpg"
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/50" />

                <div
                    className="relative z-10 flex flex-col items-start justify-center text-left px-6 sm:px-8 lg:px-10 py-20"
                    style={{ minHeight: '320px' }}
                >
                    <div className="mx-auto w-full max-w-6xl">
                        <h1 className="max-w-4xl text-5xl sm:text-6xl font-bold tracking-tight leading-tight text-white">
                            Services
                        </h1>
                        <p className="mt-6 max-w-3xl text-base sm:text-lg text-gray-200 leading-relaxed">
                            A seamless end-to-end platform for the modern insurance market.
                        </p>
                    </div>
                </div>
            </section>

            {/* Services grid */}
            <section className="w-full bg-white py-16">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-10">What We Offer</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                        {SERVICES.map(({ icon, title, desc }) => (
                            <div key={title} className="rounded-xl border border-gray-200 p-6">
                                <div className="text-3xl mb-4">{icon}</div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    )
}
