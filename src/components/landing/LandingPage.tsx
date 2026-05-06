"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import {
  Trophy,
  Users,
  Heart,
  Star,
  Music,
  BookOpen,
  Swords,
  Palette,
  Mic,
  Menu,
  X,
  ChevronRight,
  MapPin,
  Calendar,
  ArrowRight,
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
  {
    icon: Swords,
    title: "Sports",
    description:
      "Brothers and sisters compete in basketball, soccer, volleyball, and more in a halal environment.",
    color: "from-[#1B3464] to-[#2E7BC4]",
  },
  {
    icon: Palette,
    title: "Arts",
    description:
      "Visual arts, calligraphy, photography, and creative expression rooted in Islamic aesthetics.",
    color: "from-[#2E7BC4] to-[#90C8EA]",
  },
  {
    icon: Users,
    title: "Group Competitions",
    description:
      "Team-based events that build collaboration, leadership, and creative problem-solving.",
    color: "from-[#1A6B3C] to-[#2EA87A]",
  },
  {
    icon: BookOpen,
    title: "Quran",
    description:
      "Recitation and memorization competitions celebrating the beauty of the Holy Quran.",
    color: "from-[#2EA87A] to-[#7ADBB8]",
  },
  {
    icon: Mic,
    title: "Writing & Oratory",
    description:
      "Spoken word, debate, essay writing, and public speaking with meaningful Islamic themes.",
    color: "from-[#1B3464] to-[#1A6B3C]",
  },
  {
    icon: Music,
    title: "Knowledge Bowl",
    description:
      "Trivia and academic competitions testing Islamic knowledge, history, and general scholarship.",
    color: "from-[#2E7BC4] to-[#2EA87A]",
  },
];

