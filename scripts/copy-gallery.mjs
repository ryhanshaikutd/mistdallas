#!/usr/bin/env node
/**
 * Copies the public gallery pictures from the live site into a Supabase
 * Storage bucket on the target project (the one in NEXT_PUBLIC_SUPABASE_URL).
 *
 *   node scripts/copy-gallery.mjs --dry-run                 # list what would be copied
 *   node --env-file=.env.local scripts/copy-gallery.mjs     # create the bucket if needed and upload
 *
 * Options: --from-site <origin> (default https://mistdallas.org), --bucket <name> (default gallery),
 *          --pages <comma list> (default "/,/gallery").
 * The source objects are read from the pages' HTML, so no key for the old
 * project is needed; they are public URLs.
 */
import { extractGalleryUrls, objectNameFromUrl } from "./lib/gallery.mjs";

function parseArgs(argv) {
  const args = { fromSite: "https://mistdallas.org", bucket: "gallery", pages: ["/", "/gallery"], dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--from-site") args.fromSite = argv[++i];
    else if (argv[i] === "--bucket") args.bucket = argv[++i];
    else if (argv[i] === "--pages") args.pages = argv[++i].split(",").map((p) => p.trim()).filter(Boolean);
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const origin = args.fromSite.replace(/\/$/, "");

const urls = [];
const seen = new Set();
for (const page of args.pages) {
  const res = await fetch(origin + page, { redirect: "follow" });
  if (!res.ok) throw new Error(`${origin}${page}: HTTP ${res.status}`);
  for (const url of extractGalleryUrls(await res.text())) {
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }
}
console.error(`found ${urls.length} gallery object(s) on ${args.pages.join(", ")}`);
if (urls.length === 0) process.exit(1);

if (args.dryRun) {
  for (const url of urls) console.log(objectNameFromUrl(url));
  process.exit(0);
}

const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!base || !key || base.includes("<") || key.includes("<")) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the target project (try: node --env-file=.env.local …)");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };

// Ensure the bucket exists and is public.
const bucketRes = await fetch(`${base}/storage/v1/bucket/${args.bucket}`, { headers });
if (bucketRes.status === 404 || bucketRes.status === 400) {
  const create = await fetch(`${base}/storage/v1/bucket`, {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ id: args.bucket, name: args.bucket, public: true }),
  });
  if (!create.ok) throw new Error(`create bucket: HTTP ${create.status} ${await create.text()}`);
  console.error(`created public bucket "${args.bucket}"`);
} else if (!bucketRes.ok) {
  throw new Error(`bucket lookup: HTTP ${bucketRes.status} ${await bucketRes.text()}`);
} else {
  const info = await bucketRes.json();
  if (!info.public) console.error(`warning: bucket "${args.bucket}" is not public; the site reads it with public URLs`);
}

let copied = 0;
const failed = [];
for (const url of urls) {
  const name = objectNameFromUrl(url);
  try {
    const src = await fetch(url);
    if (!src.ok) throw new Error(`download HTTP ${src.status}`);
    const body = Buffer.from(await src.arrayBuffer());
    const type = src.headers.get("content-type") ?? "application/octet-stream";
    const put = await fetch(`${base}/storage/v1/object/${args.bucket}/${name.split("/").map(encodeURIComponent).join("/")}`, {
      method: "POST",
      headers: { ...headers, "Content-Type": type, "x-upsert": "true" },
      body,
    });
    if (!put.ok) throw new Error(`upload HTTP ${put.status} ${await put.text()}`);
    copied += 1;
    console.error(`copied ${name} (${body.length} bytes)`);
  } catch (err) {
    failed.push({ name, error: err instanceof Error ? err.message : String(err) });
  }
}
console.error(`done: ${copied} copied, ${failed.length} failed`);
for (const f of failed) console.error(`  ${f.name}: ${f.error}`);
process.exit(failed.length ? 1 : 0);
