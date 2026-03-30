import { useNavigate } from 'react-router-dom'
import { FiAlertCircle } from 'react-icons/fi'

/**
 * NotFound — rendered for all unbuilt routes.
 * Used by settings tile destinations that are not yet implemented.
 */
export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-4 p-6">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
        <FiAlertCircle className="w-8 h-8 text-gray-400" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900">Page not found</h2>
      <p className="text-gray-500 max-w-sm">
        This section hasn't been built yet. Check back soon.
      </p>
      <button
        onClick={() => navigate(-1)}
        className="mt-2 text-sm text-brand-600 hover:text-brand-700 underline"
      >
        Go back
      </button>
    </div>
  )
}
