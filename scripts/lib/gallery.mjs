/** Helpers for scripts/copy-gallery.mjs: find gallery objects on a rendered page. */

// Excludes backslashes: Next.js embeds the same URLs JSON-escaped in its payload (…jpg\" ).
const GALLERY_URL = /https?:\/\/[a-z0-9.-]+\.supabase\.co\/storage\/v1\/object\/public\/gallery\/[^"'\s<>?&#\\]+/g;
const NEXT_IMAGE = /\/_next\/image\?url=([^"'&\s]+)/g;

/** Unique gallery object URLs in document order, including ones wrapped by next/image. */
export function extractGalleryUrls(html) {
  const found = [];
  const seen = new Set();
  const add = (url) => {
    const clean = url.replace(/[?#].*$/, "");
    if (!seen.has(clean)) {
      seen.add(clean);
      found.push(clean);
    }
  };
  // Walk the document once so raw and next/image references keep their order.
  const combined = new RegExp(`${GALLERY_URL.source}|${NEXT_IMAGE.source}`, "g");
  for (const m of html.matchAll(combined)) {
    if (m[1]) {
      let decoded;
      try { decoded = decodeURIComponent(m[1]); } catch { continue; }
      for (const inner of decoded.match(GALLERY_URL) ?? []) add(inner);
    } else {
      add(m[0]);
    }
  }
  return found;
}

/** The object key inside the bucket, percent-decoded ("second photo.JPG"). */
export function objectNameFromUrl(url) {
  const idx = url.indexOf("/public/gallery/");
  if (idx < 0) throw new Error(`not a gallery URL: ${url}`);
  return decodeURIComponent(url.slice(idx + "/public/gallery/".length).replace(/[?#].*$/, ""));
}
