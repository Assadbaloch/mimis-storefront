import { getSupabasePublicClient } from '@/lib/supabaseClient';

// Owner-authored sections for the built-in home page ("Mimi's Original Design").
//
// The page builder (mimis.pages + mimis.page_sections, rendered by
// components/PageSections.jsx) already powered custom pages at /<slug>, but the
// home page was hardcoded React -- so every page was editable except the most
// important one. Rather than replacing the curated home layout wholesale, the
// built-in blocks stay exactly where they are and owner sections drop into
// three named slots between them:
//
//   top    -- directly under the hero
//   middle -- after "Popular this week"
//   bottom -- above the footer, after the news strip  (default)
//
// The home page is stored under the reserved slug 'home'. app/[slug]/page.js
// refuses to serve that slug so the same content can't also appear at /home.

export const HOME_SLUG = 'home';

const EMPTY = { top: [], middle: [], bottom: [] };

export async function getHomeSlots() {
  const supabase = getSupabasePublicClient();

  const { data: page, error: pageErr } = await supabase
    .from('pages')
    .select('id, status')
    .eq('slug', HOME_SLUG)
    .maybeSingle();

  // No home record yet, or it's been unpublished: the built-in design renders
  // on its own exactly as before. Unpublishing is the owner's instant undo.
  if (pageErr || !page || page.status !== 'published') return EMPTY;

  const { data: sections, error: secErr } = await supabase
    .from('page_sections')
    .select('id, type, config, slot, position')
    .eq('page_id', page.id)
    .eq('active', true)
    .order('position', { ascending: true });

  if (secErr || !sections?.length) return EMPTY;

  const slots = { top: [], middle: [], bottom: [] };
  for (const s of sections) {
    // NULL slot = 'bottom', so sections authored before slots existed (and any
    // created through a UI that doesn't set one) still appear rather than
    // silently vanishing.
    (slots[s.slot] || slots.bottom).push(s);
  }
  return slots;
}
