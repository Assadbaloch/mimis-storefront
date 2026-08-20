'use client';
import { useRouter } from 'next/navigation';
import { useLocation } from '@/lib/location';

// "Order from <store>" — sets the active location, THEN opens the menu.
//
// The two restaurants carry different Clover menus, so /menu is location-
// scoped: it renders whatever mimis-location says. A plain <Link href="/menu">
// therefore showed the previously-selected store no matter which button was
// pressed, which is the opposite of what the button says it does.
//
// setLocation() is the existing context setter; it writes both the localStorage
// copy (read by client components) and the cookie (read by the server-rendered
// menu). router.refresh() is required because /menu is a Server Component --
// without it Next can serve the already-rendered page for the old location.

export default function OrderAtLocationLink({ location, href = '/menu', className, children }) {
  const router = useRouter();
  const { setLocation } = useLocation();

  function go(e) {
    e.preventDefault();
    setLocation(location);
    router.push(href);
    router.refresh();
  }

  return (
    <a href={href} onClick={go} className={className}>
      {children}
    </a>
  );
}
