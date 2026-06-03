/**
 * Coerce a user-supplied link into an absolute, off-site URL.
 *
 * Submission links (a YouTube video, Twitch VOD, etc.) are entered by hand, and
 * creators routinely paste a bare host like "youtube.com/watch?v=…" or
 * "www.twitch.tv/videos/…" without a scheme. Left as-is in an <a href>, the
 * browser treats a scheme-less value as a *relative* path and resolves it
 * against the current page (e.g. /bounties/youtube.com/…) instead of leaving the
 * site. Prefixing https:// forces the link out to the real external destination.
 */
export function toExternalUrl(raw: string | null | undefined): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return '#';
  // Already has a scheme (http://, https://, mailto:, etc.) — leave untouched.
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed)) {
    return trimmed;
  }
  // Protocol-relative ("//host/…") — promote to https.
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  return `https://${trimmed}`;
}

/** Bare hostname for a link, lowercased and stripped of a leading "www." (or "" if unparseable). */
export function urlHost(raw: string | null | undefined): string {
  try {
    return new URL(toExternalUrl(raw)).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Friendly call-to-action label for a submitted-work link, picked from the host.
 * Submissions are typically a video or stream, so we name the platform where we
 * recognise it ("Watch on YouTube", "Watch the VOD on Twitch") and fall back to
 * a generic verb otherwise.
 */
export function submissionLinkLabel(raw: string | null | undefined): string {
  const host = urlHost(raw);
  if (!host) return 'View submitted work';
  if (host.includes('youtube.') || host === 'youtu.be') return 'Watch on YouTube';
  if (host.includes('twitch.tv')) return 'Watch the VOD on Twitch';
  if (host.includes('vimeo.')) return 'Watch on Vimeo';
  if (host.includes('tiktok.')) return 'Watch on TikTok';
  if (host.includes('instagram.')) return 'View on Instagram';
  if (host === 'x.com' || host.includes('twitter.')) return 'View on X';
  if (host.includes('soundcloud.')) return 'Listen on SoundCloud';
  if (host.includes('open.spotify.') || host.includes('spotify.')) return 'Listen on Spotify';
  if (host.includes('bandcamp.')) return 'Listen on Bandcamp';
  if (host.includes('drive.google.') || host.includes('dropbox.')) return 'Open the file';
  if (host.includes('github.')) return 'View on GitHub';
  if (host.includes('artstation.')) return 'View on ArtStation';
  return 'View submitted work';
}
