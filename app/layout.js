import { headers } from 'next/headers';
import { Fraunces } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MobileTabBar from '@/components/MobileTabBar';
import PwaRegister from '@/components/PwaRegister';
import JoinNotifyBanner from '@/components/JoinNotifyBanner';
import InstallAppBanner from '@/components/InstallAppBanner';
import { CartProvider } from '@/lib/cart';
import { getThemeShell } from '@/lib/theme';
import { getEmbedContext } from '@/lib/themeContext';
import { renderEmbeds } from '@/lib/embeds';
import CartBridge from '@/components/CartBridge';
import ScrollToTop from '@/components/ScrollToTop';
import CartBar from '@/components/CartBar';

const fraunces = Fraunces({
  subsets: ['latin'],
  weight: ['600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-fraunces',
  display: 'swap',
});

export const metadata = {
  title: "Mimi's Pizza & Burger",
  description: 'Fresh, halal pizza & burgers made to order. Order online from Mimi\'s Pizza & Burger.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: "Mimi's",
  },
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

export const viewport = {
  themeColor: '#0e0906',
};

// Root layout renders one of two shells:
//
//   * THEMED  -- when a theme is active and its layout contains an outlet.
//     The theme's own header/footer/CSS wrap every route, including cart,
//     checkout and order tracking, so they inherit the design automatically.
//
//   * DEFAULT -- the original React chrome. Used whenever there is no active
//     theme, which is the case today.
//
// This split is why introducing the theme system cannot break the live site:
// nothing changes until a theme is deliberately activated, and reverting is a
// single status update.
export default async function RootLayout({ children }) {
  // Admin screens are never themed: the storefront's header/footer wrapping the
  // editing tools makes them confusing to use, and a broken theme would take
  // the admin down with it -- leaving no way to switch back.
  const path = (await headers()).get('x-mimis-path') || '';
  const isAdmin = path.startsWith('/admin');

  // Shop pages (menu, cart, checkout, rewards, tracking) are React pages styled
  // with their own palette. A theme's `body { background: … }` bleeds into them
  // and can make their text unreadable -- e.g. a light theme leaves cream text
  // on white. They are wrapped in an isolated surface below so the theme styles
  // the chrome around them without corrupting their contents.
  const APP_ROUTES = ['/menu', '/cart', '/checkout', '/rewards', '/order-status', '/order-confirmed'];
  const isAppRoute = APP_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));

  const shell = isAdmin ? null : await getThemeShell();

  // Header/footer chrome can contain embeds too (logo, cart badge, phone),
  // so the layout halves go through the same renderer as page bodies.
  let before = '';
  let after = '';
  if (shell) {
    const ctx = await getEmbedContext();
    before = renderEmbeds(shell.layout.before, ctx);
    after = renderEmbeds(shell.layout.after, ctx);
  }

  return (
    <html lang="en" className={fraunces.variable}>
      <body className={shell ? 'mimis-themed' : 'min-h-screen flex flex-col font-sans'}>
        <PwaRegister />
        <ScrollToTop />
        <CartProvider>
          {shell ? (
            <>
              {/* Theme <head> content is emitted at the top of <body>, not inside
                  <head>. Next.js owns the real <head>, and injecting arbitrary
                  markup there produces invalid HTML that browsers relocate anyway.
                  <link rel="stylesheet"> and <style> are both valid in <body> and
                  apply identically, so theme fonts and CSS work correctly here. */}
              <div
                data-mimis-theme-head
                style={{ display: 'contents' }}
                dangerouslySetInnerHTML={{
                  __html: [
                    // Token derivation MUST come before the theme's CSS.
                    // Themes are required to define the core --mimis-* tokens
                    // (bg, surface, text, text-soft, accent, accent-contrast,
                    // line, radius, fonts). The extended tokens below default
                    // to values derived FROM those core tokens, so a theme
                    // that never mentions them still gets a coherent palette
                    // — and a theme that does define them wins, because its
                    // stylesheet loads after this block. The theme is the
                    // source of truth; nothing falls back to the original
                    // dark design while a theme is active.
                    `<style data-mimis-token-derivation>
:root{
  --mimis-surface-strong: var(--mimis-bg);
  --mimis-highlight: var(--mimis-accent);
  --mimis-highlight-contrast: var(--mimis-accent-contrast);
  --mimis-danger: #c0392b;
}
</style>`,
                    shell.layout.head,
                    shell.theme.head_snippet || '',
                    shell.theme.global_css ? `<style>${shell.theme.global_css}</style>` : '',
                  ].filter(Boolean).join('\n'),
                }}
              />
              {/* Shop pages read every colour/font/radius from the --mimis-*
                  tokens, which the theme's own CSS defines — so they follow
                  the active theme with no isolation or re-assertion needed.
                  The only structural rule: their sticky sub-headers (menu
                  search / category tabs) offset below the theme's header so
                  the two don't overlap. */}
              <style dangerouslySetInnerHTML={{ __html: `
                [data-mimis-app-surface]{ display:block; background: var(--mimis-bg); color: var(--mimis-text); font-family: var(--mimis-font-body); }
                [data-mimis-app-surface] .sticky{ top: var(--mimis-header-height, 0px); }
              ` }} />
              <div dangerouslySetInnerHTML={{ __html: before }} />
              <main data-mimis-content {...(isAppRoute ? { 'data-mimis-app-surface': '' } : {})}>
                {children}
              </main>
              <div dangerouslySetInnerHTML={{ __html: after }} />
              <CartBridge />
            </>
          ) : (
            <>
              <SiteHeader />
              <main className="flex-1 pb-20 md:pb-0">{children}</main>
              <SiteFooter />
              <MobileTabBar />
            </>
          )}
          {/* Rendered for BOTH shells: with a theme active there is no bottom
              tab bar, so this is the only persistent route to checkout once a
              customer has started adding items. */}
          <CartBar />
          <JoinNotifyBanner />
          <InstallAppBanner />
        </CartProvider>
      </body>
    </html>
  );
}
