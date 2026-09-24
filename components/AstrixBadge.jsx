// "Powered by Astrix Digital Media" -- the agency credit in the site footer.
// Design approved 2026-09-25 ("Subtle, fine-tuned"): styles and animation live
// in app/globals.css under .ax-badge (pure CSS, no client JS). The link carries
// UTM tags so Astrix's analytics can count visits from this site; it is a
// normal followed link on purpose, opened in a new tab so a customer mid-order
// never loses the menu.
const HREF = 'https://astrixdigitalmedia.com/?utm_source=mimispizzami.com&utm_medium=referral&utm_campaign=site_footer';

export default function AstrixBadge({ className = '' }) {
  return (
    <a
      href={HREF}
      target="_blank"
      rel="noopener"
      className={`ax-badge ${className}`}
      aria-label="Powered by Astrix Digital Media (opens in a new tab)"
    >
      <span className="ax-tile" aria-hidden="true"><span className="ax-star" /></span>
      <span>Powered by <b>Astrix Digital Media</b></span>
    </a>
  );
}
