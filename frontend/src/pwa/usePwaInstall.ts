import { useState, useEffect } from 'react'

/**
 * usePwaInstall — captures the browser's beforeinstallprompt event
 * and exposes install / dismiss controls.
 *
 * Requirements: pwa-install.requirements.md REQ-PWA-F-001, F-003, F-004
 */

const DISMISS_KEY = 'pf_pwa_dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function usePwaInstall() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Do not show if dismissed this session
    if (sessionStorage.getItem(DISMISS_KEY)) return

    function handler(e: Event) {
      e.preventDefault()
      setPromptEvent(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!promptEvent) return
    await promptEvent.prompt()
    await promptEvent.userChoice
    setPromptEvent(null)
  }

  function dismiss() {
    sessionStorage.setItem(DISMISS_KEY, '1')
    setPromptEvent(null)
  }

  return { canInstall: !!promptEvent, install, dismiss }
}
