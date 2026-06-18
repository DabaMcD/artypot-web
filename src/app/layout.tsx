// Root passthrough. The real document shell — <html>/<body>, fonts, metadata,
// providers, and the app chrome — lives in app/[locale]/layout.tsx so it can
// read the active locale. Paths outside the locale tree (the global 404 below)
// supply their own shell.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
