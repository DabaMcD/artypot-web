'use client';

import { useState, useCallback, useRef, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { handles as handlesApi, bounties as bountiesApi } from '@/lib/api';
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
  const [results, setResults] = useState<HandleSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [addError, setAddError] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); setShowDropdown(false); return; }
    setSearching(true);
    try {
      const res = await handlesApi.search(q);
      setResults((res.data as unknown) as HandleSearchResult[]);
      setShowDropdown(true);
    } catch {
      // silently ignore search errors
    } finally {
      setSearching(false);
    }
  }, []);

  const handleChange = (value: string) => {
    onQuery(value);
    onShowAddNew(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 250);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!looksLikeUrl(pasted)) return;
    const parsed = extractHandleFromUrl(pasted);
    if (parsed) {
      e.preventDefault();
      toast(`Detected ${parsed.label} handle from URL`, 'success');
      const handle = parsed.username;
      onQuery(handle);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      runSearch(handle);
    }
  };

  const selectResult = (r: HandleSearchResult) => {
    setShowDropdown(false);
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

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Reset highlight to first item whenever results or query change.
  useEffect(() => {
    setActiveIndex(0);
  }, [results, query]);

  // The dropdown surfaces live results followed by a pinned "+ add new creator"
  // row as the final navigable item. It's open whenever the user has typed
  // (even with zero matches) or we already have results to show.
  const dropdownOpen = showDropdown && !searching && (query.trim().length > 0 || results.length > 0);

  const openAddNew = () => {
    setShowDropdown(false);
    onShowAddNew(true);
    // Pre-seed the handle field — the search box is handle-oriented.
    onNewUsername(query.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!dropdownOpen) return;
    // Navigable items: every result, then the pinned add-new row at index
    // results.length. ArrowDown/Up wraps across all of them; Enter activates
    // whichever row is highlighted.
    const addNewIndex = results.length;
    const itemCount = results.length + 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % itemCount);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + itemCount) % itemCount);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (activeIndex === addNewIndex) {
        openAddNew();
      } else {
        const r = results[activeIndex];
        if (r) selectResult(r);
      }
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
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
                <FieldLabel>platform - where they're active</FieldLabel>
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
            <div className="relative" ref={dropdownRef}>
              <Input
                type="text"
                value={query}
                onChange={(e) => handleChange(e.target.value)}
                onPaste={handlePaste}
                onKeyDown={handleKeyDown}
                onFocus={() => { if (results.length || query.trim()) setShowDropdown(true); }}
                placeholder="e.g. @tomscott on YouTube"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
              {searching && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted">searching…</span>
              )}

              {dropdownOpen && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg overflow-hidden shadow-lg">
                  {results.map((r, idx) => (
                    <button
                      key={r.handle_id}
                      type="button"
                      onMouseDown={() => selectResult(r)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 transition-colors text-left border-b border-border ${
                        activeIndex === idx ? 'bg-surface-2' : 'hover:bg-surface-2'
                      }`}
                    >
                      <AvatarOrUnknown avatarUrl={r.avatar_url} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-foreground truncate">{r.display_name}</div>
                        <div className="text-xs text-muted font-mono">
                          {PLATFORM_LABELS[r.platform]} · {formatPlatformHandle(r.platform, r.username)}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        {r.verified ? (
                          <Badge tone="good">verified</Badge>
                        ) : (
                          <>
                            <Badge tone="default">unverified</Badge>
                            {r.pending_bounty_count > 0 && (
                              <span className="text-[10px] font-mono text-muted">
                                {r.pending_bounty_count} {r.pending_bounty_count === 1 ? 'bounty' : 'bounties'} waiting
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </button>
                  ))}

                  {results.length === 0 && query.trim() && (
                    <p className="px-3 pt-3 pb-1 text-sm text-muted">no results for &ldquo;{query}&rdquo;</p>
                  )}

                  {/* Pinned final row — always the last navigable item, so fans
                      can add a brand-new creator even when results are showing. */}
                  <button
                    type="button"
                    onMouseDown={openAddNew}
                    onMouseEnter={() => setActiveIndex(results.length)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      activeIndex === results.length ? 'bg-surface-2' : 'hover:bg-surface-2'
                    }`}
                  >
                    <span className="flex items-center justify-center w-7 h-7 rounded-full border border-dashed border-creator/50 text-creator text-sm shrink-0">+</span>
                    <span className="text-sm text-creator font-medium">add new creator</span>
                  </button>
                </div>
              )}
            </div>

            {!dropdownOpen && !searching && (
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
