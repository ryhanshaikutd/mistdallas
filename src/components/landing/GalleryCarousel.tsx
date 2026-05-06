"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { ArrowRight } from "lucide-react";

interface Props { photos: string[] }

export default function GalleryCarousel({ photos }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Duplicate photos so the infinite loop is seamless
  const doubled = [...photos, ...photos];

  useEffect(() => {
    const track = trackRef.current;
    if (!track || photos.length === 0) return;

    let raf: number;
    let offset = 0;
    const speed = 0.4; // px per frame
    const halfWidth = track.scrollWidth / 2;

    function tick() {
      offset += speed;
      if (offset >= halfWidth) offset = 0;
      if (track) track.style.transform = `translateX(-${offset}px)`;
      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [photos]);

  if (photos.length === 0) return null;

  return (
    <section className="py-24 overflow-hidden bg-white">
      <div className="max-w-6xl mx-auto px-6 mb-10 flex items-end justify-between">
        <div>
          <span className="text-[#2EA87A] text-xs font-bold uppercase tracking-widest">Gallery</span>
          <h2 className="text-5xl md:text-6xl font-extrabold text-[#1B3464] mt-3 leading-tight" style={{ fontFamily: "var(--font-syne)" }}>
            The moments<br />we live for.
          </h2>
        </div>
        <Link
          href="/gallery"
          className="hidden md:flex items-center gap-2 bg-[#1B3464] text-white font-bold px-6 py-3 rounded-full hover:bg-[#2E7BC4] transition-all duration-300 text-sm flex-shrink-0 mb-2"
        >
          Full Gallery <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Carousel strip */}
      <Link href="/gallery" className="block cursor-pointer group">
        <div className="relative w-full" style={{ maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)" }}>
          <div ref={trackRef} className="flex gap-3 w-max will-change-transform">
            {doubled.map((url, i) => (
              <div
                key={i}
                className="relative flex-shrink-0 rounded-2xl overflow-hidden group-hover:opacity-90 transition-opacity duration-300"
                style={{ width: 280, height: 200 }}
              >
                <Image
                  src={url}
                  alt={`MIST Dallas photo ${(i % photos.length) + 1}`}
                  fill
                  className="object-cover"
                  sizes="280px"
                />
              </div>
            ))}
          </div>
          {/* Hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-[#1B3464]/80 backdrop-blur-sm text-white font-bold px-6 py-3 rounded-full flex items-center gap-2 text-sm">
              View Full Gallery <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </div>
      </Link>

      <div className="md:hidden max-w-6xl mx-auto px-6 mt-8">
        <Link href="/gallery" className="flex items-center justify-center gap-2 border-2 border-[#1B3464] text-[#1B3464] font-bold px-6 py-3 rounded-full text-sm w-full">
          View Full Gallery <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
