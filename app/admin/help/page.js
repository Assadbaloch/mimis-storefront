'use client';
import Link from 'next/link';

// Complete reference for the storefront admin.
//
// Written for someone running a restaurant, not a developer: it explains what
// each screen controls, which parts are safe to change, and -- importantly --
// which things are owned by Clover or by the database and therefore CANNOT be
// edited here. Most support questions on this system have been "why can't I
// change X" or "why did my edit disappear", and both have the same root cause:
// not knowing where a given piece of content actually lives.

function Section({ id, title, children }) {
  return (
    <section id={id} className="mb-10 scroll-mt-24">
      <h2 className="font-serif font-bold text-2xl text-cream mb-3">{title}</h2>
      <div className="space-y-3 text-cream/70 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Row({ label, children }) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] gap-1 sm:gap-4 py-2 border-b border-cream/[0.07]">
      <div className="text-cream font-semibold text-sm">{label}</div>
      <div className="text-cream/65 text-sm leading-relaxed">{children}</div>
    </div>
  );
}

function Callout({ tone = 'info', title, children }) {
  const tones = {
    info: 'border-gold/25 bg-gold/[0.06]',
    warn: 'border-brick/40 bg-brick/[0.08]',
  };
  return (
    <div className={`rounded-xl border ${tones[tone]} p-4 my-3`}>
      {title && <p className="text-cream font-semibold text-sm mb-1">{title}</p>}
      <div className="text-cream/70 text-sm leading-relaxed space-y-2">{children}</div>
    </div>
  );
}

const CONTENTS = [
  ['where', 'Where everything lives'],
  ['nav', 'The five screens'],
  ['menu', 'Menu — photos, descriptions, badges'],
  ['merge', 'Fixing duplicate items'],
  ['locations-system', 'How the two restaurants work'],
  ['pages', 'Pages — your home page and more'],
  ['blocks', 'Every block you can add'],
  ['themes', 'Themes'],
  ['media', 'Media library'],
  ['settings', 'Storefront settings'],
  ['troubleshoot', 'When something looks wrong'],
];

