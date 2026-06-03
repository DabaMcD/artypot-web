'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { handles as handlesApi, bounties as bountiesApi, creators as creatorsApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { useDefaultUpdatePrompt } from '@/lib/default-update-prompt-context';
import { DEFAULT_BACKING_AMOUNT_FALLBACK } from '@/lib/config';
import type { HandleSearchResult, HandlePlatform } from '@/lib/types';
import { AvatarOrUnknown } from '@/components/ui/AvatarOrUnknown';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Input, Textarea, Select, FieldLabel, FieldHint } from '@/components/ui/Input';
import { PlatformHandleInput, formatPlatformHandle } from '@/components/ui/PlatformHandleInput';
import { Banner } from '@/components/ui/Banner';
import { Stepper } from '@/components/ui/Stepper';
import { ALL_PLATFORMS, OTHER_SLUG, platformLabel } from '@/lib/platforms';
import { useDebouncedSearch } from '@/lib/search/useDebouncedSearch';
import { moveActiveIndex } from '@/lib/search/navigation';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Platform options for the bounty-creation form. Sourced from the catalogue
 * in @/lib/platforms so new platforms appear here automatically when added
 * to config/platforms.php + platforms.ts.
 */
const PLATFORMS: { value: HandlePlatform; label: string }[] = ALL_PLATFORMS.map((slug) => ({
  value: slug,
  label: platformLabel(slug),
}));

const PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  PLATFORMS.map(({ value, label }) => [value, label]),
);

// ── Types ─────────────────────────────────────────────────────────────────────

type TargetSelection =
  | { kind: 'user';   userId: number; handleId: number; displayName: string; avatarUrl: string | null; platform: HandlePlatform; username: string }
  | { kind: 'handle'; handleId: number; displayName: string; avatarUrl: null; platform: HandlePlatform; username: string }
  | { kind: 'new';    platform: HandlePlatform; username: string; displayName: string; avatarUrl: null };

// ── URL parsing ───────────────────────────────────────────────────────────────

function extractHandleFromUrl(input: string): { platform: HandlePlatform; username: string; label: string } | null {
  const ytMatch = input.match(/youtube\.com\/@([\w-]+)/i);
  if (ytMatch) return { platform: 'youtube', username: `@${ytMatch[1]}`, label: 'YouTube' };

  const ytChannel = input.match(/youtube\.com\/channel\/([\w-]+)/i);
  if (ytChannel) return { platform: 'youtube', username: ytChannel[1], label: 'YouTube' };

  const twMatch = input.match(/(?:twitter|x)\.com\/([\w]+)/i);
  if (twMatch && !['home','explore','i','settings','notifications','messages'].includes(twMatch[1].toLowerCase()))
    return { platform: 'twitter', username: twMatch[1], label: 'X / Twitter' };

  const ttMatch = input.match(/tiktok\.com\/@([\w.]+)/i);
  if (ttMatch) return { platform: 'tiktok', username: `@${ttMatch[1]}`, label: 'TikTok' };

  const igMatch = input.match(/instagram\.com\/([\w.]+)/i);
  if (igMatch && igMatch[1] !== 'p' && igMatch[1] !== 'reel')
    return { platform: 'instagram', username: igMatch[1], label: 'Instagram' };

  const twchMatch = input.match(/twitch\.tv\/([\w]+)/i);
  if (twchMatch) return { platform: 'twitch', username: twchMatch[1], label: 'Twitch' };

  const kickMatch = input.match(/kick\.com\/([\w-]+)/i);
  if (kickMatch) return { platform: 'kick', username: kickMatch[1], label: 'Kick' };

  // No curated platform matched — fall through to 'other' for any valid http(s)
  // URL so creators can bounty-target someone on a platform we don't list.
  try {
    const parsed = new URL(input.trim());
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      let host = parsed.host.toLowerCase();
      if (host.startsWith('www.')) host = host.slice(4);
      const path = parsed.pathname.replace(/\/+$/, '');
      return { platform: OTHER_SLUG, username: `${host}${path}`, label: 'Other' };
    }
  } catch {
    // not a URL — fall through to null
  }

  return null;
}

function looksLikeUrl(s: string) {
  return /^https?:\/\/|^www\./i.test(s.trim());
}

// ── Sub-components ────────────────────────────────────────────────────────────

