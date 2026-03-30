import { useNavigate } from 'react-router-dom'
import { post as apiPost } from '@/shared/lib/api-client/api-client'
import { clearSession } from '@/shared/lib/auth-session/auth-session'

/**
 * LogoutButton — renders a "Sign out" button in the app chrome.
 *
 * Architecture rules:
 *   - Calls POST /api/auth/logout via api-client before clearing session.
 *   - Uses auth-session.clearSession() for token removal (no direct localStorage).
 *   - Navigates to /login after clearing the session.
 *   - Always clears session and navigates even if the API call fails.
 */
export default function LogoutButton() {
  const navigate = useNavigate()

  async function handleLogout() {
    try {
      await apiPost('/api/auth/logout', undefined)
    } catch {
      // Network failure must not trap the user — proceed with client-side logout
    }
    clearSession()
    navigate('/login')
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
    >
      Sign out
    </button>
  )
}
