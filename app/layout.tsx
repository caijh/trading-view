import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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
  title: "TradingView",
  description: "mock the Trading View",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-minimalscrollbar="yes">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <footer className="w-full border-t border-slate-200 bg-white py-2 text-center text-xs text-slate-500">
          Charts powered by{" "}
          <a
            href="https://www.tradingview.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            TradingView
          </a>
          {" "}— using{" "}
          <a
            href="https://www.tradingview.com/lightweight-charts/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            Lightweight Charts&trade;
          </a>
          .
        </footer>
      </body>
    </html>
  );
}
