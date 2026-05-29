import type { Metadata } from "next";
import { Noto_Sans_Thai } from "next/font/google";
import { getLocale } from "@/lib/i18n-server";
import { LocaleProvider } from "@/lib/i18n-client";
import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-thai",
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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Cofoundee — Where Thai startups build together",
      },
    ],
    locale: "en_US",
    alternateLocale: ["th_TH"],
  },
  twitter: {
    card: "summary_large_image",
    title: "Cofoundee — Where Thai startups build together",
    description:
      "Community, partners, capital, and co-founders for Thailand's startup ecosystem — in one place.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
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
      className={`${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-cream text-ink">
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
