'use client';
// Menu photos must be real photos, not thumbnails. On 2026-08-29 several
// products got 96-pixel images (3-5 KB) -- a picture dragged or saved from the
// live website is the site's own small thumbnail, not the original -- and they
// showed blurry on every menu card. Refuse anything that small at upload.
export const MIN_PHOTO_PX = 500;

// Returns null when the file is fine (or is a video / cannot be measured),
// otherwise a message for the admin.
export async function photoTooSmall(file) {
  if (!file || !file.type?.startsWith('image/') || file.type === 'image/svg+xml') return null;
  try {
    const bmp = await createImageBitmap(file);
    const { width, height } = bmp;
    bmp.close?.();
    if (Math.max(width, height) < MIN_PHOTO_PX) {
      return `${file.name || 'This photo'} is only ${width}×${height} px, so it would look blurry. `
        + `It is probably a small copy saved from the website. Upload the original photo (at least ${MIN_PHOTO_PX} px).`;
    }
  } catch { /* unreadable here: let the upload decide */ }
  return null;
}
