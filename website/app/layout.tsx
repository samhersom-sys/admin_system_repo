import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
    title: 'The Policy Forge — Insurance Applications',
    description:
        'We pair entrepreneurial spirit with expert-led innovation to help you scale faster. ' +
        'Replacing your patchwork of apps with a seamless end-to-end insurance platform.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    )
}
