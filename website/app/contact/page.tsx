'use client'

/**
 * Contact Page — public route: /contact
 *
 * Ported from frontend/app/features/external/ContactPage.tsx.
 * Visual output is identical.
 *
 * Architecture rules:
 *   - No domain imports.
 *   - No data fetching.
 *   - Colours via Tailwind classes only (REQ-WEB-C-010).
 */
import ExternalNavbar from '@/components/ExternalNavbar'

export default function ContactPage() {
    return (
        <div className="relative isolate min-h-screen overflow-hidden bg-white">
            <ExternalNavbar />

            <div className="max-w-5xl mx-auto px-6 sm:px-8 lg:px-10 py-16">
                <h1 className="text-4xl font-bold text-gray-900">Contact Us</h1>
                <p className="mt-4 text-lg text-gray-700">
                    Interested in working with us or want to learn more? Get in touch.
                </p>

                <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">General Enquiries</h2>
                        <p className="text-sm text-gray-600">
                            For general questions about the platform, reach out to your relationship manager or
                            contact us via the details below.
                        </p>
                    </div>
                    <div className="rounded-xl border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">Support</h2>
                        <p className="text-sm text-gray-600">
                            Existing clients can contact the support team directly through the in-app help
                            channel or via your administrator.
                        </p>
                    </div>
                </div>

                <div className="mt-10 w-full aspect-[16/6] rounded-2xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-500">Map / contact form placeholder</span>
                </div>
            </div>
        </div>
    )
}
