import type { Metadata } from "next";
import { Syne, DM_Sans, Permanent_Marker } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const permanentMarker = Permanent_Marker({
  variable: "--font-brush",
  subsets: ["latin"],
  weight: "400",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
});

const SITE_URL = "https://mistdallas.org";
const DESCRIPTION =
  "MIST Dallas is the Southern regional chapter of the Muslim Interscholastic Tournament, hosting competitions for high schoolers across the South in an Islamic environment.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "MIST Dallas — Muslim Interscholastic Tournament",
    template: "%s — MIST Dallas",
  },
  description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "MIST Dallas",
    title: "MIST Dallas — Muslim Interscholastic Tournament",
    description: "Where faith meets excellence.",
    images: [{ url: "/hero.jpg", width: 1206, height: 1026, alt: "MIST Dallas tournament" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "MIST Dallas",
    description: "Where faith meets excellence.",
    images: ["/hero.jpg"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${syne.variable} ${dmSans.variable} ${permanentMarker.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