function TargetingCard({ target }: { target: TargetSelection }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-surface-2 rounded-lg border border-border">
      <AvatarOrUnknown avatarUrl={target.avatarUrl ?? null} size="md" />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-foreground truncate">{target.displayName || formatPlatformHandle(target.platform, target.username)}</div>
        <div className="text-xs text-muted font-mono">
          {PLATFORM_LABELS[target.platform]} · {formatPlatformHandle(target.platform, target.username)}
        </div>
      </div>
      {target.kind === 'user' ? (
        <Badge tone="good">verified</Badge>
      ) : (
        <Badge tone="default">unverified</Badge>
      )}
    </div>
  );
}

// ── Step 1: Target search ─────────────────────────────────────────────────────

interface Step1Props {
  onSelect: (target: TargetSelection) => void;
  // Lifted state — preserved across back-navigation
  query: string;
  onQuery: (v: string) => void;
  showAddNew: boolean;
  onShowAddNew: (v: boolean) => void;
  newDisplayName: string;
  onNewDisplayName: (v: string) => void;
  newPlatform: HandlePlatform | '';
  onNewPlatform: (v: HandlePlatform | '') => void;
  newUsername: string;
  onNewUsername: (v: string) => void;
}

function Step1({
  onSelect,
  query, onQuery,
  showAddNew, onShowAddNew,
  newDisplayName, onNewDisplayName,
  newPlatform, onNewPlatform,
  newUsername, onNewUsername,
}: Step1Props) {
  const { toast } = useToast();
  const [focused, setFocused] = useState(false);
  const [addError, setAddError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced + abortable search. Mirrors HeaderSearch: 2-char minimum,
  // 250ms debounce, stale responses are dropped via AbortController.
  const fetcher = useCallback(
    (q: string, signal: AbortSignal) =>
      handlesApi.search(q, signal).then((r) => (r.data as unknown) as HandleSearchResult[]),
    [],
  );
  const { results: rawResults, loading: searching, setResults } = useDebouncedSearch<HandleSearchResult[]>({
    query,
    fetcher,
    enabled: focused && !showAddNew,
    minChars: 2,
    delay: 250,
  });
  const results = rawResults ?? [];

  const trimmed = query.trim();
  const queryActive = trimmed.length >= 2;

  const handleChange = (value: string) => {
    onQuery(value);
    onShowAddNew(false);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!looksLikeUrl(pasted)) return;
    const parsed = extractHandleFromUrl(pasted);
    if (parsed) {
      e.preventDefault();
      toast(`Detected ${parsed.label} handle from URL`, 'success');
      onQuery(parsed.username);
    }
  };

  const close = () => {
    setFocused(false);
    setActiveIndex(-1);
  };

  const selectResult = (r: HandleSearchResult) => {
    close();
    setResults(null);
    if (r.type === 'user' && r.user_id !== null) {
      onSelect({ kind: 'user', userId: r.user_id, handleId: r.handle_id, displayName: r.display_name, avatarUrl: r.avatar_url, platform: r.platform, username: r.username });
    } else {
      onSelect({ kind: 'handle', handleId: r.handle_id, displayName: r.display_name, avatarUrl: null, platform: r.platform, username: r.username });
    }
  };

  const confirmAddNew = () => {
    if (!newPlatform) { setAddError('Please select a platform.'); return; }
    if (!newUsername.trim()) { setAddError(newPlatform === OTHER_SLUG ? 'Website URL is required.' : 'Handle is required.'); return; }
    // A human name is only required for 'other' (off-platform) links, where the
    // identifier is a raw URL and would otherwise read terribly on the bounty.
    if (newPlatform === OTHER_SLUG && !newDisplayName.trim()) { setAddError('Creator name is required for off-platform links.'); return; }
    setAddError('');
    onSelect({ kind: 'new', platform: newPlatform, username: newUsername.trim(), displayName: newDisplayName.trim(), avatarUrl: null });
  };

  // Top row pre-selected so a bare Enter activates the first result.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(0);
  }, [query, rawResults]);

  // The dropdown surfaces live results followed by a pinned "+ add new creator"
  // row as the final navigable item. Open whenever focused and the user has
  // typed something (even below min-chars, so the empty/short states render).
  const dropdownOpen = focused && !showAddNew && trimmed.length > 0;

  const openAddNew = () => {
    close();
    setResults(null);
    onShowAddNew(true);
    // Pre-seed the handle field — the search box is handle-oriented.
    onNewUsername(trimmed);
  };

  // Navigable items = results + pinned "+ add new creator". Add-new sits at
  // index `results.length`. ArrowUp/ArrowDown wrap via the shared util.
  const navCount = results.length + 1;
  const addNewIndex = results.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      close();
      return;
    }
    if (!dropdownOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => moveActiveIndex(i < 0 ? -1 : i, 1, navCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => moveActiveIndex(i < 0 ? 0 : i, -1, navCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const idx = activeIndex >= 0 ? activeIndex : 0;
      if (idx === addNewIndex) {
        openAddNew();
      } else {
        const r = results[idx];
        if (r) selectResult(r);
      }
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <SectionLabel>fan</SectionLabel>
        <h1 className="font-display font-bold text-[28px] text-foreground mt-1">start a bounty</h1>
        <p className="text-sm text-muted mt-1">Name a creator. The community funds the work.</p>
      </div>

      <Card>
        <SectionLabel className="mb-3">who should do this?</SectionLabel>

        {showAddNew ? (
          <>
            <button
              type="button"
              onClick={() => onShowAddNew(false)}
              className="text-xs font-mono text-muted hover:text-foreground cursor-pointer transition-colors mb-4"
            >
              ← Back to Creator Search
            </button>

            <div className="space-y-3 border-t border-border pt-4">
              <span className="font-mono text-[10px] uppercase tracking-widest text-creator">add new creator</span>

              <div>
                <FieldLabel>platform - where they&apos;re active</FieldLabel>
                <Select value={newPlatform} onChange={(e) => { onNewPlatform(e.target.value as HandlePlatform | ''); onNewUsername(''); }} autoFocus>
                  <option value="" disabled>— select a platform —</option>
                  {PLATFORMS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </div>

              <PlatformHandleInput
                platform={newPlatform}
                value={newUsername}
                onChange={onNewUsername}
              />

              <div>
                <FieldLabel>
                  creator name{' '}
                  {newPlatform === OTHER_SLUG
                    ? <span className="text-bad">*</span>
                    : <span className="text-muted font-normal">(optional)</span>}
                </FieldLabel>
                <Input
                  type="text"
                  value={newDisplayName}
                  onChange={(e) => onNewDisplayName(e.target.value)}
                  placeholder="e.g. Tom Scott"
                />
                <FieldHint>
                  {newPlatform === OTHER_SLUG
                    ? 'Required for off-platform links — shown on your bounty.'
                    : 'Shown on your bounty. Leave blank to use the handle.'}
                </FieldHint>
              </div>

              {addError && <Banner tone="bad">{addError}</Banner>}

              <Button
                type="button"
                variant="primary"
                className="w-full justify-center"
                onClick={confirmAddNew}
              >
                Use This Creator →
              </Button>
            </div>
          </>
        ) : (
          <>
            <FieldLabel>creator handle or name</FieldLabel>
            <div className="relative">
              <Input
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  if (blurTimer.current) clearTimeout(blurTimer.current);
                  setFocused(true);
                }}
                onBlur={() => {
                  blurTimer.current = setTimeout(() => setFocused(false), 150);
                }}
                placeholder="e.g. @tomscott on YouTube"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                role="combobox"
                aria-expanded={dropdownOpen}
                aria-controls="bounty-target-listbox"
                aria-autocomplete="list"
              />

              {dropdownOpen && (
                <div
                  id="bounty-target-listbox"
                  className="absolute top-full left-0 right-0 mt-1 bg-surface-2 border border-border rounded-lg shadow-xl z-50 flex flex-col max-h-[60vh] overflow-hidden"
                  onMouseDown={(e) => e.preventDefault()}
                  role="listbox"
                >
                  <div className="overflow-y-auto">
                    {/* Too-short hint */}
                    {!queryActive && trimmed.length > 0 && (
                      <div className="px-4 py-3 text-sm text-muted">Keep typing — at least 2 characters.</div>
                    )}

                    {/* Loading state */}
                    {queryActive && searching && results.length === 0 && (
                      <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted">
                        <svg className="w-3.5 h-3.5 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                        </svg>
                        Searching…
                      </div>
                    )}

                    {/* Results (no section header — only one section) */}
                    {queryActive && results.length > 0 && (
                      <div>
                        {results.map((r, idx) => {
                          const active = activeIndex === idx;
                          const handleLabel = `${PLATFORM_LABELS[r.platform] ?? r.platform}/${formatPlatformHandle(r.platform, r.username)}`;
                          return (
                            <button
                              key={r.handle_id}
                              type="button"
                              role="option"
                              aria-selected={active}
                              onClick={() => selectResult(r)}
                              onMouseEnter={() => setActiveIndex(idx)}
                              className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-2 text-left transition-colors ${active ? 'bg-border' : 'hover:bg-border'}`}
                            >
                              <AvatarOrUnknown avatarUrl={r.avatar_url} size="sm" />
                              <span className="flex-1 min-w-0">
                                <span className={`block text-sm text-foreground truncate ${active ? 'underline underline-offset-2' : ''}`}>{r.display_name}</span>
                                <span className="block font-mono text-[11px] text-muted/80 truncate">{handleLabel}</span>
                              </span>
                              <span className="flex flex-col items-end gap-0.5 shrink-0 self-center">
                                <Badge tone={r.verified ? 'good' : 'default'}>{r.verified ? 'verified' : 'unverified'}</Badge>
                                {!r.verified && r.pending_bounty_count > 0 && (
                                  <span className="text-[10px] font-mono text-muted">
                                    {r.pending_bounty_count} {r.pending_bounty_count === 1 ? 'bounty' : 'bounties'} waiting
                                  </span>
                                )}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* Empty state */}
                    {queryActive && !searching && results.length === 0 && (
                      <div className="px-4 py-3">
                        <p className="text-sm text-muted">No matches for &ldquo;{trimmed}&rdquo;.</p>
                      </div>
                    )}
                  </div>

                  {/* Sticky footer — always the last navigable item, replacing
                      the "see all results" row from the header search. */}
                  {queryActive && (
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(addNewIndex)}
                      onClick={openAddNew}
                      className={`sticky bottom-0 w-full min-h-[44px] flex items-center justify-center gap-2 px-4 text-sm font-medium text-creator border-t border-border transition-colors ${
                        activeIndex === addNewIndex ? 'bg-border' : 'bg-surface-2 hover:bg-border'
                      }`}
                    >
                      <span className="flex items-center justify-center w-5 h-5 rounded-full border border-dashed border-creator/50 text-creator text-xs">+</span>
                      add new creator
                    </button>
                  )}
                </div>
              )}
            </div>

            {!dropdownOpen && (
              <button
                type="button"
                onClick={() => onShowAddNew(true)}
                className="mt-2 text-xs text-creator hover:underline cursor-pointer font-mono"
              >
                + add new creator manually
              </button>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

// ── Step 2: Bounty details ────────────────────────────────────────────────────

interface Step2Props {
  target: TargetSelection;
  isSelfBounty: boolean;
  onBack: () => void;
  onNext: (title: string, description: string, amount: string, displayName: string, expiryValue: string, expiryUnit: string) => void;
  initialTitle: string;
  initialDescription: string;
  initialAmount: string;
  initialDisplayName: string;
  initialExpiryValue: string;
  initialExpiryUnit: string;
}

function Step2({ target, isSelfBounty, onBack, onNext, initialTitle, initialDescription, initialAmount, initialDisplayName, initialExpiryValue, initialExpiryUnit }: Step2Props) {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);
  const [amount, setAmount] = useState(initialAmount);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [expiryValue, setExpiryValue] = useState(initialExpiryValue);
  const [expiryUnit, setExpiryUnit] = useState(initialExpiryUnit);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleNext = () => {
    if (!title.trim()) return;
    if (!isSelfBounty) {
      const amt = parseFloat(amount);
      if (isNaN(amt) || amt < 1) return;
      const exp = parseInt(expiryValue, 10);
      if (isNaN(exp) || exp < 1 || exp > 999) return;
    }
    if (target.kind === 'handle' && target.platform === OTHER_SLUG && !displayName.trim()) return;
    onNext(title.trim(), description.trim(), isSelfBounty ? '0' : amount, displayName.trim(), expiryValue, expiryUnit);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display font-bold text-[28px] text-foreground">bounty details</h1>
        <button type="button" onClick={onBack} className="text-sm font-mono text-muted hover:text-foreground cursor-pointer transition-colors mt-1 block">
          ← back
        </button>
      </div>

      <TargetingCard target={target} />

      {target.kind === 'handle' && (
        <Card>
          <SectionLabel className="mb-3">
            creator name{target.platform === OTHER_SLUG ? '' : ' (optional)'}
          </SectionLabel>
          <Input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="e.g. Tom Scott"
            required={target.platform === OTHER_SLUG}
          />
          <FieldHint>
            {target.platform === OTHER_SLUG
              ? 'Required for off-platform links — shown on your bounty.'
              : 'Shown on your bounty. Leave blank to use the handle.'}
          </FieldHint>
        </Card>
      )}

      <Card>
        <SectionLabel className="mb-3">what should they make?</SectionLabel>
        <FieldLabel>title <span className="text-bad">*</span></FieldLabel>
        <Input
          type="text"
          required
          maxLength={255}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. do a backflip while singing the national anthem"
          autoFocus
        />
        <div className="mt-4">
          <FieldLabel>description <span className="text-muted font-normal">(optional)</span></FieldLabel>
          <Textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="what specifically must be done? any requirements?"
          />
        </div>
      </Card>

      {!isSelfBounty && (
        <Card>
          <SectionLabel className="mb-3">your opening commitment</SectionLabel>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted text-sm select-none">$</span>
            <Input
              type="number"
              required
              min={1}
              max={999999.99}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="pl-7"
            />
          </div>
          <FieldHint>Minimum $1. You are only charged if council confirms the bounty is completed.</FieldHint>

          <div className="mt-4 pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setShowAdvanced(v => !v)}
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted/60 hover:text-muted transition-colors cursor-pointer select-none"
            >
              <span className={`transition-transform duration-150 ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
              Advanced
            </button>
            {showAdvanced && (
              <div className="mt-2 space-y-1.5">
                <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Expires in</span>
                <div className="grid gap-0" style={{ gridTemplateColumns: '5rem 1fr' }}>
                  <Input
                    type="number"
                    min="1"
                    max="999"
                    step="1"
                    mono
                    value={expiryValue}
                    onChange={(e) => setExpiryValue(e.target.value)}
                    className="text-center"
                  />
                  <Select
                    value={expiryUnit}
                    onChange={(e) => setExpiryUnit(e.target.value)}
                  >
                    <option value="year">year(s)</option>
                    <option value="month">month(s)</option>
                    <option value="week">week(s)</option>
                    <option value="day">day(s)</option>
                    <option value="hour">hour(s)</option>
                    <option value="minute">minute(s)</option>
                  </Select>
                </div>
                <FieldHint>Your backing will auto-expire after this period if the bounty is still open. Change your default in settings.</FieldHint>
              </div>
            )}
          </div>
        </Card>
      )}

      <Button
        type="button"
        variant="primary"
        className="w-full justify-center"
        disabled={!title.trim() || (!isSelfBounty && parseFloat(amount) < 1) || (!isSelfBounty && (parseInt(expiryValue, 10) < 1 || parseInt(expiryValue, 10) > 999 || isNaN(parseInt(expiryValue, 10)))) || (target.kind === 'handle' && target.platform === OTHER_SLUG && !displayName.trim())}
        onClick={handleNext}
      >
        Review →
      </Button>
    </div>
  );
}

// ── Step 3: Review & submit ───────────────────────────────────────────────────

interface Step3Props {
  target: TargetSelection;
  isSelfBounty: boolean;
  title: string;
  description: string;
  amount: string;
  displayName: string;
  expiryValue: string;
  expiryUnit: string;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string;
}

function Step3({ target, isSelfBounty, title, description, amount, displayName, expiryValue, expiryUnit, onBack, onSubmit, submitting, error }: Step3Props) {
  const UNIT_LABELS: Record<string, string> = { minute: 'minute(s)', hour: 'hour(s)', day: 'day(s)', week: 'week(s)', month: 'month(s)', year: 'year(s)' };
  return (
    <div className="space-y-5">
      <div>
        <button type="button" onClick={onBack} disabled={submitting} className="text-sm font-mono text-muted hover:text-foreground cursor-pointer transition-colors mb-3 block disabled:opacity-40">
          ← back
        </button>
        <h1 className="font-display font-bold text-[28px] text-foreground">review &amp; submit</h1>
      </div>

      <TargetingCard target={target} />

      <Card>
        <div className="space-y-3">
          {target.kind === 'handle' && displayName.trim() && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">creator name</div>
              <div className="text-sm text-foreground font-medium">{displayName}</div>
            </div>
          )}
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">title</div>
            <div className="text-sm text-foreground font-medium">{title}</div>
          </div>
          {description && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">description</div>
              <div className="text-sm text-foreground whitespace-pre-wrap">{description}</div>
            </div>
          )}
          {!isSelfBounty && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">your commitment</div>
              <div className="text-fan font-bold text-lg">${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          )}
          {!isSelfBounty && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-0.5">backing expires after</div>
              <div className="text-sm text-foreground font-medium font-mono">{expiryValue} {UNIT_LABELS[expiryUnit] ?? expiryUnit}</div>
            </div>
          )}
        </div>
      </Card>

      {error && <Banner tone="bad">{error}</Banner>}

      <Button
        type="button"
        variant="primary"
        className="w-full justify-center"
        onClick={onSubmit}
        disabled={submitting}
      >
        {submitting ? 'Creating…' : 'Create Bounty'}
      </Button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

function NewBountyForm() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { dispatch: dispatchPrompt } = useDefaultUpdatePrompt();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [target, setTarget] = useState<TargetSelection | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // Initialised to the env fallback; once the user object loads we re-sync
  // to user.default_backing_amount (or the same fallback if null).
  const [amount, setAmount] = useState(String(DEFAULT_BACKING_AMOUNT_FALLBACK));
  const [displayName, setDisplayName] = useState('');
  const [expiryValue, setExpiryValue] = useState('39');
  const [expiryUnit, setExpiryUnit] = useState('month');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 state lifted here so it survives back-navigation
  const [s1Query, setS1Query] = useState('');
  const [s1ShowAddNew, setS1ShowAddNew] = useState(false);
  const [s1NewDisplayName, setS1NewDisplayName] = useState('');
  const [s1NewPlatform, setS1NewPlatform] = useState<HandlePlatform | ''>('');
  const [s1NewUsername, setS1NewUsername] = useState('');

  // Deep-link prefill. Other pages link here with a pre-chosen target so the
  // fan skips the search step entirely:
  //   ?creator_id=62               → a known creator (user id)
  //   ?platform=youtube&handle=…   → a specific platform handle
  //   ?handle=…                    → seed the search box only (ambiguous, stays on step 1)
  // Runs once on mount; failures fall back to the normal search on step 1.
  const prefillDone = useRef(false);
  useEffect(() => {
    if (prefillDone.current) return;
    const creatorId = searchParams.get('creator_id');
    const platform  = searchParams.get('platform');
    const handle    = searchParams.get('handle');

    // Bare handle (no platform): just seed the search field, don't auto-advance.
    if (!creatorId && !platform && handle) {
      prefillDone.current = true;
      setS1Query(handle);
      return;
    }
    if (!creatorId && !(platform && handle)) return; // nothing to prefill

    prefillDone.current = true;
    const norm = (s: string) => s.replace(/^@/, '').toLowerCase();

    (async () => {
      try {
        if (creatorId) {
          const id = parseInt(creatorId, 10);
          if (isNaN(id)) return;
          const { data: c } = await creatorsApi.get(id);
          // A creator's identity is anchored by a verified handle claim; use the
          // first as their primary handle for the targeting card.
          const h = (c.handle_claims ?? []).find((cl) => cl.handle)?.handle ?? null;
          setTarget({
            kind: 'user',
            userId: c.id,
            handleId: h?.id ?? 0,
            displayName: c.display_name,
            avatarUrl: c.profile_picture ?? null,
            platform: h?.platform ?? OTHER_SLUG,
            username: h?.username ?? '',
          });
          setStep(2);
          return;
        }

        // platform + handle — resolve against the same source as the live search.
        const res = await handlesApi.search(handle!);
        const list = (res.data as unknown) as HandleSearchResult[];
        const onPlatform = list.filter((r) => r.platform === platform);
        const match = onPlatform.find((r) => norm(r.username) === norm(handle!)) ?? onPlatform[0];

        if (match && match.type === 'user' && match.user_id !== null) {
          setTarget({ kind: 'user', userId: match.user_id, handleId: match.handle_id, displayName: match.display_name, avatarUrl: match.avatar_url, platform: match.platform, username: match.username });
        } else if (match) {
          setTarget({ kind: 'handle', handleId: match.handle_id, displayName: match.display_name, avatarUrl: null, platform: match.platform, username: match.username });
        } else {
          // No existing handle row — let the fan create a brand-new target.
          setTarget({ kind: 'new', platform: platform as HandlePlatform, username: handle!, displayName: '', avatarUrl: null });
        }
        setStep(2);
      } catch {
        // Resolution failed — leave the fan on step 1 to search manually.
      }
    })();
  // searchParams is stable for a given URL; prefillDone guards re-runs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync expiry + amount defaults from user once auth loads (useState
  // initial runs before user is available). Amount falls back to the env
  // constant when the user has no stored default yet.
  useEffect(() => {
    if (user) {
      setExpiryValue(String(user.default_expiry_value ?? 39));
      setExpiryUnit(user.default_expiry_unit ?? 'month');
      setAmount(String(user.default_backing_amount ?? DEFAULT_BACKING_AMOUNT_FALLBACK));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // True when the logged-in creator is targeting their own profile.
  // Self-bounties don't require an opening backing — fans add onto them.
  const isSelfBounty = !!(target && target.kind === 'user' && user && target.userId === user.id);

  const handleSelectTarget = (t: TargetSelection) => {
    setTarget(t);
    // The creator name is now optional (required only for 'other' links), so we
    // start it blank rather than pre-seeding it with the bare handle.
    setDisplayName('');
    setStep(2);
  };

  const handleStep2Next = (t: string, d: string, a: string, dn: string, ev: string, eu: string) => {
    setTitle(t);
    setDescription(d);
    setAmount(a);
    setExpiryValue(ev);
    setExpiryUnit(eu);
    setDisplayName(dn);
    setStep(3);
  };

  const handleSubmit = async () => {
    if (!target) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      const payload: Parameters<typeof bountiesApi.create>[0] = {
        title,
        description: description || undefined,
        initial_backing_amount: parseFloat(amount),
        backing_expiry_value: parseInt(expiryValue, 10),
        backing_expiry_unit: expiryUnit,
      };

      if (target.kind === 'user') {
        payload.target_user_id = target.userId;
      } else if (target.kind === 'handle') {
        payload.target_handle_id = target.handleId;
        if (displayName.trim()) payload.display_name = displayName.trim();
      } else {
        payload.platform = target.platform;
        // 'other' handles are keyed by URL; curated platforms by bare username.
        if (target.platform === OTHER_SLUG) {
          payload.url = target.username;
        } else {
          payload.username = target.username;
        }
        if (target.displayName.trim()) payload.display_name = target.displayName.trim();
      }

      const res = await bountiesApi.create(payload);
      // Surface any "update your default" prompt server-side computed from
      // the initial backing values. The banner takes over from here.
      dispatchPrompt(res.default_update_prompts);
      toast('Bounty created!', 'success');
      setTimeout(() => router.push(`/bounties/${res.data.id}`), 700);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setSubmitError(e.message ?? 'Failed to create bounty.');
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="max-w-lg mx-auto py-20 text-center">
        <p className="text-muted mb-4">You need to be logged in to create a bounty.</p>
        <Link href="/login"><Button variant="primary">Sign In →</Button></Link>
      </div>
    );
  }

  return (
    <div className="max-w-[560px] space-y-7 pt-2">
      <Stepper
        steps={['target', 'details', 'review']}
        current={step - 1}
      />

      {step === 1 && (
        <Step1
          onSelect={handleSelectTarget}
          query={s1Query}
          onQuery={setS1Query}
          showAddNew={s1ShowAddNew}
          onShowAddNew={setS1ShowAddNew}
          newDisplayName={s1NewDisplayName}
          onNewDisplayName={setS1NewDisplayName}
          newPlatform={s1NewPlatform}
          onNewPlatform={setS1NewPlatform}
          newUsername={s1NewUsername}
          onNewUsername={setS1NewUsername}
        />
      )}
      {step === 2 && target && (
        <Step2
          target={target}
          isSelfBounty={isSelfBounty}
          onBack={() => setStep(1)}
          onNext={handleStep2Next}
          initialTitle={title}
          initialDescription={description}
          initialAmount={amount}
          initialDisplayName={displayName}
          initialExpiryValue={expiryValue}
          initialExpiryUnit={expiryUnit}
        />
      )}
      {step === 3 && target && (
        <Step3
          target={target}
          isSelfBounty={isSelfBounty}
          title={title}
          description={description}
          amount={amount}
          displayName={displayName}
          expiryValue={expiryValue}
          expiryUnit={expiryUnit}
          onBack={() => setStep(2)}
          onSubmit={handleSubmit}
          submitting={submitting}
          error={submitError}
        />
      )}
    </div>
  );
}

export default function NewBountyPage() {
  return (
    <Suspense>
      <NewBountyForm />
    </Suspense>
  );
}
