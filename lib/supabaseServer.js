// Deliberately unused/empty. The storefront never needs the Supabase service
// role key: anon-key + Auth JWT (RLS-gated, enforced further by the
// trg_guard_menu_item_admin_fields trigger) covers every read and write the
// public menu, checkout, and admin editor need -- the same anon-key + JWT
// pattern already used by dashboard/index.html and kds/index.html. Kept as a
// placeholder only; wire up a real service-role client here if a future
// feature genuinely needs to bypass RLS from a server route.
export {};
