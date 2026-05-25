import Link from 'next/link';

/**
 * Public footer shown on every page when the viewer is not logged in.
 * Mirrors the footer originally inlined on the marketing homepage.
 */
export function PublicFooter() {
  return (
    <footer className="border-t border-border px-4 py-6 mt-auto">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
        <p className="text-muted text-sm font-sans">© 2026 Artypot LLC</p>
        <nav className="flex flex-wrap items-center justify-center gap-4 sm:gap-5">
          <Link href="/about" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            About
          </Link>
          <Link href="/tos" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            Terms
          </Link>
          <Link href="/privacy" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            Privacy
          </Link>
          <Link href="/support" className="text-sm text-muted hover:text-foreground transition-colors font-sans">
            Contact
          </Link>
        </nav>
      </div>
    </footer>
  );
}
