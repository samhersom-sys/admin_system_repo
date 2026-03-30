import LoginForm from './LoginForm/LoginForm'

/**
 * LoginPage — public route: /login
 *
 * Always shows the login form regardless of session state (OQ-B resolved 2026-03-14).
 * Auto-logout is handled by useInactivityLogout in AppLayout; the login page
 * must remain fully accessible so users can sign in as a different account.
 */
export default function LoginPage() {
  return (
    <div className="relative flex items-center justify-center min-h-screen overflow-hidden">
      {/* Background hero image */}
      <img
        src="/dark-image-hero.jpg"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Login card — floated above overlay */}
      <div className="relative z-10 w-[22rem] bg-white ring-1 ring-gray-100 shadow-xl p-8">
        {/* Brand mark */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">PolicyForge</h1>
          <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>
        </div>

        <LoginForm />
      </div>
    </div>
  )
}
