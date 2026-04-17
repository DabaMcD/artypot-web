import type { Metadata } from 'next';
import { Geist, Geist_Mono, Fraunces, DM_Sans } from 'next/font/google';
import './globals.css';
import Providers from '@/components/Providers';
import Nav from '@/components/Nav';
import Footer from '@/components/Footer';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Artypot — Fund the work. Then it gets made.',
  description:
    'Artypot is a crowdfund-commissioning platform where communities pool money into pots that pay out directly to creators once they complete a specified public creative work.',
  icons: {
    icon: [
      { url: '/artypot-favicon-16.png',  sizes: '16x16',   type: 'image/png' },
      { url: '/artypot-favicon-32.png',  sizes: '32x32',   type: 'image/png' },
      { url: '/artypot-favicon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/artypot-favicon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: { url: '/artypot-favicon-180.png', sizes: '180x180', type: 'image/png' },
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} ${dmSans.variable} antialiased min-h-screen flex flex-col`}>
        <Providers>
          <Nav />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
