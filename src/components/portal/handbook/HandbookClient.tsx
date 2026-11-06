"use client";

import { useState } from "react";
import { Search, BookMarked, ClipboardCheck, ListChecks, MessageSquare } from "lucide-react";
import { searchRulebook, type RulebookEntry } from "@/lib/content/rulebook";
import type { RunbookSection } from "@/lib/content/runbook";
import type { MeetingTemplate } from "@/lib/content/meeting-templates";

interface Props {
  entries: RulebookEntry[];
  runbook: RunbookSection[];
  boardStandard: string[];
  templates: MeetingTemplate[];
}

const TABS = [
  { key: "rulebook", label: "Rulebook", icon: BookMarked },
  { key: "runbook", label: "Event runbook", icon: ClipboardCheck },
  { key: "standard", label: "Board standard", icon: ListChecks },
  { key: "templates", label: "Meeting templates", icon: MessageSquare },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const card = { background: "var(--p-card)", borderColor: "var(--p-border)", boxShadow: "var(--p-shadow)" } as const;

export default function HandbookClient({ entries, runbook, boardStandard, templates }: Props) {
  const [tab, setTab] = useState<TabKey>("rulebook");
  const [query, setQuery] = useState("");
  const results = searchRulebook(entries, query);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <button key={t.key} onClick={() => setTab(t.key)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all"
              style={active ? { background: "#1B3464", borderColor: "#1B3464", color: "#fff" } : { background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text-secondary)" }}>
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "rulebook" && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--p-muted)" }} />
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search the rulebook (confidentiality, deadlines, MyMIST…)" aria-label="Search the rulebook"
              className="w-full pl-10 pr-4 py-3 border rounded-xl text-sm focus:outline-none" style={{ background: "var(--p-card)", borderColor: "var(--p-border)", color: "var(--p-text)" }} />
          </div>
          {results.length === 0 && <p className="text-sm text-center py-8" style={{ color: "var(--p-muted)" }}>No entries match &ldquo;{query}&rdquo;.</p>}
          <div className="grid md:grid-cols-2 gap-4">
            {results.map((e) => (
              <article key={e.category} className="rounded-2xl border p-5" style={{ ...card, borderTop: `4px solid ${e.color}` }}>
                <div className="text-xs font-bold uppercase tracking-widest" style={{ color: e.color }}>{e.category}</div>
                <h3 className="font-semibold mt-1" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{e.question}</h3>
                <p className="text-sm mt-2" style={{ color: "var(--p-text-secondary)" }}>{e.answer}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {e.keywords.map((k) => <span key={k} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "var(--p-card-hover)", color: "var(--p-muted)" }}>{k}</span>)}
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "runbook" && (
        <div className="grid md:grid-cols-2 gap-4">
          {runbook.map((s) => (
            <article key={s.title} className="rounded-2xl border p-5" style={{ ...card, borderLeft: `4px solid ${s.color}` }}>
              <div className="text-xs" style={{ color: "var(--p-muted)" }}>{s.owner}</div>
              <h3 className="font-semibold mt-0.5" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{s.title}</h3>
              <ul className="mt-3 space-y-2 text-sm" style={{ color: "var(--p-text-secondary)" }}>
                {s.items.map((item) => <li key={item} className="flex gap-2"><span style={{ color: s.color }}>•</span>{item}</li>)}
              </ul>
            </article>
          ))}
        </div>
      )}

      {tab === "standard" && (
        <div className="rounded-2xl border p-6" style={card}>
          <h3 className="font-semibold" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>What every board member commits to</h3>
          <ol className="mt-4 space-y-3">
            {boardStandard.map((item, i) => (
              <li key={item} className="flex gap-3 text-sm" style={{ color: "var(--p-text-secondary)" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0" style={{ background: "#1B3464" }}>{i + 1}</span>
                <span className="pt-0.5">{item}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {tab === "templates" && (
        <div className="grid md:grid-cols-3 gap-4">
          {templates.map((t) => (
            <article key={t.title} className="rounded-2xl border p-5" style={card}>
              <div className="text-xs" style={{ color: "var(--p-muted)" }}>{t.cadence} · {t.owner}</div>
              <h3 className="font-semibold mt-0.5" style={{ fontFamily: "var(--font-syne)", color: "var(--p-text)" }}>{t.title}</h3>
              <ul className="mt-3 space-y-1.5 text-sm" style={{ color: "var(--p-text-secondary)" }}>
                {t.prompts.map((p) => <li key={p}>• {p}</li>)}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
