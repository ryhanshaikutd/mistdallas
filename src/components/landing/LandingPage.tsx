"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import {
  Trophy, Users, Star, Music, BookOpen, Swords,
  Palette, Mic, Menu, X, ChevronRight, ArrowRight,
} from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Categories", href: "#categories" },
  { label: "Nationals", href: "#nationals" },
  { label: "Gallery", href: "/gallery" },
  { label: "Contact", href: "#contact" },
];

const STATS = [
  { value: "10+", label: "Years" },
  { value: "1,000+", label: "Competitors" },
  { value: "50+", label: "Schools" },
  { value: "20+", label: "Categories" },
];

const CATEGORIES = [
  { icon: Swords, title: "Sports", color: "bg-[#1B3464]" },
  { icon: Palette, title: "Arts", color: "bg-[#2E7BC4]" },
  { icon: Users, title: "Group Competitions", color: "bg-[#1A6B3C]" },
  { icon: BookOpen, title: "Quran", color: "bg-[#2EA87A]" },
  { icon: Mic, title: "Writing & Oratory", color: "bg-[#1B3464]" },
  { icon: Music, title: "Knowledge Bowl", color: "bg-[#2E7BC4]" },
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

interface Qualifier {
  id: string;
  year: number;
  name: string;
  school: string;
  category: string;
  placement: string | null;
}

export default function LandingPage({ qualifiers = [] }: { qualifiers?: Qualifier[] }) {
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
            <Image src="/logo.png" alt="MIST Dallas" width={38} height={38} className={`object-contain transition-all duration-300 ${scrolled ? "" : "brightness-0 invert"}`} />
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
      <section className="relative min-h-screen flex items-end overflow-hidden">
        <Image src="/hero.jpg" alt="MIST Dallas 2026 Board" fill className="object-cover object-top" priority />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />

        {/* Animated grain overlay for texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-32">
          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-[#7ADBB8] text-xs font-semibold px-4 py-1.5 rounded-full mb-8"
            style={{ animation: "fadeInDown 0.8s ease both" }}>
            <Star className="w-3 h-3 fill-current" />
            Texas Regional Chapter · 2026 Board
          </div>

          <h1 className="text-7xl md:text-9xl font-extrabold text-white leading-[0.85] tracking-tight mb-6"
            style={{ fontFamily: "var(--font-syne)", animation: "fadeInUp 0.9s ease 0.1s both" }}>
            MIST<br />Dallas
          </h1>

          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-md font-light"
            style={{ animation: "fadeInUp 0.9s ease 0.25s both" }}>
            Where faith meets excellence.
          </p>

          <div className="flex flex-col sm:flex-row gap-4"
            style={{ animation: "fadeInUp 0.9s ease 0.4s both" }}>
            <Link href="/portal" className="flex items-center justify-center gap-2 bg-white text-[#1B3464] font-bold px-8 py-4 rounded-full hover:bg-[#7ADBB8] transition-all duration-300 hover:scale-105 text-base">
              Apply for Board <ArrowRight className="w-5 h-5" />
            </Link>
            <Link href="#about" className="flex items-center justify-center gap-2 border border-white/30 text-white/80 font-medium px-8 py-4 rounded-full hover:border-white hover:text-white hover:bg-white/10 transition-all duration-300 text-base">
              Learn More
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 right-8 z-10" style={{ animation: "fadeIn 1s ease 1s both" }}>
          <div className="flex flex-col items-center gap-2 text-white/40">
            <div className="w-px h-12 bg-gradient-to-b from-transparent via-white/40 to-transparent" style={{ animation: "pulse 2s ease infinite" }} />
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1B3464]">
        <div className="max-w-5xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s, i) => (
              <FadeUp key={s.label} delay={i * 80} className="text-center">
                <div className="text-5xl font-extrabold text-[#7ADBB8] mb-1" style={{ fontFamily: "var(--font-syne)" }}>{s.value}</div>
                <div className="text-sm text-white/50 uppercase tracking-widest font-medium">{s.label}</div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <FadeUp>
            <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">About</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-4 mb-6 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
              More than a<br />tournament.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-8 max-w-md">
              Muslim high schoolers across Texas competing, growing, and celebrating their identity — in a fully halal environment.
            </p>
            <div className="flex flex-wrap gap-3">
              {["Halal Environment", "Ihsan", "10+ Years"].map((tag) => (
                <span key={tag} className="bg-[#EEF2F9] text-[#1B3464] text-sm font-semibold px-4 py-2 rounded-full">{tag}</span>
              ))}
            </div>
          </FadeUp>

          <FadeUp delay={150}>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl group">
              <Image src="/photo1.jpeg" alt="MIST Dallas tournament" fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B3464]/70 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-white font-bold text-2xl" style={{ fontFamily: "var(--font-syne)" }}>1,000+ Competitors</div>
                <div className="text-white/60 text-sm mt-1">from 50+ Texas schools</div>
              </div>
            </div>
          </FadeUp>
        </div>
      </section>

      {/* ── TOURNAMENT PHOTO ── */}
      <section className="relative h-[60vh] overflow-hidden">
        <Image src="/photo2.jpeg" alt="MIST Dallas crowd" fill className="object-cover" />
        <div className="absolute inset-0 bg-[#0F2240]/75" />
        <FadeUp className="relative z-10 h-full flex flex-col items-center justify-center text-center px-6">
          <h2 className="text-5xl md:text-7xl font-extrabold text-white leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
            This is MIST.
          </h2>
          <p className="text-white/50 text-lg mt-4 max-w-md">Thousands of students. One day. Pure energy.</p>
        </FadeUp>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="py-28 px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <FadeUp className="mb-14">
            <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">Categories</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-4" style={{ fontFamily: "var(--font-syne)" }}>
              Something for<br />everyone.
            </h2>
          </FadeUp>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {CATEGORIES.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <FadeUp key={cat.title} delay={i * 60}>
                  <div className="bg-white rounded-2xl p-6 border border-gray-100 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 group cursor-default">
                    <div className={`w-10 h-10 rounded-xl ${cat.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <h3 className="font-bold text-[#1B3464] text-base" style={{ fontFamily: "var(--font-syne)" }}>{cat.title}</h3>
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

      {/* ── JOIN ── */}
      <section id="join" className="py-28 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-20 items-center">
          <FadeUp delay={100}>
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl group">
              <Image src="/photo4.jpeg" alt="MIST Dallas board members" fill className="object-cover object-top transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B3464]/60 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <div className="inline-flex items-center gap-2 bg-[#2EA87A] text-white text-xs font-bold px-3 py-1.5 rounded-full">
                  <Star className="w-3 h-3 fill-current" /> 2026 Recruitment Open
                </div>
              </div>
            </div>
          </FadeUp>

          <FadeUp>
            <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">Join the Team</span>
            <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-4 mb-6 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
              Build something<br />meaningful.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed mb-10 max-w-sm">
              Lead a team. Make an impact. Be part of something bigger.
            </p>
            <Link href="/portal" className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] hover:scale-105 transition-all duration-300 text-base">
              Apply Now <ArrowRight className="w-5 h-5" />
            </Link>
          </FadeUp>
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
              <p className="text-white/40 text-sm leading-relaxed">Regional chapter of the Muslim Interscholastic Tournament. Serving Texas since 2013.</p>
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
      `}</style>
    </div>
  );
}
