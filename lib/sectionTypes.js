// Single source of truth for what a page section can be.
//
// Both the public renderer (components/sections/*) and the admin builder read
// this list, so adding a new section type means editing ONE file: add an entry
// here, add a matching renderer, and it appears in the builder automatically.
// The `type` values must stay in sync with the CHECK constraint on
// mimis.page_sections.type.
//
// `fields` drives the admin settings form. Keep field keys stable -- they're
// the keys inside the section's `config` jsonb, and renaming one orphans
// existing saved content.

export const SECTION_TYPES = [
  {
    type: 'hero',
    label: 'Hero',
    description: 'Full-width banner with a headline, sub-text and a button. Supports a background image or video.',
    icon: '🎬',
    fields: [
      { key: 'eyebrow', label: 'Small label above headline', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text', required: true },
      { key: 'subtext', label: 'Sub-text', type: 'textarea' },
      { key: 'background', label: 'Background image or video', type: 'media' },
      { key: 'text_color', label: 'Text style', type: 'select', options: ['white on dark', 'dark on light'], default: 'white on dark' },
      { key: 'overlay', label: 'Wash over the background (helps text readability)', type: 'range', min: 0, max: 90, default: 45, suffix: '%' },
      { key: 'height', label: 'Height', type: 'select', options: ['short', 'medium', 'tall', 'full screen'], default: 'medium' },
      { key: 'align', label: 'Text alignment', type: 'select', options: ['left', 'center', 'right'], default: 'center' },
      { key: 'button_label', label: 'Button text', type: 'text' },
      { key: 'button_url', label: 'Button link', type: 'text', placeholder: '/menu' },
    ],
  },
  {
    type: 'text',
    label: 'Text block',
    description: 'A headline and paragraph of copy.',
    icon: '📝',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'body', label: 'Body text', type: 'textarea' },
      { key: 'size', label: 'Text size', type: 'select', options: ['small', 'medium', 'large', 'extra large'], default: 'medium' },
      { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'], default: 'center' },
      { key: 'width', label: 'Width', type: 'select', options: ['narrow', 'wide', 'full'], default: 'narrow' },
      { key: 'background', label: 'Background', type: 'select', options: ['none', 'blue', 'red', 'yellow', 'dark'], default: 'none' },
    ],
  },
  {
    type: 'media_text',
    label: 'Text + image/video',
    description: 'A headline and copy beside a picture or video. Use an uploaded file or paste a YouTube / Vimeo link. Good for an "As seen on TV" block.',
    icon: '🎞️',
    fields: [
      { key: 'media', label: 'Picture or video', type: 'media' },
      { key: 'eyebrow', label: 'Small label above headline', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'body', label: 'Body text', type: 'textarea' },
      { key: 'media_side', label: 'Picture/video on the', type: 'select', options: ['left', 'right'], default: 'right' },
      { key: 'media_width', label: 'Picture/video size', type: 'select', options: ['one third', 'half', 'two thirds'], default: 'half' },
      { key: 'size', label: 'Text size', type: 'select', options: ['small', 'medium', 'large', 'extra large'], default: 'medium' },
      { key: 'align', label: 'Text alignment', type: 'select', options: ['left', 'center', 'right'], default: 'left' },
      { key: 'background', label: 'Background', type: 'select', options: ['none', 'blue', 'red', 'yellow', 'dark'], default: 'none' },
      { key: 'button_label', label: 'Button text', type: 'text' },
      { key: 'button_url', label: 'Button link', type: 'text' },
    ],
  },
  {
    type: 'locations',
    label: 'Our locations',
    description: 'Cards for every restaurant — name, address, phone and status. Always current: reads your saved store details, so it can never go stale.',
    icon: '📍',
    fields: [
      { key: 'eyebrow', label: 'Small label above headline', type: 'text', default: 'Where to Find Us' },
      { key: 'headline', label: 'Headline', type: 'text', default: 'Our kitchens' },
      { key: 'show_order_button', label: 'Show an "Order from this kitchen" button', type: 'boolean', default: true },
    ],
  },
  {
    type: 'image',
    label: 'Image',
    description: 'A single image, optionally with a caption and link.',
    icon: '🖼️',
    fields: [
      { key: 'image', label: 'Picture (upload, library, or link)', type: 'media', required: true },
      { key: 'caption', label: 'Caption', type: 'text' },
      { key: 'link_url', label: 'Link to (optional)', type: 'text' },
      { key: 'width', label: 'Width', type: 'select', options: ['contained', 'full width'], default: 'contained' },
      { key: 'rounded', label: 'Rounded corners', type: 'boolean', default: true },
    ],
  },
  {
    type: 'video',
    label: 'Video',
    description: 'An uploaded video, or a YouTube/Vimeo link.',
    icon: '📹',
    fields: [
      { key: 'video', label: 'Uploaded video', type: 'media' },
      { key: 'embed_url', label: 'Or paste a YouTube / Vimeo URL', type: 'text' },
      { key: 'poster', label: 'Thumbnail image', type: 'media' },
      { key: 'autoplay', label: 'Autoplay (muted)', type: 'boolean', default: false },
      { key: 'loop', label: 'Loop', type: 'boolean', default: false },
    ],
  },
  {
    type: 'gallery',
    label: 'Image gallery',
    description: 'A grid of images.',
    icon: '🖼️',
    fields: [
      { key: 'images', label: 'Pictures (upload, library, or link)', type: 'media_multi', required: true },
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'], default: '3' },
      { key: 'headline', label: 'Headline', type: 'text' },
    ],
  },
  {
    type: 'slideshow',
    label: 'Slideshow',
    description: 'A rotating carousel of images or videos, with arrows and dots. Good for "As seen on TV" clips or a photo reel.',
    icon: '🎠',
    fields: [
      { key: 'images', label: 'Slides (upload, library, or YouTube/Vimeo link)', type: 'media_multi', required: true },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'autoplay', label: 'Advance slides automatically', type: 'boolean', default: false },
      { key: 'interval', label: 'Seconds per slide', type: 'number', default: 5 },
      { key: 'rounded', label: 'Rounded corners', type: 'boolean', default: true },
    ],
  },
  {
    type: 'featured_items',
    label: 'Popular / featured items',
    description: 'Shows whatever you tick as "Featured" in the Menu editor, so it keeps itself up to date. You can also pin extra items on top.',
    icon: '⭐',
    fields: [
      { key: 'eyebrow', label: 'Small label above headline', type: 'text', default: 'Crowd Favorites' },
      { key: 'headline', label: 'Headline', type: 'text', default: 'Popular this week' },
      { key: 'extra_item_ids', label: 'Also always include these items', type: 'menu_items' },
      { key: 'limit', label: 'Max items to show', type: 'number', default: 4 },
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'], default: '4' },
      { key: 'link_label', label: 'Link text (top right)', type: 'text', default: 'View Full Menu →' },
      { key: 'link_url', label: 'Link to', type: 'text', default: '/menu' },
    ],
  },
  {
    type: 'menu_media',
    label: 'Photo showcase',
    description: 'A grid of real photos from your menu — either one per category, or your latest uploads. Add your own extra pictures too.',
    icon: '📸',
    fields: [
      { key: 'eyebrow', label: 'Small label above headline', type: 'text' },
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'source', label: 'Pull photos from', type: 'select', options: ['one per category', 'latest menu photos', 'only my own pictures'], default: 'one per category' },
      { key: 'extra_images', label: 'My own extra pictures (upload, library, or link)', type: 'media_multi' },
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'], default: '4' },
      { key: 'limit', label: 'Max photos', type: 'number', default: 8 },
    ],
  },
  {
    type: 'news_strip',
    label: 'As seen in the news',
    description: 'A side-scrolling strip of press clips. Uses the news media from Storefront Settings, plus anything extra you add here.',
    icon: '📺',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', default: 'Featured in the news' },
      { key: 'extra_images', label: 'Clips or photos (upload, library, or YouTube/Vimeo link)', type: 'media_multi' },
      { key: 'empty_text', label: 'Text to show when there is nothing yet', type: 'text', default: 'News coverage coming soon' },
    ],
  },
  {
    type: 'product_category',
    label: 'Menu category',
    description: 'Shows every item in a menu category. Stays up to date automatically as Clover changes.',
    icon: '🍕',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Sub-text', type: 'textarea' },
      { key: 'category', label: 'Category', type: 'menu_category', required: true },
      { key: 'limit', label: 'Max items to show (blank = all)', type: 'number' },
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'], default: '3' },
      { key: 'show_price', label: 'Show prices', type: 'boolean', default: true },
    ],
  },
  {
    type: 'product_showcase',
    label: 'Featured items',
    description: 'Hand-pick specific menu items to feature, like a "Fan Favourites" row.',
    icon: '⭐',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Sub-text', type: 'textarea' },
      { key: 'item_ids', label: 'Items', type: 'menu_items', required: true },
      { key: 'columns', label: 'Columns', type: 'select', options: ['2', '3', '4'], default: '3' },
      { key: 'show_price', label: 'Show prices', type: 'boolean', default: true },
      { key: 'button_label', label: 'Button text on each card', type: 'text', default: 'Order Now' },
    ],
  },
  {
    type: 'cta_banner',
    label: 'Call-to-action banner',
    description: 'A coloured strip with a message and a button.',
    icon: '📣',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', required: true },
      { key: 'subtext', label: 'Sub-text', type: 'text' },
      { key: 'button_label', label: 'Button text', type: 'text' },
      { key: 'button_url', label: 'Button link', type: 'text' },
      { key: 'style', label: 'Style', type: 'select', options: ['gold', 'dark', 'outlined'], default: 'gold' },
    ],
  },
  {
    type: 'app_download',
    label: 'App download',
    description: 'App Store / Google Play buttons with a phone image.',
    icon: '📱',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text' },
      { key: 'subtext', label: 'Sub-text', type: 'textarea' },
      { key: 'image', label: 'Image', type: 'media' },
      { key: 'ios_url', label: 'App Store link', type: 'text' },
      { key: 'android_url', label: 'Google Play link', type: 'text' },
    ],
  },
  {
    type: 'button',
    label: 'Button',
    description: 'A standalone button.',
    icon: '🔘',
    fields: [
      { key: 'label', label: 'Button text', type: 'text', required: true },
      { key: 'url', label: 'Link', type: 'text', required: true },
      { key: 'align', label: 'Alignment', type: 'select', options: ['left', 'center', 'right'], default: 'center' },
      { key: 'style', label: 'Style', type: 'select', options: ['primary', 'outline'], default: 'primary' },
    ],
  },
  {
    type: 'instagram',
    label: 'Instagram feed',
    description: 'Links through to the Instagram profile. (Embedded post grid needs an Instagram API token.)',
    icon: '📷',
    fields: [
      { key: 'headline', label: 'Headline', type: 'text', default: 'Follow us' },
      { key: 'profile_url', label: 'Instagram profile URL', type: 'text' },
      { key: 'handle', label: 'Handle (e.g. @mimispizza)', type: 'text' },
    ],
  },
  {
    type: 'spacer',
    label: 'Spacer',
    description: 'Empty vertical space between sections.',
    icon: '↕️',
    fields: [
      { key: 'size', label: 'Size', type: 'select', options: ['small', 'medium', 'large'], default: 'medium' },
    ],
  },
  {
    type: 'custom_code',
    label: 'Custom HTML / CSS',
    description: 'Paste raw HTML and CSS. Use this for anything the other sections cannot do — a full custom design, an embed, a third-party widget.',
    icon: '⚡',
    fields: [
      { key: 'html', label: 'HTML', type: 'code', language: 'html', required: true },
      { key: 'css', label: 'CSS (scoped to this section)', type: 'code', language: 'css' },
      { key: 'full_width', label: 'Full width (ignore page padding)', type: 'boolean', default: true },
    ],
  },
];

export function getSectionType(type) {
  return SECTION_TYPES.find((s) => s.type === type) || null;
}

// Defaults for a freshly-added section, so a new block renders something
// sensible immediately rather than appearing broken/empty in the builder.
export function defaultConfigFor(type) {
  const def = getSectionType(type);
  if (!def) return {};
  const config = {};
  for (const f of def.fields) {
    if (f.default !== undefined) config[f.key] = f.default;
  }
  return config;
}
