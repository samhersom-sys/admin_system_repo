import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    /** Optional heading rendered above the content area. Accepts a string or JSX. */
    title?: ReactNode
    /** Extra Tailwind classes applied to the outer container. */
    className?: string
}

/**
 * Card — standard surface wrapper.
 *
 * Provides the shared white rounded-lg shadow-sm appearance used
 * across dashboard widgets and detail panels.
 */
export default function Card({ children, title, className = '' }: CardProps) {
    return (
        <div
            className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
        >
            {title && (
                <div className="border-b border-gray-200 px-4 py-3">
                    <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
                </div>
            )}
            <div className="p-4">{children}</div>
        </div>
    )
}
