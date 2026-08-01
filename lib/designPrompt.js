import { buildSchemaDoc } from '@/lib/embedSchema';

// Builds the complete prompt the owner hands to an AI.
//
// The design intent: the owner should ONLY have to describe how they want the
// site to look. Everything that makes the site actually work -- the live menu
// tags, the logo slot, the layout outlet, the reserved page names, the output
// format -- is written for them and marked as non-negotiable, so an AI can't
// quietly drop the ordering functionality while restyling.
//
// Structure of the generated prompt:
//   1. Style brief      <- the only part driven by the owner's choices
//   2. Brand facts      <- fixed
//   3. Technical spec   <- fixed (generated from the live embed reference)
//   4. Output format    <- fixed (single vs multi page)

export const VIBES = [
  { key: 'bold', label: 'Bold & loud', hint: 'Big type, strong colour blocks, high energy' },
  { key: 'warm', label: 'Classic & warm', hint: 'Family pizzeria, cosy, inviting' },
  { key: 'modern', label: 'Modern & clean', hint: 'Lots of white space, understated' },
  { key: 'retro', label: 'Retro diner', hint: 'Americana, vintage signage feel' },
  { key: 'premium', label: 'Premium', hint: 'Dark, elegant, upscale' },
];

export const TYPE_STYLES = [
  { key: 'display', label: 'Big bold headlines', hint: 'Condensed, uppercase, poster-like' },
  { key: 'serif', label: 'Classic serif', hint: 'Traditional, editorial' },
  { key: 'sans', label: 'Clean modern sans', hint: 'Simple and neutral' },
  { key: 'script', label: 'Script accents', hint: 'Handwritten flourishes on key words' },
];

export const CORNERS = [
  { key: 'sharp', label: 'Sharp corners' },
  { key: 'soft', label: 'Softly rounded' },
  { key: 'pill', label: 'Fully rounded' },
];

export const MOTION = [
  { key: 'none', label: 'No animation' },
  { key: 'subtle', label: 'Subtle', hint: 'Gentle fade-ins as you scroll' },
  { key: 'lively', label: 'Lively', hint: 'Staggered reveals, hover lifts, moving hero' },
];

export const SECTIONS = [
  { key: 'hero_video', label: 'Hero with video or big image' },
  { key: 'featured', label: 'Featured menu items' },
  { key: 'categories', label: 'Menu categories overview' },
  { key: 'story', label: 'Our story / about' },
  { key: 'video_band', label: 'Video feature band ("As seen on TV")' },
  { key: 'locations', label: 'Locations with opening hours' },
  { key: 'reviews', label: 'Customer reviews' },
  { key: 'gallery', label: 'Photo gallery' },
  { key: 'catering', label: 'Catering call-to-action' },
  { key: 'rewards', label: 'Loyalty / rewards promo' },
];

export const EXTRA_PAGES = [
  { key: 'catering', label: 'Catering' },
  { key: 'about', label: 'About Us' },
  { key: 'locations', label: 'Locations' },
  { key: 'contact', label: 'Contact' },
];

const DEFAULT_BRAND_COLOURS = `- Royal blue  #1B4FA8  (primary)
- Red         #C8102E  (accent / buttons)
- Yellow      #F7BB0A  (highlights, script words)
- White       #FFFFFF
- Green       #1E9E4A  (small accents only)`;

export function buildDesignPrompt(opts = {}) {
  const {
    mode = 'single',
    vibe = 'bold',
    typeStyle = 'display',
    corners = 'soft',
    motion = 'lively',
    useBrandColours = true,
    customColours = '',
    sections = ['hero_video', 'featured', 'locations', 'catering'],
    extraPages = [],
    reference = '',
    notes = '',
    categories = [],
    locations = [],
  } = opts;

  const vibeDef = VIBES.find((v) => v.key === vibe);
  const typeDef = TYPE_STYLES.find((t) => t.key === typeStyle);
  const cornerDef = CORNERS.find((c) => c.key === corners);
  const motionDef = MOTION.find((m) => m.key === motion);
  const chosen = SECTIONS.filter((s) => sections.includes(s.key));

  const styleBrief = `## 1. HOW I WANT IT TO LOOK

**Overall feel:** ${vibeDef?.label}${vibeDef?.hint ? ` — ${vibeDef.hint}` : ''}

**Typography:** ${typeDef?.label}${typeDef?.hint ? ` — ${typeDef.hint}` : ''}

**Corners:** ${cornerDef?.label}

**Animation:** ${motionDef?.label}${motionDef?.hint ? ` — ${motionDef.hint}` : ''}

**Colours:**
${useBrandColours ? DEFAULT_BRAND_COLOURS : (customColours.trim() || DEFAULT_BRAND_COLOURS)}

**Sections I want, in roughly this order:**
${chosen.length ? chosen.map((s, i) => `${i + 1}. ${s.label}`).join('\n') : '1. Hero\n2. Featured menu items\n3. Locations'}
${reference.trim() ? `\n**Reference / inspiration:**\n${reference.trim()}\n` : ''}${notes.trim() ? `\n**Other notes:**\n${notes.trim()}\n` : ''}
Design this however you think looks best within the above. Be ambitious with the
visual design — but do not change anything in sections 2, 3 or 4 below.`;

  const brand = `## 2. THE BUSINESS (facts — do not invent alternatives)

- Name: Mimi's Pizza & Burger
- Fresh, halal pizza and burgers, made to order
- Locations: ${locations.length ? locations.join(' and ') : 'Madison Heights and Warren, Michigan'}
- Tagline used on merchandise: "If food isn't Yummy, don't pay a penny"

Do NOT write the logo, phone number, address or opening hours as text or images.
There are tags for those (section 3) which fill in the real values automatically.
Inventing a phone number or address on a live restaurant site is a serious error.`;

  return `${styleBrief}

${brand}

---

# FIXED TECHNICAL SPEC — follow exactly

Everything below makes the website actually work: the live menu, real prices,
the cart and ordering. Use these tags as written. Style them freely with your
own CSS classes, but do not remove, rename or replace them.

${buildSchemaDoc({ categories, locations, mode })}
${mode === 'multi' && extraPages.length ? `
### Pages to create

Home, plus: ${extraPages.map((p) => EXTRA_PAGES.find((e) => e.key === p)?.label || p).join(', ')}.
Use the page marker syntax shown above for each one.
` : ''}`;
}
