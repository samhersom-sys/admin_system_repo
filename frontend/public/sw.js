// PolicyForge — minimal service worker
// Purpose: satisfies PWA installability criteria so Chrome/Edge fire beforeinstallprompt.
// Strategy: network-first — no caching. Keeps dev environment predictable.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})