export default function LandingPage() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex flex-col min-h-screen bg-white">
      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAF8] border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="MIST Dallas"
              width={48}
              height={48}
              className="object-contain"
            />
            <span className="font-semibold text-[#2D2F3A] text-lg hidden sm:block">
              MIST Dallas
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-gray-600 hover:text-[#1B3464] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/portal"
              className="hidden md:flex items-center gap-1.5 bg-[#1B3464] text-white text-sm font-medium px-5 py-2.5 rounded-full hover:bg-[#2E7BC4] transition-colors"
            >
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
            <button
              className="md:hidden p-2 text-gray-600"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-[#FAFAF8] border-t border-gray-100 px-6 py-4 flex flex-col gap-4">
            {NAV_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm font-medium text-gray-700"
                onClick={() => setMobileOpen(false)}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/portal"
              className="flex items-center justify-center gap-1.5 bg-[#1B3464] text-white text-sm font-medium px-5 py-2.5 rounded-full"
              onClick={() => setMobileOpen(false)}
            >
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Dark gradient background */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(135deg, #1B3464 0%, #0F2240 40%, #1A3A2A 70%, #1A6B3C 100%)",
          }}
        />

        {/* Decorative circles */}
        <div className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2E7BC4, transparent)" }} />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #2EA87A, transparent)" }} />

        <div className="relative z-10 text-center px-6 max-w-5xl mx-auto pt-16">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="MIST Dallas"
              width={140}
              height={140}
              className="object-contain drop-shadow-2xl brightness-0 invert"
              priority
            />
          </div>

          {/* Tagline badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5 fill-[#7ADBB8] text-[#7ADBB8]" />
            Texas Regional Chapter
            <Star className="w-3.5 h-3.5 fill-[#7ADBB8] text-[#7ADBB8]" />
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold text-white leading-tight mb-6 tracking-tight">
            MIST Dallas
          </h1>
          <p className="text-xl md:text-2xl font-light text-white/70 mb-4">
            Where faith meets excellence.
          </p>
          <p className="text-base md:text-lg text-white/50 max-w-2xl mx-auto mb-12">
            The Muslim Interscholastic Tournament brings high schoolers across Texas together
            to compete, grow, and celebrate their identity in an Islamic environment.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="#about"
              className="flex items-center justify-center gap-2 bg-white text-[#1B3464] font-semibold px-8 py-4 rounded-full hover:bg-[#7ADBB8] transition-colors text-base"
            >
              Learn More <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/portal"
              className="flex items-center justify-center gap-2 bg-transparent border-2 border-white/40 text-white font-semibold px-8 py-4 rounded-full hover:border-[#7ADBB8] hover:text-[#7ADBB8] transition-colors text-base"
            >
              Board Portal <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/40">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent" />
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <section className="bg-[#FAFAF8] border-y border-gray-100 py-12">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {STATS.map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-4xl font-bold mb-1"
                  style={{
                    background: "linear-gradient(135deg, #2E7BC4, #2EA87A)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-sm text-gray-500 font-medium">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ABOUT ── */}
      <section id="about" className="py-24 px-6">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="text-[#2EA87A] text-sm font-semibold uppercase tracking-widest">
              About Us
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#2D2F3A] mt-3 mb-6 leading-tight">
              More than a tournament.
              <br />
              <span
                style={{
                  background: "linear-gradient(135deg, #2E7BC4, #2EA87A)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                A community.
              </span>
            </h2>
            <p className="text-gray-600 text-lg leading-relaxed mb-6">
              MIST — the Muslim Interscholastic Tournament — is a national organization
              that empowers Muslim high school students to explore their identity, talents,
              and faith through competition and community.
            </p>
            <p className="text-gray-600 text-lg leading-relaxed mb-8">
              MIST Dallas is the regional chapter serving Texas, hosting our annual
              tournament where students from across the state come together in a halal,
              welcoming environment to compete, connect, and grow.
            </p>
            <div className="flex flex-col sm:flex-row gap-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2F9] flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-5 h-5 text-[#1B3464]" />
                </div>
                <div>
                  <div className="font-semibold text-[#2D2F3A] text-sm">Dallas, Texas</div>
                  <div className="text-gray-500 text-sm">Serving all of Texas</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#EEF2F9] flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-[#1B3464]" />
                </div>
                <div>
                  <div className="font-semibold text-[#2D2F3A] text-sm">Annual Tournament</div>
                  <div className="text-gray-500 text-sm">Every spring semester</div>
                </div>
              </div>
            </div>
          </div>

          {/* Visual card */}
          <div className="relative">
            <div
              className="rounded-3xl p-8 text-white"
              style={{
                background: "linear-gradient(135deg, #1B3464 0%, #1A6B3C 100%)",
              }}
            >
              <div className="flex items-center gap-3 mb-6">
                <Heart className="w-6 h-6 text-[#7ADBB8]" />
                <span className="font-semibold text-white/90">Our Mission</span>
              </div>
              <blockquote className="text-2xl font-light text-white leading-relaxed mb-6">
                &ldquo;To provide Muslim youth with an Islamic environment where they can
                express their talents, strengthen their faith, and build lasting
                connections.&rdquo;
              </blockquote>
              <div className="border-t border-white/20 pt-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[#7ADBB8] font-bold text-2xl">Halal</div>
                  <div className="text-white/60 text-sm">Environment</div>
                </div>
                <div>
                  <div className="text-[#7ADBB8] font-bold text-2xl">Ihsan</div>
                  <div className="text-white/60 text-sm">In everything we do</div>
                </div>
              </div>
            </div>
            {/* Decorative offset card */}
            <div
              className="absolute -bottom-4 -right-4 -z-10 w-full h-full rounded-3xl opacity-30"
              style={{ background: "linear-gradient(135deg, #2E7BC4, #2EA87A)" }}
            />
          </div>
        </div>
      </section>

      {/* ── TOURNAMENT CATEGORIES ── */}
      <section id="categories" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <span className="text-[#2EA87A] text-sm font-semibold uppercase tracking-widest">
              Competition Categories
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-[#2D2F3A] mt-3 leading-tight">
              Something for everyone.
            </h2>
            <p className="text-gray-500 text-lg mt-4 max-w-2xl mx-auto">
              From the court to the canvas, MIST Dallas hosts over 20 categories
              across sports, arts, academics, and Islamic studies.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.title}
                  className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:-translate-y-1 hover:shadow-md transition-all duration-200"
                >
                  <div
                    className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center mb-4`}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-[#2D2F3A] text-lg mb-2">{cat.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{cat.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── JOIN THE BOARD CTA ── */}
      <section
        id="tournament"
        className="py-24 px-6 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0F2240 0%, #1A3A2A 100%)",
        }}
      >
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-5">
          <Trophy className="w-full h-full text-white" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-[#7ADBB8] text-sm px-4 py-1.5 rounded-full mb-6">
            <Star className="w-3.5 h-3.5 fill-current" />
            Board Recruitment Open
          </div>
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to help build
            <br />
            something meaningful?
          </h2>
          <p className="text-white/60 text-lg max-w-2xl mx-auto mb-10">
            MIST Dallas runs entirely on volunteers who believe in this mission.
            Join the board, lead your team, and make this year&apos;s tournament the best yet.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/portal"
              className="flex items-center justify-center gap-2 bg-white text-[#1B3464] font-bold px-10 py-4 rounded-full hover:bg-[#7ADBB8] transition-colors text-base"
            >
              Apply for a Position <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contact" className="bg-[#2D2F3A] text-white py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.png"
                  alt="MIST Dallas"
                  width={40}
                  height={40}
                  className="object-contain"
                />
                <span className="font-bold text-lg">MIST Dallas</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Regional chapter of the Muslim Interscholastic Tournament, serving
                high schoolers across Texas.
              </p>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white/80">Quick Links</h4>
              <ul className="space-y-2">
                {[...NAV_LINKS, { label: "Board Portal", href: "/portal" }].map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-white/50 hover:text-[#7ADBB8] text-sm transition-colors"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4 text-white/80">Connect</h4>
              <p className="text-white/50 text-sm mb-2">
                Questions about the tournament or board recruitment?
              </p>
              <a
                href="mailto:board@mistdallas.org"
                className="text-[#7ADBB8] text-sm hover:text-[#2EA87A] transition-colors"
              >
                board@mistdallas.org
              </a>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-white/30 text-sm">
              © {new Date().getFullYear()} MIST Dallas. All rights reserved.
            </p>
            <p className="text-white/30 text-sm">
              A regional chapter of{" "}
              <span className="text-white/50">MIST National</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
