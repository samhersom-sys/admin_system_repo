
interface LoadingSpinnerProps {
    /** Accessible label. Defaults to "Loading". */
    label?: string
    /** Tailwind size class, e.g. 'h-8 w-8'. Defaults to 'h-6 w-6'. */
    size?: string
}

/**
 * LoadingSpinner — inline SVG spinner with accessible role.
 *
 * Use this as the loading state for any async component.
 * Always renders data-testid="loading-spinner" for test targeting.
 */
export default function LoadingSpinner({
    label = 'Loading',
    size = 'h-6 w-6',
}: LoadingSpinnerProps) {
    return (
        <span
            role="status"
            aria-label={label}
            data-testid="loading-spinner"
            className="inline-flex items-center justify-center"
        >
            <svg
                className={`${size} animate-spin text-brand-500`}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                aria-hidden="true"
            >
                <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                />
                <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
            </svg>
            <span className="sr-only">{label}</span>
        </span>
    )
}
