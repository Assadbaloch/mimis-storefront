'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

// Subtle, recurring nudge toward installing the PWA -- distinct on purpose
// from JoinNotifyBanner (which is a persistent card about Rewards/push
// opt-in). This one is small, appears briefly, and goes away on its own:
// the brief's exact ask was "frequent in very subtle places, gets the
// attention of the user for a very brief moment" plus a CTA that actually
// starts the install when tapped, not just a link to instructions.
//
// Real install eligibility is entirely the browser's call -- `beforeinstallprompt`
// only fires on Chromium-based browsers (Chrome/Edge on Android, desktop
// Chrome/Edge) when the site passes the installability checklist (manifest,
// service worker, not already installed, not dismissed too recently per the
// browser's own heuristic). iOS Safari never fires this event -- there is no
// programmatic install trigger there, only the manual "Add to Home Screen"
// flow in the share sheet, so this banner simply never appears on iOS rather
// than showing a CTA that can't do anything.
const DISMISSED_FOREVER_KEY = 'mimis-install-dismissed-forever';
const LAST_SHOWN_KEY = 'mimis-install-last-shown';
const SHOWN_COUNT_KEY = 'mimis-install-shown-count';
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000; // re-nudge at most every 3 days
const MAX_SHOWS = 6; // stop nudging for good after this many appearances
const AUTO_HIDE_MS = 8000; // "brief moment" -- disappears on its own if ignored

export default function InstallAppBanner() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Already installed and running standalone -- nothing to nudge toward.
    const standalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true;
    if (standalone) return;

    if (window.localStorage.getItem(DISMISSED_FOREVER_KEY)) return;

    const shownCount = Number(window.localStorage.getItem(SHOWN_COUNT_KEY) || '0');
    if (shownCount >= MAX_SHOWS) return;

    const lastShown = Number(window.localStorage.getItem(LAST_SHOWN_KEY) || '0');
    const dueForNudge = Date.now() - lastShown > COOLDOWN_MS;

    function handleBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!dueForNudge) return;
      setVisible(true);
      window.localStorage.setItem(LAST_SHOWN_KEY, String(Date.now()));
      window.localStorage.setItem(SHOWN_COUNT_KEY, String(shownCount + 1));
    }
    function handleAppInstalled() {
      window.localStorage.setItem(DISMISSED_FOREVER_KEY, '1');
      setVisible(false);
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Auto-hide after a few seconds if the customer just ignores it -- it'll
  // come back on a later visit (subject to the cooldown), so this isn't the
  // only chance to install, which is what makes it safe to be this brief.
  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => setVisible(false), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      // This is the actual native install trigger -- the one moment a site
      // is allowed to show the browser's real "Install app?" dialog.
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        window.localStorage.setItem(DISMISSED_FOREVER_KEY, '1');
      }
    } finally {
      setInstalling(false);
      setVisible(false);
      setDeferredPrompt(null);
    }
  }

  function handleDismiss() {
    setVisible(false);
  }

  // Back office has no business showing this; everywhere else (including
  // cart/checkout) is fair game since this is small enough not to interfere.
  if (pathname?.startsWith('/admin')) return null;
  if (!visible || !deferredPrompt) return null;

  return (
    <div className="fixed top-[5.5rem] inset-x-3 md:inset-x-auto md:right-5 md:max-w-xs z-40 animate-fade-in pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-cream/10 bg-ink/95 backdrop-blur-md shadow-xl shadow-black/30 px-3.5 py-2.5">
        <div className="w-8 h-8 rounded-lg bg-gold/15 flex items-center justify-center shrink-0">
          <span className="text-gold font-serif italic text-base">M</span>
        </div>
        <p className="flex-1 text-cream/80 text-xs leading-snug">Get the app for faster ordering.</p>
        <button
          type="button"
          onClick={handleInstallClick}
          disabled={installing}
          className="text-gold text-xs font-bold shrink-0 disabled:opacity-50"
        >
          {installing ? '…' : 'Install'}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className="text-cream/30 hover:text-cream/60 text-xs shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
