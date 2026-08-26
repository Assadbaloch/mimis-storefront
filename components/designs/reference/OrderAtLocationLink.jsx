'use client';
import { useRouter } from 'next/navigation';
import { useLocationSwitch } from '@/components/LocationPicker';

// "Order from <store>" — selects the store, THEN opens the menu.
//
// The two restaurants carry different Clover menus, so /menu is location-scoped
// and renders whatever the location cookie says. A plain <Link href="/menu">
// therefore opened the previously-selected store no matter which button was
// pressed, which is the opposite of what the button says it does.
//
// Goes through useLocationSwitch rather than calling setLocation directly. That
// hook owns the rule that changing store empties the basket: cart lines are
// keyed by clover_item_id and the two restaurants are separate Clover merchant
// accounts, so carrying a basket across sends ids the receiving account does not
// recognise. It also issues the router.refresh() the server-rendered menu needs.
// Calling setLocation here instead would have silently skipped both.

export default function OrderAtLocationLink({ location, href = '/menu', className, children }) {
  const router = useRouter();
  const switchTo = useLocationSwitch();

  function go(e) {
    e.preventDefault();
    // Returns false when the customer declines emptying a non-empty basket --
    // in that case stay put rather than navigating to the other store's menu.
    if (!switchTo(location)) return;
    router.push(href);
  }

  return (
    <a href={href} onClick={go} className={className}>
      {children}
    </a>
  );
}