export default function AdminHelpPage() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-10">
      <h1 className="font-serif font-bold text-3xl text-cream mb-2">Help &amp; guide</h1>
      <p className="text-cream/55 text-sm mb-8">
        What every screen controls, and what you can and can&rsquo;t change from here.
      </p>

      <nav className="rounded-xl border border-cream/12 bg-cream/[0.03] p-4 mb-10">
        <p className="text-cream/45 text-[11px] uppercase tracking-wide mb-2">On this page</p>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1">
          {CONTENTS.map(([id, label]) => (
            <li key={id}>
              <a href={`#${id}`} className="text-gold/80 hover:text-gold text-sm">{label}</a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="where" title="Where everything lives">
        <p>
          Three different systems feed the website. Knowing which one owns a piece of content tells
          you where to change it — and why some things are read-only here.
        </p>
        <Row label="Clover (your POS)">
          Item names, prices, categories, and whether something is available. These sync
          automatically every hour. You cannot edit them in this admin — anything typed here would
          be overwritten at the next sync. Change them in Clover.
        </Row>
        <Row label="This admin">
          Everything customers see that isn&rsquo;t a price: photos, videos, descriptions, badges,
          featured items, display order, page layout, and your logo.
        </Row>
        <Row label="Store details">
          Addresses, phone numbers and the &ldquo;Now Taking Orders&rdquo; label come from your saved
          store records, and are used by the website, the location picker and delivery dispatch at
          once. Change them in one place and everything follows.
        </Row>
      </Section>

      <Section id="nav" title="The five screens">
        <Row label="Menu">Photos, descriptions and badges for the things you sell.</Row>
        <Row label="Pages">Your home page, plus any extra pages you create.</Row>
        <Row label="Themes">Switch the whole site between the built-in design and an imported one.</Row>
        <Row label="Media">Every picture and video you&rsquo;ve uploaded, in one place.</Row>
        <Row label="Storefront Settings">Logo, business info, and the press clips used by the news block.</Row>
      </Section>

      <Section id="menu" title="Menu — photos, descriptions, badges">
        <p>
          One card per product. If both restaurants sell it, you get <strong>one</strong> card, not
          two — the line under the name says <em>&ldquo;One edit updates 2 locations&rdquo;</em>.
          Upload a photo once and both get it.
        </p>
        <Row label="Location chips">
          The small pills under each name show what each restaurant charges and whether it&rsquo;s
          currently available. These come from Clover and are read-only.
        </Row>
        <Row label="shared / own">
          Click that word on a location chip to switch it. <strong>shared</strong> means the location
          uses the common photo and description. <strong>own</strong> lets one restaurant keep a
          different picture — use it only when they genuinely plate the dish differently, because
          while it&rsquo;s set to &ldquo;own&rdquo; that location stops receiving your updates.
        </Row>
        <Row label="Description">Optional. Shown under the item name on the storefront.</Row>
        <Row label="Badge">A short flag like HOT or NEW that appears on the item&rsquo;s photo.</Row>
        <Row label="Featured">
          Ticking this puts the item in the &ldquo;Popular this week&rdquo; block on the home page.
        </Row>
        <Row label="Sort order">
          Lower numbers appear first. Leave at 0 to use the normal menu order.
        </Row>
        <Row label="Manage media">
          Drag and drop several photos or videos at once. Drag the thumbnails to reorder —
          <strong> the first one is the cover</strong> that shows in the menu grid. The rest become a
          gallery on the product page.
        </Row>
        <Callout title="Always press Save">
          Photos upload immediately, but the description, badge, featured tick and sort order only
          apply when you press <strong>Save</strong> on that card.
        </Callout>
      </Section>

      <Section id="merge" title="Fixing duplicate items">
        <p>
          Clover sometimes lists the same dish twice — an older entry and the one you sell under now
          (for example <em>16in Yummy Pizza</em> and <em>1. Mimi&rsquo;s Yummy Pizza (XL 16&quot;)</em>).
          Photos usually ended up on the old one, so the item customers actually order looks empty.
        </p>
        <p>Two filters in the dropdown find these for you:</p>
        <Row label="⚠ Photos only one location sees">
          Items that have a picture but are carried by just one restaurant. These are your merge
          candidates.
        </Row>
        <Row label="⚠ Shared items with no photo">
          Items both restaurants sell that have no picture — the same problem seen from the other end.
        </Row>
        <p>
          On a card, open <strong>Same as another item…</strong>, search for the name you actually
          sell under, and press Merge. The photos, gallery and description move across, and every
          location points at the surviving item.
        </p>
        <Callout tone="warn" title="Merging is one-way">
          The item you pick is <strong>kept</strong>; the card you&rsquo;re on is folded into it and
          disappears. The kept item keeps anything it already had — the other one only fills gaps.
          There&rsquo;s no undo button, so read the confirmation before agreeing.
        </Callout>
        <p>
          The retired name is remembered, so the next hourly Clover sync won&rsquo;t recreate the
          duplicate and undo your work. Merging does not change anything in Clover — staff will still
          see both entries at the till. Tidying the catalogue there is worth doing separately.
        </p>
      </Section>

      <Section id="locations-system" title="How the two restaurants work">
        <p>
          Customers pick a restaurant in the site header, and that choice drives everything: which
          menu they see, the prices, and where their order is sent. The two menus are genuinely
          different — each restaurant has items the other doesn&rsquo;t.
        </p>
        <Callout title="Switching store empties the basket">
          That&rsquo;s deliberate. The restaurants are separate businesses with separate tills, so a
          basket built at one can&rsquo;t be paid for at the other. Customers are warned first.
        </Callout>
      </Section>

      <Section id="pages" title="Pages — your home page and more">
        <p>
          <strong>Home page</strong> is your actual live home page, broken into blocks from top to
          bottom. Reorder them with the arrows, edit any block, delete what you don&rsquo;t want, or
          add new blocks anywhere.
        </p>
        <Row label="Publish tick">
          Your safety net. Untick <strong>Published</strong> on the Home page and the original
          built-in design comes straight back, exactly as it was. Nothing is lost — tick it again to
          return to your version.
        </Row>
        <Row label="Other pages">
          Anything else you create lives at your web address plus its name, for example
          <span className="font-mono text-cream/80"> /our-story</span>. Give it a title and the
          address is filled in for you.
        </Row>
        <Row label="Show header / footer">
          Turn off to make a bare landing page with no site navigation around it.
        </Row>
        <Callout tone="warn" title="Some addresses are reserved">
          <span className="font-mono">menu</span>, <span className="font-mono">cart</span>,{' '}
          <span className="font-mono">checkout</span>, <span className="font-mono">rewards</span> and{' '}
          <span className="font-mono">admin</span> belong to the shop itself and can&rsquo;t be used
          for your own pages.
        </Callout>
      </Section>

      <Section id="blocks" title="Every block you can add">
        <Row label="Hero">
          Big banner with a headline and button. Leave the background empty and it uses your newest
          menu photo automatically.
        </Row>
        <Row label="Text block">
          Headline and paragraph. Choose the text size, alignment, width, and optionally a solid
          colour background.
        </Row>
        <Row label="Text + image/video">
          Words beside a picture or video, with the media on the left or right. Use an uploaded file
          or paste a YouTube / Vimeo link. This is the block for an &ldquo;As seen on TV&rdquo; feature.
        </Row>
        <Row label="Image / Video">A single picture, or one video from a file or a YouTube link.</Row>
        <Row label="Image gallery">A simple grid of pictures.</Row>
        <Row label="Slideshow">
          A rotating carousel with arrows and dots. Can advance on its own; customers can swipe on a
          phone.
        </Row>
        <Row label="Popular / featured items">
          Shows whatever you&rsquo;ve ticked as Featured in the Menu screen, so it keeps itself up to
          date. You can also pin specific extra items on top.
        </Row>
        <Row label="Menu category">Everything in one category, updating itself as Clover changes.</Row>
        <Row label="Photo showcase">
          A grid of real photos from your menu — one per category, or your latest uploads — plus any
          extra pictures you add yourself.
        </Row>
        <Row label="As seen in the news">
          A side-scrolling strip of press clips, using the news media from Storefront Settings.
        </Row>
        <Row label="Our locations">
          Cards for every restaurant. Always current, because it reads your saved store details.
        </Row>
        <Row label="Call-to-action banner">A coloured strip with a message and a button.</Row>
        <Row label="Button / Spacer">A standalone button, or empty space between blocks.</Row>
        <Row label="Custom HTML / CSS">
          For anything the other blocks can&rsquo;t do. Only use it if you&rsquo;re comfortable with
          code — a mistake here can break the page it&rsquo;s on.
        </Row>
      </Section>

      <Section id="themes" title="Themes">
        <p>
          <strong>Mimi&rsquo;s Original Design</strong> is the built-in look. It&rsquo;s the one the
          Pages screen edits, and the one with the working location picker in the header.
        </p>
        <Callout tone="warn" title="An imported theme takes over completely">
          While a theme is live it supplies its own header, footer and home page, and your Pages
          blocks are not shown. Switch back to Mimi&rsquo;s Original Design to get them back — your
          blocks are never deleted, just not displayed.
        </Callout>
      </Section>

      <Section id="media" title="Media library">
        <p>
          Everything you&rsquo;ve uploaded, in one place. Anywhere a block asks for a picture or
          video you can pick from here instead of uploading again. Deleting something here removes it
          from any page still using it, so check first.
        </p>
      </Section>

      <Section id="settings" title="Storefront settings">
        <p>
          Your logo (replaces the wordmark in the header), business details, and the press clips used
          by the <em>As seen in the news</em> block.
        </p>
      </Section>

      <Section id="troubleshoot" title="When something looks wrong">
        <Row label="My edit disappeared">
          Almost always a name, price, category or availability — those come from Clover and are
          restored at the next sync. Change them in Clover instead.
        </Row>
        <Row label="A photo shows at one restaurant but not the other">
          The item is probably listed twice in Clover. See{' '}
          <a href="#merge" className="text-gold/80 hover:text-gold">Fixing duplicate items</a>.
        </Row>
        <Row label="One location ignores my photo update">
          That location is set to <strong>own</strong> rather than <strong>shared</strong> on the
          Menu card. Click the word to switch it back.
        </Row>
        <Row label="I broke the home page">
          Untick <strong>Published</strong> on the Home page in Pages. The built-in design returns
          immediately and your blocks are kept.
        </Row>
        <Row label="An item isn't on the website">
          It has to be available in Clover with a price above zero, and belong to the restaurant the
          customer has selected.
        </Row>
      </Section>

      <div className="rounded-xl border border-cream/12 bg-cream/[0.03] p-4">
        <p className="text-cream/70 text-sm">
          Start with the <Link href="/admin/menu" className="text-gold/80 hover:text-gold">Menu</Link> screen
          to add photos, then <Link href="/admin/pages" className="text-gold/80 hover:text-gold">Pages</Link> to
          arrange your home page.
        </p>
      </div>
    </div>
  );
}
