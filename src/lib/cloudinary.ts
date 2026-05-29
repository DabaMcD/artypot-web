/**
 * Cloudinary delivery helpers.
 *
 * Uploads go straight to Cloudinary (unsigned preset) from the browser via
 * `next-cloudinary`'s CldUploadWidget. The raw `secure_url` Cloudinary returns
 * points at the *original* asset, which can be many MB. We never want to store
 * or serve that — instead we rewrite the URL to insert a delivery
 * transformation so every consumer gets a small, standardized derivative.
 *
 * A Cloudinary delivery URL looks like:
 *   https://res.cloudinary.com/<cloud>/image/upload/v123/folder/name.jpg
 * We inject the transformation segment right after `/upload/`:
 *   https://res.cloudinary.com/<cloud>/image/upload/<transform>/v123/folder/name.jpg
 *
 * Transformations are applied by Cloudinary at delivery time and cached on
 * their CDN — the original is never sent to the browser.
 */

/** Square avatar: user's custom crop box from the upload widget, resized to 512², auto quality + auto format. */
const AVATAR_TRANSFORM = 'c_crop,g_custom,w_512,h_512,q_auto,f_auto';

/**
 * CldUploadWidget options for avatar uploads — defense-in-depth so a giant
 * original is never even *stored* (the delivery transform only fixes what's
 * served). The widget enforces these client-side before the upload leaves the
 * browser:
 *
 *  - maxImageWidth/Height: Cloudinary downsizes to ≤1024² before upload.
 *  - maxImageFileSize: hard reject anything over 10 MB (the widget shows its
 *    own error; nothing hits our backend).
 *  - clientAllowedFormats: only real raster image types.
 *
 * Spread into the widget's `options` prop alongside any page-specific keys
 * (sources, cropping, folder, etc.).
 */
export const AVATAR_UPLOAD_OPTIONS: {
  clientAllowedFormats: string[];
  maxImageFileSize: number;
  maxImageWidth: number;
  maxImageHeight: number;
} = {
  clientAllowedFormats: ['png', 'jpeg', 'jpg', 'webp', 'gif'],
  maxImageFileSize: 10_000_000, // 10 MB ceiling on the *original*
  maxImageWidth: 1024,
  maxImageHeight: 1024,
};

/**
 * Normalize a Cloudinary `secure_url` into a standardized avatar delivery URL.
 *
 * - If the URL is already a Cloudinary upload URL, the transform is injected
 *   (and any pre-existing transform segment is replaced, so re-normalizing is
 *   idempotent).
 * - Non-Cloudinary URLs (legacy local-storage paths, external avatars from
 *   OAuth providers, empty values) are returned unchanged.
 */
export function normalizeAvatarUrl(url: string | null | undefined): string | null {
  if (!url) return null;

  // Only touch Cloudinary delivery URLs.
  const marker = '/image/upload/';
  const idx = url.indexOf(marker);
  if (!url.includes('res.cloudinary.com') || idx === -1) {
    return url;
  }

  const prefix = url.slice(0, idx + marker.length);
  let rest = url.slice(idx + marker.length);

  // Drop any existing transformation segments. Cloudinary supports chained
  // transforms (`t1/t2/.../v123/path`), so strip leading segments until we
  // hit the version (`v123…`) or the asset path.
  while (true) {
    const slash = rest.indexOf('/');
    if (slash === -1) break;
    const seg = rest.slice(0, slash);
    const isVersion = /^v\d+$/.test(seg);
    const looksLikeTransform =
      seg.includes(',') ||
      /(^|,)(c_|w_|h_|q_|f_|g_|e_|ar_|dpr_)/.test(seg);
    if (isVersion || !looksLikeTransform) break;
    rest = rest.slice(slash + 1);
  }

  return `${prefix}${AVATAR_TRANSFORM}/${rest}`;
}
