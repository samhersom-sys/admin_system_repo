import React, { Component, ReactNode } from 'react'
import { logger, _isDevEnv } from '@/shared/lib/logger/logger'

function handleReload() {
    window.location.reload()
}

interface ErrorBoundaryProps {
    /** Content to render when no error has occurred. */
    children: ReactNode
    /**
     * Optional custom fallback.  Receives the caught error so callers can
     * render context-specific messages.
     */
    fallback?: (error: Error) => ReactNode
}

interface ErrorBoundaryState {
    hasError: boolean
    error: Error | null
}

/**
 * ErrorBoundary — class component (required by React error boundary API).
 *
 * Wraps a subtree and catches any render/lifecycle errors in that subtree.
 * Renders an accessible alert fallback.  Optional `fallback` prop allows
 * callers to supply custom messaging.
 */
export default class ErrorBoundary extends Component<
    ErrorBoundaryProps,
    ErrorBoundaryState
> {
    constructor(props: ErrorBoundaryProps) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error }
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        // In production this is a no-op in the console — logger gates on NODE_ENV.
        // Wire this to an error-tracking service (e.g. Sentry) once configured.
        logger.error('[ErrorBoundary]', error, info)
    }

    render() {
        const { hasError, error } = this.state
        const { children, fallback } = this.props

        if (hasError && error) {
            if (fallback) return <>{fallback(error)}</>

            return (
                <div
                    role="alert"
                    className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
                >
                    <p className="font-medium">Something went wrong</p>
                    {_isDevEnv() ? (
                        // Development: show full error detail to help debugging.
                        // This block is removed from the production bundle by dead-code elimination.
                        <>
                            <p className="mt-1 text-xs text-red-500">{error.message}</p>
                            {error.stack && (
                                <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded bg-red-100 p-2 text-xs text-red-400">
                                    {error.stack}
                                </pre>
                            )}
                        </>
                    ) : (
                        // Production: generic message only — no implementation details exposed.
                        <p className="mt-1 text-xs text-red-500">
                            An unexpected error occurred. Please reload the page or contact support.
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleReload}
                        className="mt-3 text-xs font-medium text-red-700 underline hover:text-red-900"
                    >
                        Reload page
                    </button>
                </div>
            )
        }

        return <>{children}</>
    }
}
