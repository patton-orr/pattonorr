import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { icons } from "@/lib/brand";
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
  title: "Patton Orr",
  description: "Personal site of Patton Orr.",
  // Icons are declared explicitly (rather than via the app/icon.png convention)
  // so the color can follow the environment — see lib/brand.ts.
  icons: {
    icon: [
      { url: icons.small, sizes: "32x32", type: "image/png" },
      { url: icons.medium, sizes: "192x192", type: "image/png" },
      { url: icons.large, sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: icons.apple, sizes: "180x180", type: "image/png" }],
  },
  // iOS: run standalone (no browser chrome) and label the home-screen icon.
  // `app/manifest.ts` injects its own icon links.
  appleWebApp: {
    capable: true,
    title: "Patton Orr",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
