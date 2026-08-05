import type { Metadata } from 'next';
import { Newsreader, Geist, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { BRAND } from '@/config/brand';

const newsreader = Newsreader({ subsets: ['latin'], variable: '--font-newsreader' });
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'),
  title: BRAND.admin.name,
  description: BRAND.admin.description,
  icons: {
    icon: BRAND.logo,
    shortcut: BRAND.logo,
    apple: BRAND.logo,
  },
  openGraph: {
    title: BRAND.admin.name,
    description: BRAND.admin.description,
    images: [BRAND.logo],
    siteName: BRAND.admin.name,
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: BRAND.admin.name,
    description: BRAND.admin.description,
    images: [BRAND.logo],
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
        <AdminLayoutClient>
          {children}
        </AdminLayoutClient>
      </body>
    </html>
  );
}
