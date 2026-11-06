#!/usr/bin/env node
/**
 * One-time generator for the milestone seed in
 * supabase/migrations/20261029_02_season_milestones.sql.
 *
 *   node scripts/gen-milestone-seed.mjs /path/to/mistdallas2027handbook > values.sql
 *
 * Reads the 8 `deadline_events` rows from the handbook's supabase-setup.sql and
 * the 38 MASTER_MILESTONES from its index.html, and prints one SQL VALUES row
 * per milestone in the column order the migration expects. The output was
 * pasted into the migration once; keep this script only so the mapping rules
 * are documented and reproducible.
 */
import fs from "node:fs";
import path from "node:path";

const SEASON = { foundations: "2026-09-01", build: "2026-10-15", stabilization: "2026-12-01", execution: "2027-02-01" };
const PHASE_ENUM = { foundations: "FOUNDATIONS", build: "BUILD", stabilization: "STABILIZATION", execution: "EXECUTION" };
const TYPE_LABEL = { default: "Deadline", hard: "Hard Deadline", review: "Check-in", registration: "Registration", tournament: "Event Week", postevent: "Post-Event" };
const TYPE_PRIORITY = { default: "medium", hard: "critical", review: "medium", registration: "high", tournament: "critical", postevent: "low" };

export function phaseForDate(iso) {
  if (iso < SEASON.build) return "FOUNDATIONS";
  if (iso < SEASON.stabilization) return "BUILD";
  if (iso < SEASON.execution) return "STABILIZATION";
  return "EXECUTION";
}

const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);

export function parseDeadlineEvents(sql) {
  const block = sql.match(/insert into public\.deadline_events[\s\S]*?values([\s\S]*?)on conflict/i);
  if (!block) throw new Error("deadline_events insert not found");
  const rowRe = /\(\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*'((?:[^']|'')*)',\s*(true|false)\s*\)/g;
  const rows = [];
  for (const m of block[1].matchAll(rowRe)) {
    const un = (s) => s.replace(/''/g, "'");
    rows.push({
      legacy_id: un(m[1]), title: un(m[2]), description: un(m[3]), phase: PHASE_ENUM[un(m[4])],
      target_date: un(m[5]), date_label: un(m[6]), priority: un(m[7]), deadline_type: un(m[8]),
      owner_label: un(m[9]), send_reminders: m[10] === "true",
    });
  }
  return rows;
}

export function parseMasterMilestones(html) {
  const m = html.match(/const MASTER_MILESTONES = (\[[\s\S]*?\n\s*\]);/);
  if (!m) throw new Error("MASTER_MILESTONES not found");
  const items = new Function(`return ${m[1]}`)();
  return items.map((it) => ({
    legacy_id: it.id, title: it.title, description: it.detail, phase: phaseForDate(it.due_date),
    target_date: it.due_date, date_label: it.date, priority: TYPE_PRIORITY[it.type] ?? "medium",
    deadline_type: TYPE_LABEL[it.type] ?? "Deadline", owner_label: "All Teams", send_reminders: true,
  }));
}

export function toValuesRows(rows) {
  return rows
    .map((r) => `  (${[q(r.legacy_id), q(r.title), q(r.description), q(r.target_date), q(r.date_label), q(r.phase), q(r.priority), q(r.deadline_type), q(r.owner_label), r.send_reminders ? "true" : "false"].join(", ")})`)
    .join(",\n");
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const dir = process.argv[2];
  if (!dir) {
    console.error("usage: gen-milestone-seed.mjs <handbook-repo-dir>");
    process.exit(1);
  }
  const deadlines = parseDeadlineEvents(fs.readFileSync(path.join(dir, "supabase-setup.sql"), "utf8"));
  const timeline = parseMasterMilestones(fs.readFileSync(path.join(dir, "index.html"), "utf8"));
  process.stdout.write(toValuesRows([...deadlines, ...timeline]) + "\n");
  console.error(`${deadlines.length} deadlines + ${timeline.length} timeline items`);
}
