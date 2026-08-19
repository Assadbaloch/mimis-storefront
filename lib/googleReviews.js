// Live Google reviews via the Places API (New).
//
// The API key is read from GOOGLE_PLACES_API_KEY and never leaves the server:
// it is not in the database, not in storefront_settings, and not shipped to the
// browser. That is deliberate -- an anon-readable settings row or a client-side
// fetch would publish the key to anyone who opens devtools. The only piece the
// admin manages is the Place ID, which is public information anyway (it appears
// in Google Maps URLs) and lives on mimis.store_locations.
//
// Not configured == not rendered. If the key or the Place ID is missing, or
// Google errors, this returns null and the reviews section renders nothing
// rather than showing a half-broken block. Invented placeholder testimonials
// are never substituted -- fake social proof on a live restaurant is worse than
// an absent section.
//
// Caching: Google's Places terms allow caching place content for a limited
// period (Place IDs indefinitely, other fields up to 30 days). 24h keeps us far
// inside that while avoiding an API call on every page render, since the home
// page is force-dynamic.

const TTL_MS = 24 * 60 * 60 * 1000;
const CACHE = new Map();

const ENDPOINT = 'https://places.googleapis.com/v1/places';
const SEARCH_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = 'rating,userRatingCount,googleMapsUri,reviews';

const ID_CACHE = new Map();

/**
 * Finds a Place ID from a plain name + address string.
 *
 * Exists so nobody has to go hunting through Google's Place ID Finder: the
 * addresses are already in mimis.store_locations, so the only thing an owner
 * must supply is the API key. A saved google_place_id always wins over this --
 * lookup is the fallback, not the primary, so a business with a fussy listing
 * can still be pinned by hand.
 */
export async function resolvePlaceId(query) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !query) return null;
  if (ID_CACHE.has(query)) return ID_CACHE.get(query);

  try {
    const res = await fetch(SEARCH_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id',
      },
      body: JSON.stringify({ textQuery: query, maxResultCount: 1 }),
      next: { revalidate: 86400 },
    });
    if (!res.ok) {
      console.error('resolvePlaceId', query, res.status);
      return null;
    }
    const json = await res.json();
    const id = json.places?.[0]?.id || null;
    // Cache misses too -- a bad address shouldn't re-query on every render.
    ID_CACHE.set(query, id);
    return id;
  } catch (err) {
    console.error('resolvePlaceId', query, err.message);
    return null;
  }
}

/**
 * @returns {Promise<null | {
 *   rating: number|null,
 *   total: number|null,
 *   mapsUrl: string|null,
 *   reviews: Array<{quote:string, author:string, authorUrl:string|null,
 *                   photo:string|null, rating:number, when:string|null}>
 * }>}
 */
export async function getGoogleReviews(placeId, limit = 5) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const cached = CACHE.get(placeId);
  if (cached && Date.now() - cached.at < TTL_MS) return trim(cached.value, limit);

  try {
    const res = await fetch(`${ENDPOINT}/${encodeURIComponent(placeId)}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      console.error('getGoogleReviews', placeId, res.status, await res.text().catch(() => ''));
      // Serve the last good copy rather than blanking the section because
      // Google rate-limited one render.
      return cached ? trim(cached.value, limit) : null;
    }

    const json = await res.json();
    const value = {
      rating: typeof json.rating === 'number' ? json.rating : null,
      total: typeof json.userRatingCount === 'number' ? json.userRatingCount : null,
      mapsUrl: json.googleMapsUri || null,
      reviews: (json.reviews || [])
        .map((r) => ({
          quote: r.text?.text || r.originalText?.text || '',
          author: r.authorAttribution?.displayName || '',
          authorUrl: r.authorAttribution?.uri || null,
          photo: r.authorAttribution?.photoUri || null,
          rating: Number(r.rating) || 0,
          when: r.relativePublishTimeDescription || null,
        }))
        .filter((r) => r.quote),
    };

    CACHE.set(placeId, { at: Date.now(), value });
    return trim(value, limit);
  } catch (err) {
    console.error('getGoogleReviews', placeId, err.message);
    return cached ? trim(cached.value, limit) : null;
  }
}

function trim(value, limit) {
  if (!value) return null;
  const n = Number(limit);
  if (!(n > 0)) return value;
  return { ...value, reviews: value.reviews.slice(0, n) };
}

/** Whether the server has an API key at all -- for the admin status indicator. */
export function isGooglePlacesConfigured() {
  return Boolean(process.env.GOOGLE_PLACES_API_KEY);
}
