"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ArrowLeft, X, ChevronLeft, ChevronRight } from "lucide-react";

interface Photo { name: string; url: string }
interface Props { photos: Photo[] }

export default function GalleryClient({ photos }: Props) {
  const [lightbox, setLightbox] = useState<number | null>(null);

  function prev() { setLightbox(i => (i === null || i === 0 ? photos.length - 1 : i - 1)); }
  function next() { setLightbox(i => (i === null || i === photos.length - 1 ? 0 : i + 1)); }

  return (
    <div className="min-h-screen bg-[#0A1220] text-white">
      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 z-40 bg-[#0A1220]/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="MIST Dallas" width={28} height={28} className="object-contain brightness-0 invert opacity-80" />
            <span className="font-bold text-sm" style={{ fontFamily: "var(--font-syne)" }}>MIST Dallas</span>
          </div>
          <span className="text-white/30 text-sm">{photos.length} photos</span>
        </div>
      </div>

      {/* Header */}
      <div className="pt-32 pb-12 px-6 text-center">
        <span className="text-[#7ADBB8] text-xs font-bold uppercase tracking-widest">Gallery</span>
        <h1 className="text-5xl md:text-7xl font-extrabold mt-4 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
          MIST Moments
        </h1>
        <p className="text-white/40 mt-4 text-lg max-w-md mx-auto">Snapshots from the tournament floor, backstage, and everything in between.</p>
      </div>

      {/* Grid */}
      {photos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 px-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
            <svg className="w-8 h-8 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-white/40 mb-2">Photos coming soon</h2>
          <p className="text-white/20 text-sm">Check back after the event!</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 pb-20">
          {/* Masonry-style columns */}
          <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
            {photos.map((photo, i) => (
              <button
                key={photo.name}
                onClick={() => setLightbox(i)}
                className="relative w-full break-inside-avoid rounded-2xl overflow-hidden group block"
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
      )}

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          {/* Close */}
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Counter */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 text-white/40 text-sm tabular-nums">
            {lightbox + 1} / {photos.length}
          </div>

          {/* Prev */}
          <button
            onClick={e => { e.stopPropagation(); prev(); }}
            className="absolute left-4 md:left-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Image */}
          <div className="relative w-full max-w-5xl max-h-[85vh] mx-16" onClick={e => e.stopPropagation()}>
            <Image
              src={photos[lightbox].url}
              alt={`MIST Dallas photo ${lightbox + 1}`}
              width={1200}
              height={900}
              className="object-contain w-full h-full max-h-[85vh] rounded-2xl"
            />
          </div>

          {/* Next */}
          <button
            onClick={e => { e.stopPropagation(); next(); }}
            className="absolute right-4 md:right-8 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}
