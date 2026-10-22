/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
    // Fewer, better-chosen widths (2026-10-23): the defaults put 16 widths in
    // every menu photo's srcset, which made /menu's HTML ~230 KB of image URLs.
    // These cover phones (2x/3x), tablets and desktop cards and the item sheet.
    deviceSizes: [384, 640, 828, 1080, 1280, 1920],
    imageSizes: [96, 160, 256],
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
