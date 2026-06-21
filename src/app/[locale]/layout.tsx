import type { Metadata } from 'next';
import { Geist, Geist_Mono, Kalam, Architects_Daughter, DM_Sans } from 'next/font/google';
import { NextIntlClientProvider, hasLocale } from 'next-intl';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import '../globals.css';
import { routing } from '@/i18n/routing';
import Providers from '@/components/Providers';
import { AppShell } from '@/components/AppShell';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const kalam = Kalam({
  variable: '--font-kalam',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const architectsDaughter = Architects_Daughter({
  variable: '--font-architects-daughter',
  subsets: ['latin'],
  weight: '400',
});

const dmSans = DM_Sans({
  variable: '--font-dm-sans',
  subsets: ['latin'],
});

export async function generateMetadata(
  { params }: { params: Promise<{ locale: string }> },
): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'Metadata' });

  return {
    // `default` titles routes that set no title of their own (e.g. the home page
    // and client pages without a metadata layout). `template` brands every
    // per-page title consistently, so a page setting `title: 'Dashboard'` renders
    // as "Dashboard · Artypot". The "· Artypot" suffix is a brand mark, kept
    // untranslated; the default title and description are localized.
    title: {
      default: t('titleDefault'),
      template: '%s · Artypot',
    },
    description: t('description'),
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
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${kalam.variable} ${architectsDaughter.variable} ${dmSans.variable} antialiased min-h-screen`}
      >
        <NextIntlClientProvider>
          <Providers>
            <AppShell>
              {children}
            </AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
