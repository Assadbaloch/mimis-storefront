import { Fraunces } from 'next/font/google';
import './globals.css';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import MobileTabBar from '@/components/MobileTabBar';
import PwaRegister from '@/components/PwaRegister';
import JoinNotifyBanner from '@/components/JoinNotifyBanner';
import InstallAppBanner from '@/components/InstallAppBanner';
import { CartProvider } from '@/lib/cart';

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

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={fraunces.variable}>
      <body className="min-h-screen flex flex-col font-sans">
        <PwaRegister />
        <CartProvider>
          <SiteHeader />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
          <SiteFooter />
          <MobileTabBar />
          <JoinNotifyBanner />
          <InstallAppBanner />
        </CartProvider>
      </body>
    </html>
  );
}
