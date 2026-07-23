import type { Metadata } from 'next';
import './globals.css';
import { AdminLayoutClient } from '@/components/AdminLayoutClient';
import { BRAND } from '@/config/brand';

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
      <body>
        <AdminLayoutClient>
          {children}
        </AdminLayoutClient>
      </body>
    </html>
  );
}
