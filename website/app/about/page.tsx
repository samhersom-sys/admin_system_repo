'use client'

/**
 * About Page — public route: /about
 *
 * Ported from frontend/app/features/external/AboutPage.tsx.
 * Visual output is identical.
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching.
 *   - Colours via Tailwind classes only (REQ-WEB-C-006).
 */
import ExternalNavbar from '@/components/ExternalNavbar'

export default function AboutPage() {
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
                            About Us
                        </h1>
                        <p className="mt-6 max-w-3xl text-base sm:text-lg text-gray-200 leading-relaxed">
                            Introducing our team, mission, and what makes us different.
                        </p>
                    </div>
                </div>
            </section>

            {/* Content */}
            <section className="w-full bg-white py-16">
                <div className="max-w-6xl mx-auto px-6 sm:px-8 lg:px-10">
                    <div className="text-left">
                        <h2 className="text-2xl font-semibold text-gray-900">Our Story</h2>
                        <p className="mt-3 text-gray-700">
                            The Policy Forge helps insurance organizations craft effective workflows with clarity
                            and impact — pairing entrepreneurial spirit with expert-led innovation.
                        </p>
                    </div>
                </div>
            </section>
        </div>
    )
}
