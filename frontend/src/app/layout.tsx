import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "react-datepicker/dist/react-datepicker.css";
import { AuthProvider } from "@/context/AuthContext";
import { LayoutContent } from "@/components/LayoutContent";
import { BRAND } from "@/config/brand";

const inter = Inter({ subsets: ["latin"] });

const description = `Experience the journey like never before with ${BRAND.name}. Book flights to destinations worldwide with ease.`;

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
      <body className={`${inter.className} min-h-screen flex flex-col bg-slate-50`}>
        <AuthProvider>
          <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
      </body>
    </html>
  );
}
