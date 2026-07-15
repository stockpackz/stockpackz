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
  title: "Stockpackz | Robinhood Chain",
  description: "Open packs. Own tokenized stocks on Robinhood Chain.",
  icons: {
    icon: "/graphics/stockpackz-icon-v4.png",
    apple: "/graphics/stockpackz-icon-v4.png",
  },
  openGraph: {
    title: "Stockpackz",
    description: "Open packs. Own tokenized stocks on Robinhood Chain.",
    images: ["/graphics/stockpackz-logo-v4.png"],
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
