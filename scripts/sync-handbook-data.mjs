#!/usr/bin/env node
/**
 * Carries the 2027 Handbook portal's organizer data into mistdallas.
 *
 *   node scripts/sync-handbook-data.mjs                 # fetch live handbook data, write SQL
 *   node scripts/sync-handbook-data.mjs --from ./export # read profiles.json + workbook_progress.json instead
 *   node scripts/sync-handbook-data.mjs --out path.sql  # where to write (default supabase/seed/local/legacy_handbook.sql)
 *   node --env-file=.env.local scripts/sync-handbook-data.mjs --apply
 *                                                       # also upsert straight into the target project (service role)
 *
 * The handbook project is read with its publishable key (its profiles and
 * workbook_progress tables are world-readable). The output lands in a
 * git-ignored file because it is a roster of real people.
 */
import fs from "node:fs";
import path from "node:path";
import { mapProfile, mapWorkbookRow, toSql, extractDeliverables } from "./lib/handbook-map.mjs";

const HANDBOOK_URL = process.env.HANDBOOK_SUPABASE_URL ?? "https://pgdrhoifisonmzuaeetu.supabase.co";
const HANDBOOK_KEY = process.env.HANDBOOK_SUPABASE_ANON_KEY ?? "sb_publishable_wsWDiB5ZWeOQW44bJ3UsMw_yMEx8d2Q";

function parseArgs(argv) {
  const args = { out: "supabase/seed/local/legacy_handbook.sql", from: null, apply: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--out") args.out = argv[++i];
    else if (argv[i] === "--from") args.from = argv[++i];
    else if (argv[i] === "--apply") args.apply = true;
    else throw new Error(`unknown argument ${argv[i]}`);
  }
  return args;
}

async function readTable(name, from) {
  if (from) return JSON.parse(fs.readFileSync(path.join(from, `${name}.json`), "utf8"));
  const res = await fetch(`${HANDBOOK_URL}/rest/v1/${name}?select=*&limit=1000`, {
    headers: { apikey: HANDBOOK_KEY, Authorization: `Bearer ${HANDBOOK_KEY}` },
  });
  if (!res.ok) throw new Error(`handbook ${name}: HTTP ${res.status}`);
  return res.json();
}

async function postgrest(base, key, pathname, body, prefer) {
  const res = await fetch(`${base}/rest/v1/${pathname}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", Prefer: prefer },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${pathname}: HTTP ${res.status} ${await res.text()}`);
  return res.status === 204 ? null : res.json();
}

const args = parseArgs(process.argv.slice(2));
const profiles = await readTable("profiles", args.from);
const workbookRows = await readTable("workbook_progress", args.from);

const roles = extractDeliverables(fs.readFileSync(path.resolve("src/lib/workbook/content.ts"), "utf8"));
const knownSlugs = new Set([...Object.keys(roles), "dream-team"]);

const warnings = [];
const seats = [];
const profilesById = new Map();
for (const row of profiles) {
  const seat = mapProfile(row, knownSlugs);
  if (!seat.email) continue;
  if (seat.warning) warnings.push(`${seat.email}: ${seat.warning}`);
  const clean = { ...seat };
  delete clean.warning;
  seats.push(clean);
  profilesById.set(row.id, { email: seat.email, position_slug: seat.position_slug });
}
const progress = workbookRows.map((row) => mapWorkbookRow(row, profilesById, roles)).filter(Boolean);

const sql = toSql(seats, progress);
fs.mkdirSync(path.dirname(args.out), { recursive: true });
fs.writeFileSync(args.out, sql);

console.error(`profiles: ${profiles.length}  seats mapped: ${seats.filter((s) => s.position_slug).length}  workbook rows: ${progress.length}/${workbookRows.length}`);
for (const w of warnings) console.error(`warning: ${w}`);
console.error(`wrote ${args.out}`);

if (args.apply) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key || base.includes("<") || key.includes("<")) {
    console.error("--apply needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (try: node --env-file=.env.local …)");
    process.exit(1);
  }
  await postgrest(base, key, "legacy_seat_assignments", seats.map((s) => ({ ...s, source: "handbook-2027" })), "resolution=merge-duplicates,return=minimal");
  if (progress.length) await postgrest(base, key, "legacy_workbook_progress", progress, "resolution=merge-duplicates,return=minimal");
  const matched = await postgrest(base, key, "rpc/apply_legacy_seats_all", {}, "return=representation");
  console.error(`applied: ${seats.length} seat rows, ${progress.length} progress rows; ${matched} existing profiles matched a seat`);
}
