import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Web3Provider } from "@/components/providers/web3-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://stockpackz.xyz"),
  title: "StockPackz | Robinhood Chain",
  description: "Open packs. Own tokenized stocks on Robinhood Chain.",
  verification: {
    google: "CPI2OLleSPKyC8Rz_RAYrHXWm3ymnPWZEopZgMjuAlk",
  },
  icons: {
    // Solid dark icons — transparent PNGs render as unpredictable shapes in
    // tabs, home screens, and pinned sites.
    icon: "/graphics/stockpackz-touch-icon.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "StockPackz",
    description: "Open packs. Own tokenized stocks on Robinhood Chain.",
    images: [{ url: "/graphics/og-image.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    site: "@stockpackz",
    creator: "@stockpackz",
    title: "StockPackz",
    description: "Open packs. Own tokenized stocks on Robinhood Chain.",
    images: ["/graphics/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-black text-foreground">
        <Web3Provider>{children}</Web3Provider>
      </body>
    </html>
  );
}
