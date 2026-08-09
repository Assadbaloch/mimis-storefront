'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Which restaurant the customer is ordering from.
//
// Until 2026-08-10 the storefront had no concept of location at all: /menu
// listed every mimis.menu_items row from BOTH restaurants merged together (so
// the ~118 items both stores carry appeared twice), and checkout posted a
// hardcoded location: 'Madison Heights' -- meaning Warren could not receive an
// online order at all, no matter what the customer picked, because there was
// nothing to pick.
//
// The selection is persisted in TWO places on purpose:
//   * localStorage -- read by client components (header, cart, checkout)
//   * a cookie      -- read by SERVER components (/menu, /menu/[item]) which
//                      render before any client JS runs and therefore cannot
//                      see localStorage
// Both are written together by setLocation() so they can never disagree.
//
// DEFAULT_LOCATION is what a first-time visitor gets server-side before they
// have chosen. It is deliberately the long-established store, so the page a
// brand-new visitor sees is never empty.

const LocationContext = createContext(null);

export const LOCATION_COOKIE = 'mimis-location';
export const LOCATION_STORAGE_KEY = 'mimis-location-v1';
export const DEFAULT_LOCATION = 'Madison Heights';

function readStoredLocation() {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(LOCATION_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

function writeLocationCookie(location) {
  if (typeof document === 'undefined') return;
  // One year, site-wide. Not HttpOnly -- it is a display preference, not a
  // credential, and the client half of the app needs to read it too.
  const value = encodeURIComponent(location);
  document.cookie = `${LOCATION_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function LocationProvider({ children }) {
  const [locations, setLocations] = useState([]);
  const [location, setLocationState] = useState(DEFAULT_LOCATION);
  // `chosen` = the customer has actively picked, vs. silently defaulted. Drives
  // the first-visit prompt, which must not nag someone who already decided.
  const [chosen, setChosen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readStoredLocation();
    if (stored) {
      setLocationState(stored);
      writeLocationCookie(stored);
    } else {
      setChosen(false);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const supabase = getSupabasePublicClient();
    supabase
      .from('store_locations')
      .select('location, display_name, display_address, display_phone, status_label')
      .order('location', { ascending: true })
      .then(({ data, error }) => {
        if (error || !data) return;
        setLocations(data);
        // Guard against a stored value that no longer exists (store renamed or
        // removed) leaving the customer pinned to a location with no menu.
        setLocationState((current) =>
          data.some((l) => l.location === current) ? current : (data[0]?.location ?? DEFAULT_LOCATION)
        );
      });
  }, []);

  const setLocation = useCallback((next) => {
    setLocationState(next);
    setChosen(true);
    try {
      window.localStorage.setItem(LOCATION_STORAGE_KEY, next);
    } catch {
      /* private browsing -- cookie below still carries the choice */
    }
    writeLocationCookie(next);
  }, []);

  const api = useMemo(() => ({
    location,
    locations,
    setLocation,
    hydrated,
    // True only once we know the customer has never picked AND there is more
    // than one store to pick between -- a single-location business should
    // never be asked.
    needsChoice: hydrated && !chosen && locations.length > 1,
    current: locations.find((l) => l.location === location) || null,
  }), [location, locations, setLocation, hydrated, chosen]);

  return <LocationContext.Provider value={api}>{children}</LocationContext.Provider>;
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
