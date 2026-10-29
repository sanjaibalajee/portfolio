import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar"
import { Analytics } from '@vercel/analytics/next';
import { ThemeProvider } from '@/components/theme-provider';
import { AgentViewProvider } from '@/components/agent-view';
import { siteUrl, siteName, siteDescription } from '@/lib/site';
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
  metadataBase: siteUrl,
  title: siteName,
  description: siteDescription,
  openGraph: {
    title: "sanjai balajee",
    description: siteDescription,
    url: siteUrl.href,
    siteName: "sanjai balajee",
    locale: "en_US",
    type: "website",
    images: [{ url: '/og/home', width: 1200, height: 630, alt: siteName }],
  },
  twitter: {
    card: "summary_large_image",
    title: "sanjai balajee",
    description: siteDescription,
    images: [{ url: '/og/home', width: 1200, height: 630, alt: siteName }],
  },
  alternates: { types: { 'application/rss+xml': '/feed.xml' } },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        <ThemeProvider>
          <AgentViewProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-3 focus:text-neutral-950 dark:focus:bg-neutral-900 dark:focus:text-neutral-100">skip to content</a>
            <div className="site-frame max-w-2xl mx-auto py-8 px-6">
              <Navbar />
              <main id="main-content">{children}</main>
            </div>
          </AgentViewProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
