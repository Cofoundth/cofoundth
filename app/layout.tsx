import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cofoundee — Find your co-founder",
  description:
    "The platform for Thai founders to find their co-founder based on complementary skills, intent, and industry.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-cream text-ink">
        {children}
      </body>
    </html>
  );
}
