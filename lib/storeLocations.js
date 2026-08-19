import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Single source of truth for store details shown to customers.
//
// Until now the home page and the footer each carried their OWN hardcoded copy
// of the store list -- name, address and a status label -- while the database
// held a third copy in mimis.store_locations (the one the location picker and
// Uber Direct dispatch actually use). Predictably they drifted: both hardcoded
// copies still announced Warren as "Opening Soon" after it had gone live, and
// neither was editable from the admin.
//
// Everything customer-facing now reads this.

export async function getStoreLocations() {
  const supabase = getSupabasePublicClient();
  const { data, error } = await supabase
    .from('store_locations')
    .select('location, name, display_name, display_address, display_phone, status_label, address_line1, address_line2, city, state, postal_code, google_place_id')
    .order('location', { ascending: true });

  if (error || !data) return [];

  return data.map((l) => ({
    key: l.location,
    name: l.display_name || l.name || l.location,
    address: l.display_address
      || [l.address_line1, l.address_line2, [l.city, l.state, l.postal_code].filter(Boolean).join(' ')]
           .filter(Boolean).join(', '),
    phone: l.display_phone || null,
    status: l.status_label || '',
    placeId: l.google_place_id || null,
    // "Live" drives the highlighted badge and whether an Order button shows.
    // Derived from the status label rather than a separate flag so there's one
    // thing for staff to edit and the two can't contradict each other.
    live: !/opening soon|coming soon|closed/i.test(l.status_label || ''),
  }));
}
