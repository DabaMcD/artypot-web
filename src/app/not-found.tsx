// Plain next/link (not @/i18n/routing) on purpose: this page renders outside the
// [locale] tree, so locale-aware navigation doesn't apply here.
import Link from 'next/link';
import './globals.css';

// Global 404 for paths that fall outside the [locale] tree. The root layout is
// a bare passthrough (the document shell lives in [locale]/layout.tsx), so this
// page renders its own <html>/<body>. It's hardcoded English on purpose — it
// runs without locale context, so it can't call useTranslations. The pretty,
// chrome-wrapped, localized 404 lives at app/[locale]/not-found.tsx.
export const metadata = { title: 'Not found · Artypot' };

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen">
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="max-w-[520px] w-full text-center">
            <div className="font-mono text-[10px] uppercase tracking-[2px] text-muted mb-3">
              error · 404
            </div>
            <h1 className="font-display font-bold text-[36px] text-foreground leading-tight mb-3">
              this page doesn&apos;t exist.
            </h1>
            <p className="text-muted text-base mb-8">Off-platform. Off-grid. Off-page.</p>
            <Link href="/" className="font-mono text-sm uppercase tracking-widest underline text-foreground">
              ← Back to safety
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
