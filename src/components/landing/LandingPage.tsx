"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Trophy, Users, Star, Music, BookOpen, Swords,
  Palette, Mic, Menu, X, ChevronRight, ArrowRight,
} from "lucide-react";

const NAV_LINKS = [
  { label: "About", href: "#about" },
  { label: "Tournament", href: "#tournament" },
  { label: "Categories", href: "#categories" },
  { label: "Contact", href: "#contact" },
];

const STATS = [
  { value: "10+", label: "Years Running" },
  { value: "1,000+", label: "Competitors" },
  { value: "50+", label: "Texas Schools" },
  { value: "20+", label: "Categories" },
];

const CATEGORIES = [
  { icon: Swords, title: "Sports", description: "Brothers and sisters compete in basketball, soccer, volleyball, and more in a halal environment.", color: "bg-[#1B3464]" },
  { icon: Palette, title: "Arts", description: "Visual arts, calligraphy, photography, and creative expression rooted in Islamic aesthetics.", color: "bg-[#2E7BC4]" },
  { icon: Users, title: "Group Competitions", description: "Team-based events that build collaboration, leadership, and creative problem-solving.", color: "bg-[#1A6B3C]" },
  { icon: BookOpen, title: "Quran", description: "Recitation and memorization competitions celebrating the beauty of the Holy Quran.", color: "bg-[#2EA87A]" },
  { icon: Mic, title: "Writing & Oratory", description: "Spoken word, debate, essay writing, and public speaking with meaningful Islamic themes.", color: "bg-[#1B3464]" },
  { icon: Music, title: "Knowledge Bowl", description: "Trivia and academic competitions testing Islamic knowledge, history, and general scholarship.", color: "bg-[#2E7BC4]" },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white">

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="MIST Dallas" width={40} height={40} className="object-contain" />
            <span className="font-bold text-[#1B3464] text-lg hidden sm:block">MIST Dallas</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="text-sm font-medium text-gray-600 hover:text-[#1B3464] transition-colors">
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/portal" className="hidden md:flex items-center gap-1.5 bg-[#1B3464] text-white text-sm font-semibold px-5 py-2.5 rounded-full hover:bg-[#2E7BC4] transition-colors">
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
            <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
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
        {/* Background photo */}
        <Image
          src="/hero.jpg"
          alt="MIST Dallas 2026 Board"
          fill
          className="object-cover object-top"
          priority
        />
        {/* Dark gradient overlay — heavier at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/20" />

        {/* Content pinned to bottom */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8 pb-20 pt-32">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm border border-white/25 text-[#7ADBB8] text-sm px-4 py-1.5 rounded-full mb-6">
              <Star className="w-3.5 h-3.5 fill-current" />
              Texas Regional Chapter · 2026 Board
            </div>
            <h1 className="text-6xl md:text-8xl font-black text-white leading-[0.9] tracking-tight mb-6">
              MIST<br />Dallas
            </h1>
            <p className="text-xl md:text-2xl text-white/80 font-light mb-10 max-w-xl leading-relaxed">
              Where faith meets excellence — uniting Muslim high schoolers across Texas.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link href="/portal" className="flex items-center justify-center gap-2 bg-white text-[#1B3464] font-bold px-8 py-4 rounded-full hover:bg-[#7ADBB8] transition-colors text-base">
                Apply for Board <ArrowRight className="w-5 h-5" />
              </Link>
              <Link href="#about" className="flex items-center justify-center gap-2 border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:border-white hover:bg-white/10 transition-colors text-base">
                Learn More
              </Link>
            </div>
          </div>
        </div>

        {/* Scroll hint */}
        <div className="absolute bottom-8 right-8 z-10 flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs tracking-widest uppercase" style={{ writingMode: "vertical-rl" }}>Scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-[#1B3464] py-14">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-4xl font-black text-[#7ADBB8] mb-1">{s.value}</div>
                <div className="text-sm text-white/60 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#2EA87A] text-sm font-bold uppercase tracking-widest">About Us</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B3464] mt-3 mb-6 leading-tight">
              More than a tournament.
              <br />
              <span className="text-[#2E7BC4]">A community.</span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-5">
              MIST — the Muslim Interscholastic Tournament — is a national organization that empowers Muslim high school students to explore their identity, talents, and faith through competition and community.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              MIST Dallas is the Texas regional chapter hosting our annual tournament where students from across the state compete, connect, and grow in a fully halal environment.
            </p>
            <div className="flex flex-wrap gap-4">
              {["Halal Environment", "Ihsan in Everything", "10+ Years Strong"].map((tag) => (
                <span key={tag} className="bg-[#EEF2F9] text-[#1B3464] text-sm font-semibold px-4 py-2 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Photo */}
          <div className="relative">
            <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl">
              <Image src="/photo1.jpeg" alt="MIST Dallas tournament" fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#1B3464]/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="text-white font-bold text-xl">1,000+ Competitors</div>
                <div className="text-white/70 text-sm mt-1">from across Texas every year</div>
              </div>
            </div>
            {/* Accent card */}
            <div className="absolute -bottom-6 -left-6 bg-[#2EA87A] text-white rounded-2xl p-5 shadow-xl w-44">
              <div className="text-3xl font-black">50+</div>
              <div className="text-sm text-white/80 mt-1">Texas schools represented</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TOURNAMENT ENERGY ── */}
      <section id="tournament" className="relative py-32 overflow-hidden">
        <Image src="/photo2.jpeg" alt="MIST Dallas crowd" fill className="object-cover" />
        <div className="absolute inset-0 bg-[#0F2240]/80" />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <span className="text-[#7ADBB8] text-sm font-bold uppercase tracking-widest">The Tournament</span>
          <h2 className="text-4xl md:text-6xl font-black text-white mt-4 mb-6 leading-tight">
            This is what<br />MIST looks like.
          </h2>
          <p className="text-white/70 text-xl max-w-2xl mx-auto leading-relaxed">
            Thousands of students, dozens of schools, one day of competition, community, and celebration of Muslim excellence.
          </p>
        </div>
      </section>

      {/* ── CATEGORIES ── */}
      <section id="categories" className="py-24 px-6 bg-[#F8FAFC]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#2EA87A] text-sm font-bold uppercase tracking-widest">Competition Categories</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B3464] mt-3">Something for everyone.</h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
              From the court to the canvas, MIST Dallas hosts 20+ categories across sports, arts, academics, and Islamic studies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200 group">
                  <div className={`w-11 h-11 rounded-xl ${cat.color} flex items-center justify-center mb-4`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <h3 className="font-bold text-[#1B3464] text-lg mb-2">{cat.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{cat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── JOIN THE BOARD ── */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          {/* Photo */}
          <div className="relative rounded-3xl overflow-hidden aspect-[4/3] shadow-2xl order-2 lg:order-1">
            <Image src="/photo4.jpeg" alt="MIST Dallas board members" fill className="object-cover object-top" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1B3464]/50 to-transparent" />
            <div className="absolute bottom-6 left-6">
              <div className="inline-flex items-center gap-2 bg-[#2EA87A] text-white text-sm font-bold px-4 py-2 rounded-full">
                <Star className="w-3.5 h-3.5 fill-current" /> 2026 Board Recruitment Open
              </div>
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <span className="text-[#2EA87A] text-sm font-bold uppercase tracking-widest">Join the Team</span>
            <h2 className="text-4xl md:text-5xl font-black text-[#1B3464] mt-3 mb-6 leading-tight">
              Ready to build<br />something meaningful?
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              MIST Dallas runs entirely on dedicated volunteers who believe in this mission. Join the board, lead your team, and make this year&apos;s tournament the best yet.
            </p>
            <div className="space-y-3 mb-10">
              {["Lead a team and develop real leadership skills", "Build lasting friendships with like-minded Muslims", "Make a direct impact on your community"].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#2EA87A] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-gray-600 text-sm">{item}</span>
                </div>
              ))}
            </div>
            <Link href="/portal" className="inline-flex items-center gap-2 bg-[#1B3464] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2E7BC4] transition-colors text-base">
              Apply Now <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── CLOSING CTA ── */}
      <section className="relative py-32 overflow-hidden">
        <Image src="/photo3.jpeg" alt="MIST Dallas closing ceremony" fill className="object-cover" />
        <div className="absolute inset-0 bg-[#0F2240]/85" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#7ADBB8] text-sm px-4 py-1.5 rounded-full mb-6">
            <Trophy className="w-3.5 h-3.5" /> Board Recruitment 2026
          </div>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            Your chapter.<br />Your legacy.
          </h2>
          <p className="text-white/60 text-lg mb-10 max-w-xl mx-auto">
            Applications are open. Take the first step toward one of the most rewarding experiences of your life.
          </p>
          <Link href="/portal" className="inline-flex items-center gap-2 bg-white text-[#1B3464] font-bold px-10 py-4 rounded-full hover:bg-[#7ADBB8] transition-colors text-base">
            Apply for a Position <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#0F1B2D] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image src="/logo.png" alt="MIST Dallas" width={36} height={36} className="object-contain brightness-0 invert" />
                <span className="font-bold text-lg">MIST Dallas</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Regional chapter of the Muslim Interscholastic Tournament, serving high schoolers across Texas.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white/80">Quick Links</h4>
              <ul className="space-y-2">
                {[...NAV_LINKS, { label: "Board Portal", href: "/portal" }].map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-white/50 hover:text-[#7ADBB8] text-sm transition-colors">{l.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white/80">Connect</h4>
              <p className="text-white/50 text-sm mb-3">Questions about the tournament or board recruitment?</p>
              <a href="mailto:board@mistdallas.org" className="text-[#7ADBB8] text-sm hover:text-[#2EA87A] transition-colors">
                board@mistdallas.org
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-sm">© {new Date().getFullYear()} MIST Dallas. All rights reserved.</p>
            <p className="text-white/30 text-sm">A regional chapter of <span className="text-white/50">MIST National</span></p>
          </div>
        </div>
      </footer>
    </div>
  );
}
