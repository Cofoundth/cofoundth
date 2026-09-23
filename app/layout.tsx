import type { Metadata } from "next";
import { Noto_Sans_Thai, Inter, Rethink_Sans } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getLocale } from "@/lib/i18n-server";
import { LocaleProvider } from "@/lib/i18n-client";
import "./globals.css";

// Variable font — deliberately NO pinned `weight` list. Asking for four static
// weights made next/font emit one @font-face per weight × unicode-range
// (4 × 3 = 12 files), and Turbopack's Google-font replacer cannot parse those
// static URLs for a MULTI-AXIS family (Noto Sans Thai carries wdth + wght):
// "next/font/google queries have exactly one entry" → 12 module-not-found
// errors. It only bit on Vercel, never locally. Inter (also multi-axis) has
// always been fine precisely because it takes the variable path.
//
// The variable file is one request per range and carries the whole 100–900
// wght axis, so every weight the UI uses (400/500/600/700) still resolves —
// and so would any in between. Per the next/font docs: prefer variable fonts;
// `weight` is only for families with no variable version.
const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  variable: "--font-noto-thai",
  display: "swap",
});

// Body face. Latin renders Inter; Thai falls through to Noto Sans Thai
// per-glyph (Inter has no Thai coverage).
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

// Heading face — Onfound uses Rethink Sans. Same per-glyph Thai fallback.
const rethinkSans = Rethink_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-rethink",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.cofoundee.co";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Cofoundee — Where Thai startups build together",
    template: "%s · Cofoundee",
  },
  description:
    "The bridge for Thailand's startup ecosystem — a community where founders meet, companies find partners, and investors and advisors come to you when the time is right.",
  keywords: [
    "Thai startup",
    "startup Thailand",
    "co-founder",
    "founder community",
    "B2B partnership",
    "startup network",
    "Cofoundee",
  ],
  authors: [{ name: "Cofoundee" }],
  openGraph: {
    type: "website",
    siteName: "Cofoundee",
    title: "Cofoundee — Where Thai startups build together",
    description:
      "Community, partners, capital, and co-founders for Thailand's startup ecosystem — in one place.",
    url: SITE_URL,
    // images: supplied by app/opengraph-image.tsx (generated from live tokens)
    locale: "en_US",
    alternateLocale: ["th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cofoundee — Where Thai startups build together",
    description:
      "Community, partners, capital, and co-founders for Thailand's startup ecosystem — in one place.",
    // images: supplied by app/opengraph-image.tsx
  },
  // icons: intentionally absent. An explicit `icons` block SUPPRESSES Next's
  // file-convention icons, which is how the apple-touch-icon link went missing.
  // app/icon.svg and app/apple-icon.tsx are auto-wired when this is omitted.
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${notoSansThai.variable} ${inter.variable} ${rethinkSans.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
        <Analytics />
      </body>
    </html>
  );
}
