"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Trophy, Users, BookOpen, Palette, Mic,
  Swords, Menu, X, ChevronRight, ArrowRight,
} from "lucide-react";
import GalleryCarousel from "./GalleryCarousel";


const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Categories", href: "#categories" },
  { label: "Nationals", href: "#nationals" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "#contact" },
];

const STATS = [
  { end: 2018, label: "Est.", prefix: "", suffix: "" },
  { end: 850,  label: "Competitors", prefix: "", suffix: "+" },
  { end: 25,   label: "Schools & Orgs", prefix: "", suffix: "+" },
];

function useCountUp(end: number, duration = 1800, inView = false) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [end, duration, inView]);
  return count;
}

const CATEGORIES = [
  {
    icon: BookOpen,
    title: "Knowledge & Quran",
    color: "#1B3464",
    events: ["Knowledge Test", "Quran Memorization", "Quran Recitation"],
    desc: "Test your Islamic knowledge and showcase your Quran recitation across four skill levels.",
  },
  {
    icon: Palette,
    title: "Arts",
    color: "#2E7BC4",
    events: ["2D Art", "3D Art", "Photography", "Graphic Design", "Fashion Design"],
    desc: "Express yourself through visual mediums — from traditional painting to fashion and digital design.",
  },
  {
    icon: Mic,
    title: "Writing & Oratory",
    color: "#1A6B3C",
    events: ["Original Oratory", "Extemporaneous Speaking", "Spoken Word", "Prepared Essay", "Short Fiction", "Poetry"],
    desc: "Find your voice through prepared speeches, impromptu essays, spoken word, and written storytelling.",
  },
  {
    icon: Swords,
    title: "Brackets",
    color: "#2EA87A",
    events: ["Debate", "MIST Bowl", "Math Olympics", "Improv"],
    desc: "Head-to-head competitions that test quick thinking, teamwork, and competitive strategy.",
  },
  {
    icon: Users,
    title: "Group Projects",
    color: "#1B3464",
    events: ["Business Venture", "Short Film", "Nasheed & Rap", "Science Fair", "Humanitarian Service"],
    desc: "Collaborate with your team to pitch, perform, create, and make a real-world impact.",
  },
  {
    icon: Trophy,
    title: "Sports",
    color: "#2E7BC4",
    events: ["Basketball", "Soccer", "Volleyball", "Badminton", "Flag Football"],
    desc: "Compete on the court and field in bracket-style athletic tournaments throughout the weekend.",
  },
];

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function FadeUp({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: inView ? 1 : 0,
        transform: inView ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

function StatItem({ end, label, prefix, suffix, delay }: { end: number; label: string; prefix: string; suffix: string; delay: number }) {
  const { ref, inView } = useInView(0.3);
  const count = useCountUp(end, 1600, inView);
  return (
    <div ref={ref} className="text-center" style={{
      opacity: inView ? 1 : 0,
      transform: inView ? "translateY(0)" : "translateY(24px)",
      transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`,
    }}>
      <div className="text-5xl md:text-6xl font-extrabold text-[#7ADBB8]" style={{ fontFamily: "var(--font-syne)" }}>
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-xs text-white/40 uppercase tracking-widest font-semibold mt-2">{label}</div>
    </div>
  );
}

function StatBar() {
  return (
    <section className="bg-[#1B3464]">
      <div className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex items-center justify-around">
          {STATS.map((s, i) => (
            <StatItem key={s.label} {...s} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  );
}

interface Qualifier {
  id: string;
  year: number;
  name: string;
  school: string;
  category: string;
  placement: string | null;
}

export default function LandingPage({ qualifiers = [], galleryPhotos = [] }: { qualifiers?: Qualifier[]; galleryPhotos?: string[] }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100" : "bg-transparent"}`}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="MIST Dallas" width={38} height={38} className={`object-contain transition-all duration-300 ${scrolled ? "brightness-0" : "brightness-0 invert"}`} />
            <span className={`font-bold text-lg transition-colors duration-300 ${scrolled ? "text-[#1B3464]" : "text-white"}`} style={{ fontFamily: "var(--font-syne)" }}>
              MIST Dallas
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`text-sm font-medium transition-colors duration-300 ${scrolled ? "text-gray-600 hover:text-[#1B3464]" : "text-white/80 hover:text-white"}`}>
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/portal"
              className={`hidden md:flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-full transition-all duration-300 ${scrolled ? "bg-[#1B3464] text-white hover:bg-[#2E7BC4]" : "bg-white/15 backdrop-blur-sm text-white border border-white/30 hover:bg-white/25"}`}>
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
            <button className={`md:hidden p-2 transition-colors ${scrolled ? "text-gray-600" : "text-white"}`} onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-700" onClick={() => setMobileOpen(false)}>{l.label}</Link>
            ))}
            <Link href="/portal" className="flex items-center justify-center gap-1.5 bg-[#1B3464] text-white text-sm font-semibold px-5 py-2.5 rounded-full" onClick={() => setMobileOpen(false)}>
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#060D18]">
        {/* Background video */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>

        {/* Lighter overlay — brighter video */}
        <div className="absolute inset-0 bg-black/30" />
        {/* Vignette edges */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)" }} />
        {/* Bottom fade */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#060D18] to-transparent" />

        {/* Content */}
        <div className="relative z-10 text-center px-6">
          {/* Eyebrow — fades in first */}
          <p className="text-[#7ADBB8] text-xs font-bold uppercase tracking-[0.3em] mb-8"
            style={{ animation: "fadeInDown 0.7s ease 0.2s both" }}>
            Established 2018 &nbsp;·&nbsp; Southern Regional Chapter
          </p>

          {/* MIST — letters clip-reveal upward, staggered */}
          <div className="overflow-hidden leading-none mb-1">
            <h1
              className="text-[clamp(5rem,18vw,14rem)] font-extrabold text-white tracking-tight block"
              style={{ fontFamily: "var(--font-syne)" }}
            >
              {"MIST".split("").map((ch, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: `letterRise 0.7s cubic-bezier(0.22,1,0.36,1) ${0.4 + i * 0.08}s both`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </h1>
          </div>

          {/* Dallas — same but delayed after MIST lands */}
          <div className="overflow-hidden leading-none">
            <h1
              className="text-[clamp(5rem,18vw,14rem)] font-extrabold tracking-tight block"
              style={{
                fontFamily: "var(--font-syne)",
                WebkitTextStroke: "2px rgba(255,255,255,0.9)",
                color: "transparent",
              }}
            >
              {"Dallas".split("").map((ch, i) => (
                <span
                  key={i}
                  className="inline-block"
                  style={{
                    animation: `letterRise 0.7s cubic-bezier(0.22,1,0.36,1) ${0.75 + i * 0.07}s both`,
                  }}
                >
                  {ch}
                </span>
              ))}
            </h1>
          </div>

          {/* Tagline */}
          <p className="mt-8 text-white/60 text-lg font-light tracking-widest uppercase"
            style={{ animation: "fadeInUp 0.8s ease 1.4s both", letterSpacing: "0.2em" }}>
            Where faith meets excellence.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center"
            style={{ animation: "fadeInUp 0.8s ease 1.6s both" }}>
            <Link href="/portal"
              className="flex items-center justify-center gap-2 bg-white text-[#1B3464] font-bold px-8 py-4 rounded-full hover:bg-[#7ADBB8] transition-all duration-300 hover:scale-105 text-base">
              Apply for Board <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#about"
              className="flex items-center justify-center gap-2 border border-white/25 text-white/75 font-medium px-8 py-4 rounded-full hover:border-white/60 hover:text-white transition-all duration-300 text-base">
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-10" style={{ animation: "fadeIn 1s ease 2s both" }}>
          <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/40 to-transparent" style={{ animation: "pulse 2s ease infinite" }} />
        </div>
      </section>

      {/* ── STATS ── */}
      <StatBar />

      {/* ── ABOUT ── */}
      <section id="about" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <FadeUp>
            <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">About</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-4 mb-6 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
              More than a<br />tournament.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              High schoolers from across the South coming together to compete, grow, and build connections that last beyond the weekend.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Leadership", "Community", "Est. 2018"].map((tag) => (
                <span key={tag} className="bg-[#EEF2F9] text-[#1B3464] text-sm font-semibold px-4 py-2 rounded-full">{tag}</span>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={150}>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl group">
              <Image src="/photo1.jpeg" alt="MIST Dallas tournament" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B3464]/70 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-white font-bold text-2xl" style={{ fontFamily: "var(--font-syne)" }}>Hundreds of Competitors</div>
                <div className="text-white/60 text-sm mt-1">from schools across the South</div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── THIS IS MIST + GALLERY ── */}
      <section className="relative overflow-hidden bg-[#060D18]">
        <Image src="/photo2.jpeg" alt="MIST Dallas crowd" fill className="object-cover object-center" />
        <div className="absolute inset-0 bg-[#0F2240]/80" />
        <div className="relative z-10 pt-24 pb-0 text-center px-6">
          <FadeUp>
            <h2 className="text-5xl md:text-7xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
              This is MIST.
            </h2>
            <p className="text-white/50 text-lg mt-4 max-w-md mx-auto">Hundreds of students. One weekend. Pure energy.</p>
          </FadeUp>
          <div className="mt-16">
            {galleryPhotos.length > 0 && <GalleryCarousel photos={galleryPhotos} dark />}
          </div>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="relative py-28 px-6 bg-white overflow-hidden">

        {/* Watermark text */}
        <div className="absolute inset-0 flex flex-col justify-center gap-2 pointer-events-none select-none" aria-hidden>
          {["KNOWLEDGE · ARTS · ORATORY", "BRACKETS · SPORTS · GROUP", "COMPETE · CREATE · CONNECT"].map((line, i) => (
            <p key={i} className="text-[clamp(2.5rem,7vw,6rem)] font-extrabold whitespace-nowrap leading-tight"
              style={{
                fontFamily: "var(--font-syne)",
                color: "#1B3464",
                opacity: 0.035,
                transform: i % 2 === 0 ? "translateX(-2%)" : "translateX(2%)",
                letterSpacing: "0.05em",
              }}>
              {line}
            </p>
          ))}
        </div>

        <div className="relative max-w-6xl mx-auto">
          <FadeUp className="mb-16 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">Competitions</span>
              <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-4 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
                Something for<br />everyone.
              </h2>
            </div>
            <p className="text-gray-400 text-base max-w-xs md:text-right leading-relaxed">
              6 categories · 20+ events<br />Every student has a stage.
            </p>
          </FadeUp>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <FadeUp key={cat.title} delay={i * 60}>
                  <div className="group relative p-7 h-full flex flex-col rounded-2xl transition-all duration-300 cursor-default"
                    style={{ background: "#1B3464", boxShadow: "0 4px 24px rgba(27,52,100,0.12)" }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "#243d78"; (e.currentTarget as HTMLElement).style.transform = "translateY(-3px)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "#1B3464"; (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
                  >
                    {/* Number watermark */}
                    <span className="absolute top-4 right-5 text-7xl leading-none select-none opacity-[0.2]"
                      style={{ fontFamily: "var(--font-brush)", color: "white" }}>
                      0{i + 1}
                    </span>

                    {/* Icon */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                      style={{ background: cat.color + "30" }}>
                      <Icon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-white text-lg mb-2" style={{ fontFamily: "var(--font-syne)" }}>{cat.title}</h3>

                    {/* Desc */}
                    <p className="text-white/45 text-sm leading-relaxed mb-5 flex-1">{cat.desc}</p>

                    {/* Divider */}
                    <div className="w-8 h-px mb-4 group-hover:w-full transition-all duration-500" style={{ background: cat.color }} />

                    {/* Pills */}
                    <div className="flex flex-wrap gap-1.5">
                      {cat.events.map(ev => (
                        <span key={ev} className="text-xs font-medium px-2.5 py-1 rounded-full"
                          style={{ color: "white", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                          {ev}
                        </span>
                      ))}
                    </div>
                  </div>
                </FadeUp>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── NATIONALS QUALIFIERS ── */}
      <section id="nationals" className="py-28 px-6 bg-[#0F1B2D]">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-14 text-center">
            <span className="text-[#7ADBB8] text-xs font-bold uppercase tracking-widest">Nationals</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-white mt-4 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
              Dallas Represents.
            </h2>
            <p className="text-white/40 mt-4 text-lg max-w-lg mx-auto">
              These competitors earned the right to represent MIST Dallas on the national stage.
            </p>
          </FadeUp>

          {qualifiers.length === 0 ? (
            <FadeUp className="text-center py-16">
              <div className="inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-8 py-6">
                <Trophy className="w-6 h-6 text-[#7ADBB8]" />
                <span className="text-white/40 font-medium">Nationals qualifiers will be announced after MIST Weekend.</span>
              </div>
            </FadeUp>
          ) : (
            <>
              {/* Group by year */}
              {Array.from(new Set(qualifiers.map(q => q.year))).map(year => {
                const byYear = qualifiers.filter(q => q.year === year);
                const byCategory = byYear.reduce<Record<string, Qualifier[]>>((acc, q) => {
                  acc[q.category] = acc[q.category] ?? [];
                  acc[q.category].push(q);
                  return acc;
                }, {});
                return (
                  <div key={year} className="mb-16">
                    <FadeUp>
                      <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-3xl font-extrabold text-white/20" style={{ fontFamily: "var(--font-syne)" }}>{year}</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                    </FadeUp>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.entries(byCategory).map(([category, qualifiersInCat], i) => (
                        <FadeUp key={category} delay={i * 60}>
                          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-[#7ADBB8]/30 transition-colors duration-300">
                            <div className="flex items-center gap-2 mb-4">
                              <div className="w-7 h-7 rounded-lg bg-[#7ADBB8]/10 flex items-center justify-center">
                                <Trophy className="w-3.5 h-3.5 text-[#7ADBB8]" />
                              </div>
                              <span className="text-xs font-bold uppercase tracking-widest text-[#7ADBB8]">{category}</span>
                            </div>
                            <div className="space-y-3">
                              {qualifiersInCat.map(q => (
                                <div key={q.id} className="flex items-start justify-between gap-2">
                                  <div>
                                    <div className="font-bold text-white text-sm">{q.name}</div>
                                    <div className="text-white/30 text-xs mt-0.5">{q.school}</div>
                                  </div>
                                  {q.placement && (
                                    <span className="flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full bg-[#7ADBB8]/10 text-[#7ADBB8] border border-[#7ADBB8]/20">
                                      {q.placement}
                                    </span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        </FadeUp>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="relative h-[70vh] overflow-hidden flex items-center justify-center">
        <Image src="/photo3.jpeg" alt="MIST Dallas closing ceremony" fill className="object-cover" />
        <div className="absolute inset-0 bg-[#0F2240]/80" />
        <FadeUp className="relative z-10 text-center px-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#7ADBB8] text-xs font-semibold px-4 py-1.5 rounded-full mb-8">
            <Trophy className="w-3.5 h-3.5" /> Board Recruitment 2026
          </div>
          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
            Your chapter.<br />Your legacy.
          </h2>
          <Link href="/portal" className="inline-flex items-center gap-2 bg-white text-[#1B3464] font-bold px-10 py-4 rounded-full hover:bg-[#7ADBB8] hover:scale-105 transition-all duration-300 text-base mt-4">
            Apply for a Position <ArrowRight className="w-5 h-5" />
          </Link>
        </FadeUp>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#0F1B2D] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.png" alt="MIST Dallas" width={32} height={32} className="object-contain brightness-0 invert" />
                <span className="font-bold text-lg" style={{ fontFamily: "var(--font-syne)" }}>MIST Dallas</span>
              </div>
              <p className="text-white/40 text-sm leading-relaxed">Southern regional chapter of the Muslim Interscholastic Tournament. Open to all high schoolers. Est. 2018.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white/60 text-xs uppercase tracking-widest">Links</h4>
              <ul className="space-y-2">
                {[...NAV_LINKS, { label: "Board Portal", href: "/portal" }].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/40 hover:text-[#7ADBB8] text-sm transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4 text-white/60 text-xs uppercase tracking-widest">Contact</h4>
              <a href="mailto:board@mistdallas.org" className="text-[#7ADBB8] text-sm hover:text-[#2EA87A] transition-colors">board@mistdallas.org</a>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/20 text-sm">© {new Date().getFullYear()} MIST Dallas.</p>
            <p className="text-white/20 text-sm">A regional chapter of MIST National</p>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(40px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
        @keyframes letterRise {
          from {
            opacity: 0;
            transform: translateY(100%) skewY(8deg);
          }
          to {
            opacity: 1;
            transform: translateY(0) skewY(0deg);
          }
        }
      `}</style>
    </div>
  );
}
