import { notFound } from 'next/navigation';
import { getSupabasePublicClient } from '@/lib/supabaseClient';
import { getActiveLocation } from '@/lib/locationServer';
import { HOME_SLUG } from '@/lib/homeSlots';
import PageSections from '@/components/PageSections';
import { getThemePage } from '@/lib/theme';
import ThemePageBody from '@/components/ThemePageBody';

// Catch-all route for CMS pages. Anything staff create in the page builder is
// served here at mimispizza.astrixshop.com/<slug>.
//
// This is the LAST route Next.js tries -- real app routes (/menu, /checkout,
// /rewards, /admin, ...) always win, because a static segment beats a dynamic
// one. mimis.pages additionally refuses to save those slugs (see the
// check_reserved_slug trigger), so staff can't create a page that silently
// never appears.
//
// Only `status = 'published'` rows are visible: the anon RLS policy filters
// drafts out, so an unpublished page 404s for the public even though it exists.

// Kept short deliberately. With a longer window, hitting "Publish" left staff
// staring at a 404 for over a minute (Next caches the notFound() too), which
// reads as "the CMS is broken". 10s trades a little extra DB traffic on these
// low-volume marketing pages for publishing that feels immediate.
// CMS pages can contain product blocks, which are now location-scoped, so a
// single cached copy can no longer be shared across both restaurants.
export const dynamic = 'force-dynamic';

async function fetchPage(slug) {
  // 'home' is the record backing the built-in home page's editable slots (see
  // lib/homeSlots.js). It is deliberately NOT servable here -- otherwise the
  // same blocks would render both on "/" and again at "/home", which is
  // duplicate content and confusing to edit.
  if (slug === HOME_SLUG) return null;

  const supabase = getSupabasePublicClient();
  const { data: page } = await supabase
    .from('pages')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!page) return null;

  const { data: sections } = await supabase
    .from('page_sections')
    .select('*')
    .eq('page_id', page.id)
    .eq('active', true)
    .order('position', { ascending: true });

  return { page, sections: sections || [] };
}

// Menu data is fetched once per page (not once per section) and handed down,
// so a page with several menu blocks still costs a single query.
async function fetchMenuIfNeeded(sections) {
  const needsMenu = sections.some((s) => s.type === 'product_category' || s.type === 'product_showcase');
  if (!needsMenu) return [];
  const supabase = getSupabasePublicClient();
  const location = await getActiveLocation();
  const { data } = await supabase
    .from('menu_items')
    .select('*')
    .eq('available', true)
    .eq('location', location)
    .order('sort_order', { ascending: true });
  return data || [];
}

export async function generateMetadata({ params }) {
  const { slug } = await params;

  const themePage = await getThemePage(slug);
  if (themePage) {
    return {
      title: themePage.seo_title || `${themePage.title} | Mimi's Pizza & Burger`,
      description: themePage.seo_description || undefined,
    };
  }

  const result = await fetchPage(slug);
  if (!result) return {};
  const { page } = result;
  return {
    title: page.seo_title || `${page.title} | Mimi's Pizza & Burger`,
    description: page.seo_description || undefined,
  };
}

export default async function CmsPage({ params }) {
  const { slug } = await params;

  // A page of the ACTIVE THEME wins over a section-built CMS page. Themes are
  // the newer, primary authoring path; the section builder remains for pages
  // created before a theme existed, so neither breaks the other.
  const themePage = await getThemePage(slug);
  if (themePage) return <ThemePageBody page={themePage} />;

  const result = await fetchPage(slug);
  if (!result) notFound();

  const { page, sections } = result;
  const menuItems = await fetchMenuIfNeeded(sections);

  // The shared header/footer live in the root layout, so a child route can't
  // unmount them. Hiding them with CSS is the low-risk way to support a
  // standalone landing page without restructuring the layout for every other
  // page on the site.
  const hideChrome = [
    page.show_header ? '' : 'body > header { display: none !important; }',
    page.show_footer ? '' : 'body > footer { display: none !important; }',
  ].filter(Boolean).join('\n');

  return (
    <>
      {hideChrome && <style dangerouslySetInnerHTML={{ __html: hideChrome }} />}
      <PageSections sections={sections} menuItems={menuItems} />
    </>
  );
}
