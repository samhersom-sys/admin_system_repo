/**
 * API Client — thin fetch wrapper for all HTTP calls.
 *
 * Responsibilities:
 *   - Attaches `Authorization: Bearer <token>` header from the current session.
 *   - Attaches `x-org-code` header from the current session.
 *   - Parses JSON responses and throws on non-2xx status codes.
 *
 * Components and services MUST use this module for all HTTP requests.
 * Direct `fetch()` calls are forbidden anywhere else in the codebase.
 */

import { getSession } from '@/shared/lib/auth-session/auth-session'
import { logger } from '@/shared/lib/logger/logger'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ApiError extends Error {
  status: number
  body: unknown
}

const LOCAL_API_HOSTS = new Set(['localhost', '127.0.0.1'])

type RuntimeLocation = {
  protocol: string
  hostname: string
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function buildHeaders(extra?: Record<string, string>): Record<string, string> {
  const session = getSession()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extra,
  }
  if (session?.token) {
    headers['Authorization'] = `Bearer ${session.token}`
  }
  if (session?.user?.orgCode) {
    headers['x-org-code'] = session.user.orgCode
  }
  return headers
}

function getRuntimeLocation(): RuntimeLocation | null {
  const override = (globalThis as { __POLICYFORGE_RUNTIME_LOCATION__?: RuntimeLocation })
    .__POLICYFORGE_RUNTIME_LOCATION__

  if (override) {
    return override
  }

  if (typeof window === 'undefined') {
    return null
  }

  return window.location
}

function resolveApiUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  const runtimeLocation = getRuntimeLocation()

  if (!runtimeLocation) {
    return url
  }

  const { protocol, hostname } = runtimeLocation

  if (LOCAL_API_HOSTS.has(hostname)) {
    return url
  }

  if (/^app\./i.test(hostname)) {
    return `${protocol}//${hostname.replace(/^app\./i, 'api.')}${url}`
  }

  return url
}

async function handleResponse<T>(res: Response, method: string, url: string): Promise<T> {
  let body: unknown
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    logger.apiError(method, url, res.status, body)
    const err = new Error(
      (body as { message?: string })?.message ?? `HTTP ${res.status}`
    ) as ApiError
    err.status = res.status
    err.body = body
    throw err
  }

  logger.response(method, url, res.status, body)
  return body as T
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function get<T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url)
  logger.request('GET', resolvedUrl)
  const res = await fetch(resolvedUrl, {
    method: 'GET',
    headers: buildHeaders(headers),
  })
  return handleResponse<T>(res, 'GET', resolvedUrl)
}

export async function post<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url)
  logger.request('POST', resolvedUrl, body)
  const res = await fetch(resolvedUrl, {
    method: 'POST',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'POST', resolvedUrl)
}

export async function put<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url)
  logger.request('PUT', resolvedUrl, body)
  const res = await fetch(resolvedUrl, {
    method: 'PUT',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'PUT', resolvedUrl)
}

export async function del<T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url)
  logger.request('DELETE', resolvedUrl)
  const res = await fetch(resolvedUrl, {
    method: 'DELETE',
    headers: buildHeaders(headers),
  })
  return handleResponse<T>(res, 'DELETE', resolvedUrl)
}

export async function patch<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const resolvedUrl = resolveApiUrl(url)
  logger.request('PATCH', resolvedUrl, body)
  const res = await fetch(resolvedUrl, {
    method: 'PATCH',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'PATCH', resolvedUrl)
}
