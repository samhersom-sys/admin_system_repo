/**
 * InstallBanner — floating PWA install prompt.
 *
 * Renders only when the browser fires beforeinstallprompt (Chrome/Edge desktop + Android).
 * Safari on iOS does not support this API — banner will never appear there.
 *
 * Requirements: pwa-install.requirements.md
 */
import React from 'react'
import { FiDownload, FiX } from 'react-icons/fi'
import { usePwaInstall } from './usePwaInstall'
import { brandClasses } from '@/shared/lib/design-tokens/brandClasses'

export default function InstallBanner() {
  const { canInstall, install, dismiss } = usePwaInstall()

  if (!canInstall) return null

  return (
    <div
      role="complementary"
      aria-label="Install app"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 w-[calc(100%-3rem)] max-w-sm"
    >
      <FiDownload className="w-5 h-5 flex-shrink-0 text-brand-400" />
      <p className="flex-1 text-sm">
        Install <span className="font-semibold">PolicyForge</span> for a better experience.
      </p>
      <button
        onClick={install}
        className={`${brandClasses.button.primaryMedium} flex-shrink-0 whitespace-nowrap`}
      >
        Install
      </button>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="flex-shrink-0 p-1 rounded-md hover:bg-white/10 transition-colors"
      >
        <FiX className="w-4 h-4" />
      </button>
    </div>
  )
}
