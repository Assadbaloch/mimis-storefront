// Turns the URLs a person actually pastes into things a browser can embed.
//
// Staff copy a YouTube link from the address bar -- "youtube.com/watch?v=..." --
// which does NOT work in an <iframe src>. YouTube refuses to frame the watch
// page (X-Frame-Options), so the result is a blank box with no error, which is
// impossible for a non-technical person to debug. Same for youtu.be short
// links, Shorts URLs, and Vimeo page URLs.
//
// So: anywhere a video URL appears in a Custom HTML block -- as an iframe src,
// inside an <a href>, or just pasted on its own line -- it gets rewritten into
// a working, responsive embed.
//
// Uploaded CMS media (Supabase `site-media` bucket) needs none of this: those
// are already direct public file URLs and work as-is in <img src> / <video src>.
// The one thing we do for them is upgrade a bare video URL sitting on its own
// line into a real <video> player, so pasting a link "just works" too.

const YT_ID = /(?:youtube\.com\/(?:watch\?(?:[^"'\s]*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
const VIMEO_ID = /vimeo\.com\/(?:video\/)?(\d{6,})/;
const MEDIA_EXT = /\.(mp4|webm|mov|m4v)(\?[^"'\s<]*)?$/i;
const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?[^"'\s<]*)?$/i;

/** Canonical embed URL for a video link, or null if it isn't one. */
export function toEmbedUrl(url = '') {
  const yt = String(url).match(YT_ID);
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vm = String(url).match(VIMEO_ID);
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`;
  return null;
}

export function isVideoFile(url = '') {
  return MEDIA_EXT.test(String(url));
}

export function isImageFile(url = '') {
  return IMAGE_EXT.test(String(url));
}

function responsiveIframe(src) {
  return `<div style="position:relative;width:100%;padding-top:56.25%;border-radius:14px;overflow:hidden">`
    + `<iframe src="${src}" style="position:absolute;inset:0;width:100%;height:100%;border:0"`
    + ` allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"`
    + ` allowfullscreen loading="lazy" title="Embedded video"></iframe></div>`;
}

function videoTag(src) {
  return `<video src="${src}" controls playsinline preload="metadata"`
    + ` style="width:100%;border-radius:14px;display:block"></video>`;
}

/**
 * Rewrites embeddable URLs inside a Custom HTML block.
 *
 * Order matters. Existing <iframe> tags are fixed first (so a half-correct
 * embed still works), then anchors, then bare URLs. Bare-URL replacement runs
 * last and only on text that is on its own line, so we never rewrite a URL
 * that's already inside an attribute we just fixed.
 */
export function normalizeEmbeds(html = '') {
  if (!html) return '';
  let out = String(html);

  // 1. <iframe src="...watch?v=..."> -> proper /embed/ URL.
  out = out.replace(/(<iframe\b[^>]*\bsrc=)(["'])(.*?)\2/gi, (m, pre, q, src) => {
    const embed = toEmbedUrl(src);
    return embed ? `${pre}${q}${embed}${q}` : m;
  });

  // 2. <a href="https://youtu.be/xyz">...</a> -> inline player.
  //    A link to a video is almost always meant as "show this video here".
  out = out.replace(/<a\b[^>]*\bhref=(["'])(.*?)\1[^>]*>[\s\S]*?<\/a>/gi, (m, q, href) => {
    const embed = toEmbedUrl(href);
    if (embed) return responsiveIframe(embed);
    if (isVideoFile(href)) return videoTag(href);
    return m;
  });

  // 3. A bare URL alone on its own line -> player. Restricted to its own line
  //    so prose containing a link mid-sentence is left alone.
  out = out.replace(/(^|\n)[ \t]*(https?:\/\/[^\s<>"']+)[ \t]*(?=\n|$)/g, (m, lead, url) => {
    const embed = toEmbedUrl(url);
    if (embed) return `${lead}${responsiveIframe(embed)}`;
    if (isVideoFile(url)) return `${lead}${videoTag(url)}`;
    if (isImageFile(url)) return `${lead}<img src="${url}" alt="" style="width:100%;height:auto;border-radius:14px;display:block" />`;
    return m;
  });

  return out;
}
