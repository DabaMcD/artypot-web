import DOMPurify from 'dompurify';

/**
 * Sanitize a search match snippet for rendering via dangerouslySetInnerHTML.
 *
 * The backend already escapes everything except the <mark> tags it inserts
 * around the matched term, but we run a strict client-side allowlist as
 * defence-in-depth: only <mark> survives, all attributes are stripped, and any
 * other markup (e.g. a <script> that somehow reached the snippet) is removed.
 */
export function sanitizeSnippet(snippet: string | null | undefined): string {
  if (!snippet) return '';
  return DOMPurify.sanitize(snippet, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: [],
  });
}
