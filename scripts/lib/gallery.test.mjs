import { describe, it, expect } from "vitest";
import { extractGalleryUrls, objectNameFromUrl } from "./gallery.mjs";

const BASE = "https://xgocnplfuwicxejmlndh.supabase.co/storage/v1/object/public/gallery";
const html = `
  <img src="${BASE}/first.jpg" alt="">
  <img src="/_next/image?url=${encodeURIComponent(`${BASE}/second%20photo.JPG`)}&w=640&q=75">
  <a href="${BASE}/first.jpg">dup</a>
  <img src="${BASE}/third.png?t=123">
  <img src="https://other.supabase.co/storage/v1/object/public/other/x.jpg">
`;

describe("gallery helpers", () => {
  it("finds every gallery object once, in document order, including next/image-wrapped URLs", () => {
    expect(extractGalleryUrls(html)).toEqual([`${BASE}/first.jpg`, `${BASE}/second%20photo.JPG`, `${BASE}/third.png`]);
  });

  it("derives the decoded object name from a URL", () => {
    expect(objectNameFromUrl(`${BASE}/second%20photo.JPG`)).toBe("second photo.JPG");
    expect(objectNameFromUrl(`${BASE}/nested/dir/a.jpg`)).toBe("nested/dir/a.jpg");
  });
});
