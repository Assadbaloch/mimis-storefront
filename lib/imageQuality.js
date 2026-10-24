// Photo compression quality for every menu photo (next/image `quality`).
// A separate, optional layer: sharpness comes first from never enlarging a
// photo past its real pixels (components/SharpImage.jsx); this only trades
// file size against detail. Override with NEXT_PUBLIC_IMAGE_QUALITY (40-100).
const q = Number(process.env.NEXT_PUBLIC_IMAGE_QUALITY);
export const IMAGE_QUALITY = Number.isFinite(q) && q >= 40 && q <= 100 ? Math.round(q) : 80;
