/**
 * registerServiceWorker — registers /sw.js on page load.
 *
 * doRegister() is exported separately so it can be unit-tested
 * without triggering the window 'load' event.
 *
 * Requirements: pwa-install.requirements.md REQ-PWA-F-006
 */
import { logger } from '@/shared/lib/logger/logger'

export function doRegister(): void {
  if (!('serviceWorker' in navigator)) return
  navigator.serviceWorker.register('/sw.js').catch((err) => {
    logger.warn('Service worker registration failed:', err)
  })
}

export function registerServiceWorker(): void {
  window.addEventListener('load', doRegister)
}
