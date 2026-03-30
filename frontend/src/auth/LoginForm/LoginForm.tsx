import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { post as apiPost } from '@/shared/lib/api-client/api-client'
import { storeSession } from '@/shared/lib/auth-session/auth-session'
import LoadingSpinner from '@/shared/LoadingSpinner/LoadingSpinner'

/**
 * LoginForm — handles credential submission and session storage.
 *
 * Architecture rules:
 *   - Uses api-client.post() for all HTTP requests (no direct fetch).
 *   - Uses auth-session.storeSession() for token persistence (no direct localStorage).
 *   - Emits no events; handles its own redirect via useNavigate.
 */

/* Eye SVG icons — inline to avoid external dependencies (no hex literals per RULE-02) */
function EyeIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    )
}

function EyeOffIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="h-4 w-4">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    )
}

export default function LoginForm() {
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    function handleForgotPassword() {
        alert('Contact your administrator to reset your password.')
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        // Client-side empty field validation (R-AUTH-EMPTY)
        if (!email.trim() || !password) {
            setError('Please enter both email and password.')
            return
        }

        setLoading(true)

        try {
            const response = await apiPost<{ token: string; user: Record<string, unknown> }>(
                '/api/auth/login',
                { email, password }
            )
            // API returns { token, user } — map fullName → name for SessionUser
            storeSession({
                token: response.token,
                user: {
                    ...response.user,
                    name: (response.user.fullName as string) ?? (response.user.name as string) ?? '',
                } as import('@/shared/lib/auth-session/auth-session').SessionUser,
            })
            navigate('/app-home')
        } catch (err: unknown) {
            const anyErr = err as Record<string, unknown>
            const response = anyErr?.response as Record<string, unknown> | undefined
            const status = (response?.status ?? anyErr?.status) as number | undefined
            const data = response?.data as Record<string, unknown> | undefined

            if (status === 423) {
                setError('Your account has been locked. Please contact your administrator.')
            } else if (status === 401) {
                const attemptsRemaining = data?.attemptsRemaining
                if (typeof attemptsRemaining === 'number') {
                    setError(`Incorrect email or password. ${attemptsRemaining} attempts remaining.`)
                } else {
                    setError('Incorrect email or password.')
                }
            } else {
                setError('Something went wrong. Please try again later.')
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <form
            aria-label="Sign in"
            onSubmit={handleSubmit}
            noValidate
        >
            {error && (
                <div role="alert" className="mb-4 rounded-md bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                </div>
            )}

            <div className="mb-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                </label>
                <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={loading}
                    placeholder="email@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                />
            </div>

            <div className="mb-6">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Password
                </label>
                <div className="relative">
                    <input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        disabled={loading}
                        placeholder="Enter your password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 disabled:opacity-50"
                    />
                    <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                        tabIndex={-1}
                    >
                        {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                </div>
            </div>

            <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-60 transition-colors"
            >
                {loading && <LoadingSpinner size="h-4 w-4" label="Signing in" />}
                Sign In
            </button>

            <p className="mt-4 text-center text-sm text-gray-500">
                <button
                    type="button"
                    onClick={handleForgotPassword}
                    className="cursor-pointer text-gray-500 hover:text-gray-700 hover:underline bg-transparent border-none p-0"
                >
                    Forgot password?
                </button>
            </p>
        </form>
    )
}
