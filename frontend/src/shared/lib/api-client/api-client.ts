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
  logger.request('GET', url)
  const res = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(headers),
  })
  return handleResponse<T>(res, 'GET', url)
}

export async function post<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  logger.request('POST', url, body)
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'POST', url)
}

export async function put<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  logger.request('PUT', url, body)
  const res = await fetch(url, {
    method: 'PUT',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'PUT', url)
}

export async function del<T = unknown>(
  url: string,
  headers?: Record<string, string>
): Promise<T> {
  logger.request('DELETE', url)
  const res = await fetch(url, {
    method: 'DELETE',
    headers: buildHeaders(headers),
  })
  return handleResponse<T>(res, 'DELETE', url)
}

export async function patch<T = unknown>(
  url: string,
  body?: unknown,
  headers?: Record<string, string>
): Promise<T> {
  logger.request('PATCH', url, body)
  const res = await fetch(url, {
    method: 'PATCH',
    headers: buildHeaders(headers),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  return handleResponse<T>(res, 'PATCH', url)
}
