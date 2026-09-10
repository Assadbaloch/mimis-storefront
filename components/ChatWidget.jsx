'use client';
import { useEffect } from 'react';

// LeadConnector (GoHighLevel) chat widget.
//
// ---------------------------------------------------------------------------
// PLACEMENT: WE MOVE, IT DOESN'T
//
// Dropped in as-supplied, the launcher lands on top of the sticky cart bar --
// not near it, on it. Inspected on the live site, the widget builds a
// <chat-widget> custom element and puts everything inside a shadow root:
//
//   #lc_text-widget--btn   fixed; bottom:20px; right:20px   (58x58 launcher)
//   #lc_text-widget        fixed; bottom:20px; right:20px; z-index:99999999
//
// and CartBar occupies the same corner on desktop (md:right-5, ~58px tall) and
// the full width of the screen on mobile. So on the one screen where someone is
// trying to check out, the bubble covers the button that takes their money.
//
// The obvious fix -- override the widget's CSS -- was tried and abandoned. Its
// stylesheet is served cross-origin, so it is unreadable from script AND it
// outranks an injected rule: a `bottom: X !important` on #lc_text-widget--btn,
// and even an inline `!important` on the element itself, did not move it. The
// widget also rewrites its own inline styles as it opens and closes.
//
// Fighting that would mean a permanent race against a third party's build that
// can change without notice, on the checkout path. So the widget keeps its
// position, and OUR floating UI reserves room for it instead -- see
// --mimis-chat-reserve in globals.css, consumed by CartBar and
// JoinNotifyBanner. Deterministic, entirely in code we own, and it cannot be
// broken by a LeadConnector release.
//
// If the bubble itself ever needs to move, that is a setting in the GoHighLevel
// widget configuration, not a CSS change here.
// ---------------------------------------------------------------------------

const WIDGET_ID = '6aa1ed780f61f7f7c311df64';
const LOADER_SRC = 'https://widgets.leadconnectorhq.com/loader.js';
const RESOURCES_URL = 'https://widgets.leadconnectorhq.com/chat-widget/loader.js';

export default function ChatWidget() {
  useEffect(() => {
    // Guarded on the widget id rather than a ref: React 18 StrictMode invokes
    // effects twice in development, and a client-side route change could
    // remount this. Two loaders means two launchers stacked on each other.
    if (document.querySelector(`script[data-widget-id="${WIDGET_ID}"]`)) return;

    const s = document.createElement('script');
    s.src = LOADER_SRC;
    s.async = true;
    s.setAttribute('data-resources-url', RESOURCES_URL);
    s.setAttribute('data-widget-id', WIDGET_ID);
    s.setAttribute('data-source', 'WEB_USER');
    document.body.appendChild(s);

    // Deliberately not removed on unmount. The widget appends its own element
    // and listeners outside React's tree; tearing the script out would leave
    // those orphaned, and this component lives for the whole session anyway.
  }, []);

  return null;
}
