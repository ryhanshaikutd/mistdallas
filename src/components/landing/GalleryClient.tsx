"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, Grid2x2 } from "lucide-react";

interface Photo { name: string; url: string }
interface Props { photos: Photo[] }

export default function GalleryClient({ photos }: Props) {
  const [current, setCurrent] = useState(0);
  const [view, setView] = useState<"single" | "grid">("single");
  const [loaded, setLoaded] = useState(false);

  const prev = useCallback(() => setCurrent(i => (i === 0 ? photos.length - 1 : i - 1)), [photos.length]);
  const next = useCallback(() => setCurrent(i => (i === photos.length - 1 ? 0 : i + 1)), [photos.length]);

  // Keyboard nav
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (view !== "single") return;
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [prev, next, view]);

  // Reset loaded state on photo change
  useEffect(() => { setLoaded(false); }, [current]);

  return (
    <div className="min-h-screen bg-[#060D18] text-white flex flex-col">
      {/* Nav */}
      <div className="flex-shrink-0 flex items-center justify-between px-6 h-16 border-b border-white/8 z-20">
        <Link href="/" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft className="w-4 h-4" /> Back
        </Link>
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="MIST Dallas" width={24} height={24} className="object-contain brightness-0 invert opacity-60" />
          <span className="font-bold text-sm text-white/60" style={{ fontFamily: "var(--font-syne)" }}>MIST Dallas Gallery</span>
        </div>
        <button
          onClick={() => setView(v => v === "single" ? "grid" : "single")}
          className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white transition-colors"
        >
          <Grid2x2 className="w-4 h-4" />
          <span className="hidden sm:inline">{view === "single" ? "Grid" : "Slideshow"}</span>
        </button>
      </div>

      {photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white/30 mb-2">Photos coming soon</h2>
          <p className="text-white/20 text-sm">Check back after the event!</p>
        </div>
      ) : view === "single" ? (
        /* ── SINGLE VIEW ── */
        <div className="flex-1 flex flex-col">
          {/* Main image */}
          <div className="flex-1 relative flex items-center justify-center px-4 py-4">
            {/* Prev */}
            <button
              onClick={prev}
              className="absolute left-4 md:left-8 z-10 w-11 h-11 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Image */}
            <div className="relative w-full max-w-5xl" style={{ height: "calc(100vh - 260px)" }}>
              {!loaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                </div>
              )}
              <Image
                key={current}
                src={photos[current].url}
                alt={`MIST Dallas photo ${current + 1}`}
                fill
                className={`object-contain transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
                sizes="(max-width: 1024px) 100vw, 80vw"
                priority
                onLoad={() => setLoaded(true)}
              />
            </div>

            {/* Next */}
            <button
              onClick={next}
              className="absolute right-4 md:right-8 z-10 w-11 h-11 rounded-full bg-white/8 hover:bg-white/16 border border-white/10 flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom strip */}
          <div className="flex-shrink-0 pb-6 px-6 flex flex-col items-center gap-4">
            {/* Counter */}
            <span className="text-white/30 text-sm tabular-nums">
              {current + 1} <span className="text-white/15">/</span> {photos.length}
            </span>

            {/* Thumbnail strip */}
            <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1" style={{ scrollbarWidth: "none" }}>
              {photos.map((p, i) => (
                <button
                  key={p.name}
                  onClick={() => setCurrent(i)}
                  className="relative flex-shrink-0 rounded-lg overflow-hidden transition-all duration-200"
                  style={{
                    width: 52,
                    height: 40,
                    opacity: i === current ? 1 : 0.35,
                    outline: i === current ? "2px solid rgba(255,255,255,0.6)" : "none",
                    outlineOffset: 2,
                  }}
                >
                  <Image src={p.url} alt="" fill className="object-cover" sizes="52px" />
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* ── GRID VIEW ── */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-8">
            <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
              {photos.map((photo, i) => (
                <button
                  key={photo.name}
                  onClick={() => { setCurrent(i); setView("single"); }}
                  className="relative w-full break-inside-avoid rounded-xl overflow-hidden group block"
                  style={{ aspectRatio: i % 5 === 0 ? "3/4" : i % 3 === 0 ? "4/3" : "1/1" }}
                >
                  <Image
                    src={photo.url}
                    alt={`MIST Dallas photo ${i + 1}`}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
