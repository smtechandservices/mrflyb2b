import type { Metadata } from "next";
import { Newsreader, Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutContent } from "@/components/LayoutContent";
import { BRAND } from "@/config/brand";

const newsreader = Newsreader({ subsets: ["latin"], variable: "--font-newsreader" });
const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jetbrains-mono" });

const description = `The flight booking platform built for travel agents. Search, book, and manage client travel with ${BRAND.name}.`;

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: BRAND.name,
  description,
  icons: {
    icon: BRAND.logo,
    shortcut: BRAND.logo,
    apple: BRAND.logo,
  },
  openGraph: {
    title: BRAND.name,
    description,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: BRAND.name }],
    siteName: BRAND.name,
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: BRAND.name,
    description,
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${newsreader.variable} ${geist.variable} ${jetbrainsMono.variable} antialiased`}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
