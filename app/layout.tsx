import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/navbar"
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
  title: "sanjai balajee",
  description: "portfolio site - always learning, always shipping.",
  openGraph: {
    title: "sanjai balajee",
    description: "portfolio site - always learning, always shipping.",
    url: "https://sanjaibalajee.me",
    siteName: "sanjai balajee",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "sanjai balajee",
    description: "portfolio site - always learning, always shipping.",
  },
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
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-mono antialiased`}
      >
        <div className="max-w-2xl mx-auto py-8 px-6">
          <Navbar />
          {children}
        </div>
      </body>
    </html>
  );
}
