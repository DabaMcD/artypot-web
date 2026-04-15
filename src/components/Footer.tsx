import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-border mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
        <span>© {new Date().getFullYear()} Artypot</span>
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
          <Link href="/about" className="hover:text-foreground transition-colors">About</Link>
          <Link href="/guide" className="hover:text-foreground transition-colors">Guide</Link>
          <Link href="/support" className="hover:text-foreground transition-colors">Support</Link>
          <Link href="/tos" className="hover:text-foreground transition-colors">Terms</Link>
          <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
        </nav>
      </div>
    </footer>
  );
}
