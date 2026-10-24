'use client';
// Menu photos must be real photos, not thumbnails. On 2026-08-29 several
// products got 96-pixel images (3-5 KB) -- a picture dragged or saved from the
// live website is the site's own small thumbnail, not the original -- and they
// showed blurry on every menu card. Refuse anything that small at upload.
// 2026-10-24: measured on the SHORTEST side. A square menu card is ~305 px wide;
// on a 2x phone that needs ~640 real pixels across the short side or it is enlarged.
export const MIN_PHOTO_PX = 640;

// Returns null when the file is fine (or is a video / cannot be measured),
// otherwise a message for the admin.
export async function photoTooSmall(file) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/svg+xml') return null;
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    bmp.close?.();
    if (Math.min(width, height) < MIN_PHOTO_PX) {
      return `${file.name || 'This photo'} is only ${width}×${height} px, so it would look blurry. `
        + `It may be a small copy saved from a website or chat. Upload the original photo (at least ${MIN_PHOTO_PX} px on its shorter side).`;
    }
  } catch { /* unreadable here: let the upload decide */ }
  return null;
}
