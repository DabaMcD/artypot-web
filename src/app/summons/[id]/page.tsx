'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { summons as summonsApi, pots as potsApi, summonNames as summonNamesApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { Summon, PaginatedResponse, Pot, SummonName } from '@/lib/types';
import PotCard from '@/components/PotCard';

const SOCIAL_LINKS: { key: keyof Summon; label: string; prefix: string }[] = [
  { key: 'youtube_handle',    label: 'YouTube',    prefix: 'https://youtube.com/@' },
  { key: 'twitter_handle',    label: 'X / Twitter', prefix: 'https://x.com/' },
  { key: 'tiktok_handle',     label: 'TikTok',     prefix: 'https://tiktok.com/@' },
  { key: 'instagram_handle',  label: 'Instagram',  prefix: 'https://instagram.com/' },
  { key: 'soundcloud_handle', label: 'SoundCloud', prefix: 'https://soundcloud.com/' },
  { key: 'bandcamp_handle',   label: 'Bandcamp',   prefix: 'https://' },
  { key: 'domain',            label: 'Website',    prefix: 'https://' },
];

function fmt(n: number | null | undefined) {
  return `$${Number(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ── Herald gate modal ─────────────────────────────────────────────────────
function HeraldGateModal({
  summon,
  userName,
  onClose,
}: {
  summon: Summon;
  userName: string;
  onClose: () => void;
}) {
  const heraldName    = summon.herald?.name ?? 'The current Herald';
  const heraldTotal   = Number(summon.herald_total_bid ?? 0);
  const userTotal     = Number(summon.user_aged_bid_total ?? 0);
  const deficit       = Math.max(0, heraldTotal - userTotal);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Herald Protected</h2>
            <p className="text-xs text-muted mt-0.5">{summon.display_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-xl leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        {/* Explanation */}
        <p className="text-sm text-muted leading-relaxed mb-5">
          {summon.herald?.id ? (
            <Link href={`/users/${summon.herald.id}`} onClick={onClose} className="text-brand font-semibold hover:underline">
              {heraldName}
            </Link>
          ) : (
            <span className="text-brand font-semibold">{heraldName}</span>
          )}{' '}
          is the current Herald for this unclaimed profile. The Herald is the top pledger who earns
          the right to keep this profile up to date. To take the edit seat, your total pledges
          (24+ hours old) must exceed theirs.
        </p>

        {/* Breakdown */}
        <div className="bg-surface-2 border border-border rounded-xl overflow-hidden mb-5">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-creator uppercase tracking-wider">Herald</span>
              {summon.herald?.id ? (
                <Link href={`/users/${summon.herald.id}`} onClick={onClose} className="text-sm font-medium text-foreground hover:underline">
                  {heraldName}
                </Link>
              ) : (
                <span className="text-sm font-medium text-foreground">{heraldName}</span>
              )}
            </div>
            <span className="text-sm font-bold text-brand">{fmt(heraldTotal)}*</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-muted uppercase tracking-wider">You</span>
              <span className="text-sm font-medium text-foreground">{userName}</span>
            </div>
            <span className={`text-sm font-bold ${userTotal > 0 ? 'text-foreground' : 'text-muted'}`}>
              {fmt(userTotal)}
              <span className="text-xs text-muted font-normal ml-1">(24h+)</span>
            </span>
          </div>
        </div>

        {deficit > 0 && (
          <p className="text-xs text-muted text-center mb-3">
            You need{' '}
            <span className="text-foreground font-semibold">{fmt(deficit)} more</span>
            {' '}in pledges aged over 24 hours to take the Herald seat.
          </p>
        )}

        <p className="text-xs text-muted/60 mb-5">
          * {heraldName}&apos;s qualifying total is recorded at the time of their last edit to{' '}
          {summon.display_name}&apos;s profile.
        </p>

        <Link
          href={`/pots?summon_id=${summon.id}`}
          onClick={onClose}
          className="block w-full text-center bg-brand text-black font-semibold text-sm py-2.5 rounded-lg hover:opacity-90 transition-opacity"
        >
          View pots to pledge on →
        </Link>
      </div>
    </div>
  );
}

// ── Claim confirmation modal ───────────────────────────────────────────────
function ClaimModal({
  summon,
  onClose,
  onSuccess,
}: {
  summon: Summon;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [contactInfo, setContactInfo] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (contactInfo.trim().length < 10) {
      setError('Please provide a bit more detail (at least 10 characters).');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await summonsApi.claim(summon.id, contactInfo.trim());
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message ?? 'Failed to submit claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-foreground">Claim this Profile</h2>
            <p className="text-xs text-muted mt-0.5">{summon.display_name}</p>
          </div>
          <button
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors text-xl leading-none mt-0.5"
          >
            ✕
          </button>
        </div>

        <p className="text-sm text-muted leading-relaxed mb-5">
          The council will review your claim and verify your identity before approving. Let us know
          the best way to contact or verify you.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              How can the council verify your identity?
            </label>
            <textarea
              value={contactInfo}
              onChange={(e) => setContactInfo(e.target.value)}
              placeholder="e.g. My YouTube channel is linked on this page. You can also reach me at manager@example.com or DM @myhandle on X."
              rows={4}
              maxLength={1000}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-creator/60 resize-none"
            />
            <p className="text-xs text-muted mt-1 text-right">{contactInfo.length}/1000</p>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || contactInfo.trim().length < 10}
              className="flex-1 bg-creator text-black text-sm font-semibold py-2.5 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              {submitting ? 'Submitting…' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
export default function SummonProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [summon, setSummon] = useState<Summon | null>(null);
  const [potsData, setPotsData] = useState<PaginatedResponse<Pot> | null>(null);
  const [names, setNames] = useState<SummonName[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showHeraldModal, setShowHeraldModal] = useState(false);

  // Claim state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);

  // Alias state
  const [newAlias, setNewAlias] = useState('');
  const [addingAlias, setAddingAlias] = useState(false);
  const [aliasError, setAliasError] = useState('');

  const loadNames = (summonId: number) =>
    summonNamesApi.list(summonId).then((r) => setNames(r.data));

  useEffect(() => {
    Promise.all([
      summonsApi.get(Number(id)),
      potsApi.list({ summon_id: Number(id) }),
      summonNamesApi.list(Number(id)),
    ])
      .then(([summonRes, potsRes, namesRes]) => {
        setSummon(summonRes.data);
        setPotsData(potsRes);
        setNames(namesRes.data);
      })
      .catch(() => setError('Failed to load creator profile.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleEditClick = () => {
    if (!summon) return;
    if (summon.can_edit) {
      router.push(`/summons/${id}/edit`);
    } else {
      setShowHeraldModal(true);
    }
  };


  const handleAddAlias = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!summon || !newAlias.trim()) return;
    setAddingAlias(true);
    setAliasError('');
    try {
      await summonNamesApi.create(summon.id, newAlias.trim());
      setNewAlias('');
      await loadNames(summon.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setAliasError(e.message ?? 'Failed to add alias.');
    } finally {
      setAddingAlias(false);
    }
  };

  const handleDeleteAlias = async (nameId: number) => {
    if (!summon) return;
    try {
      await summonNamesApi.delete(summon.id, nameId);
      await loadNames(summon.id);
    } catch (err: unknown) {
      const e = err as { message?: string };
      alert(e.message ?? 'Failed to delete alias.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="h-48 bg-surface border border-border rounded-xl animate-pulse mb-6" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-36 bg-surface border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !summon) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-10 text-red-400">
        {error || 'Creator not found.'}
      </div>
    );
  }

  const isClaimed = !!summon.claimed_at;
  const canClaim  = user && !isClaimed && user.role !== 'council' && !user.summon;
  const isOwner   = user && summon.user_id === user.id;
  const isHerald  = user && summon.herald_user_id === user.id;
  const canDeleteAlias = () => !!(user && (isOwner || isHerald || user.role === 'council'));
  const socialLinks = SOCIAL_LINKS.filter(({ key }) => summon[key]);

  return (
    <>
      {showHeraldModal && user && (
        <HeraldGateModal
          summon={summon}
          userName={user.name}
          onClose={() => setShowHeraldModal(false)}
        />
      )}
      {showClaimModal && summon && (
        <ClaimModal
          summon={summon}
          onClose={() => setShowClaimModal(false)}
          onSuccess={() => { setShowClaimModal(false); setClaimSuccess(true); }}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* ── Main column ──────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-surface border border-border rounded-xl p-6 mb-8">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                {summon.profile_picture ? (
                  <img
                    src={summon.profile_picture}
                    alt={summon.display_name}
                    className="w-16 h-16 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div
                    className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                    style={{ background: '#47DFD3', color: '#0a0a0a' }}
                  >
                    {summon.display_name.charAt(0).toUpperCase()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap mb-1">
                    <h1 className="text-2xl font-bold text-foreground">{summon.display_name}</h1>
                    {isClaimed ? (
                      <span className="text-xs font-medium bg-creator/10 text-creator border border-creator/30 px-2 py-0.5 rounded-full">
                        Verified Creator
                      </span>
                    ) : (
                      <span className="text-xs font-medium bg-surface-2 text-muted border border-border px-2 py-0.5 rounded-full">
                        Unclaimed
                      </span>
                    )}
                  </div>

                  {summon.fan_name && (
                    <p className="text-sm text-muted mb-2">
                      Fans called:{' '}
                      <span className="text-foreground">{summon.fan_name_plural ?? summon.fan_name}</span>
                    </p>
                  )}

                  {summon.description && (
                    <p className="text-muted text-sm leading-relaxed mt-2">{summon.description}</p>
                  )}
                </div>

                {/* Action buttons */}
                <div className="shrink-0 flex flex-col gap-2 items-end">
                  {/* Edit — always shown to logged-in users on unclaimed summons */}
                  {user && !isClaimed && (
                    <button
                      onClick={handleEditClick}
                      className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Edit Profile
                    </button>
                  )}
                  {/* Edit — claimed summons, owner only */}
                  {user && isClaimed && summon.can_edit && (
                    <Link
                      href={`/summons/${id}/edit`}
                      className="bg-creator text-black text-sm font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      Edit Profile
                    </Link>
                  )}

                  {canClaim && !claimSuccess && (
                    <button
                      onClick={() => setShowClaimModal(true)}
                      className="bg-surface-2 border border-creator/40 text-creator text-sm font-semibold px-4 py-2 rounded-lg hover:border-creator transition-colors"
                    >
                      Claim this profile
                    </button>
                  )}
                  {claimSuccess && (
                    <p className="text-creator text-sm">Claim submitted! The council will review it shortly.</p>
                  )}
                </div>
              </div>

              {/* Stats */}
              <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-border text-sm">
                {summon.projects_finished != null && (
                  <div>
                    <div className="text-foreground font-semibold text-lg">{summon.projects_finished}</div>
                    <div className="text-muted text-xs">Completed</div>
                  </div>
                )}
                {summon.projects_open != null && (
                  <div>
                    <div className="text-foreground font-semibold text-lg">{summon.projects_open}</div>
                    <div className="text-muted text-xs">Open pots</div>
                  </div>
                )}
                {summon.amount_earned != null && (
                  <div>
                    <div className="text-brand font-semibold text-lg">
                      ${Number(summon.amount_earned).toLocaleString()}
                    </div>
                    <div className="text-muted text-xs">Total earned</div>
                  </div>
                )}
                {summon.total_bid_sum != null && (
                  <div>
                    <div className="text-brand font-semibold text-lg">
                      ${Number(summon.total_bid_sum).toLocaleString()}
                    </div>
                    <div className="text-muted text-xs">Total pledged (all pots)</div>
                  </div>
                )}
              </div>

              {/* Social links */}
              {socialLinks.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {socialLinks.map(({ key, label, prefix }) => {
                    const handle = summon[key] as string;
                    return (
                      <a
                        key={key}
                        href={`${prefix}${handle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted border border-border rounded-full px-3 py-1 hover:border-creator/50 hover:text-creator transition-colors"
                      >
                        {label}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Pots */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-foreground">Pots for {summon.display_name}</h2>
                {user && (
                  <Link
                    href={`/pots/new?summon_id=${summon.id}`}
                    className="text-sm bg-brand text-black font-semibold px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                  >
                    + New Pot
                  </Link>
                )}
              </div>

              {!potsData || potsData.data.length === 0 ? (
                <div className="text-center py-16 text-muted border border-border border-dashed rounded-xl">
                  No pots yet for this creator.{' '}
                  {user && (
                    <Link href={`/pots/new?summon_id=${summon.id}`} className="text-brand hover:underline">
                      Create the first one
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {potsData.data.map((pot) => (
                    <PotCard key={pot.id} pot={pot} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sidebar ───────────────────────────────────────────────────── */}
          <div className="w-full lg:w-72 shrink-0">
            {/* Aliases card */}
            <div className="bg-surface border border-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">
                Also Known As
              </h3>

              {names.length === 0 ? (
                <p className="text-xs text-muted italic">No aliases yet.</p>
              ) : (
                <ul className="space-y-1 mb-3">
                  {names.map((n) => (
                    <li key={n.id} className="flex items-center justify-between gap-2 group">
                      <span className="text-sm text-foreground truncate">{n.name}</span>
                      {canDeleteAlias() && (
                        <button
                          onClick={() => handleDeleteAlias(n.id)}
                          title="Remove alias"
                          className="text-muted hover:text-red-400 transition-colors text-xs opacity-0 group-hover:opacity-100 shrink-0"
                        >
                          ✕
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}

              {user && (
                <form onSubmit={handleAddAlias} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newAlias}
                    onChange={(e) => setNewAlias(e.target.value)}
                    placeholder="Add an alias…"
                    maxLength={100}
                    className="flex-1 bg-surface-2 border border-border text-foreground text-xs rounded px-2 py-1.5 focus:outline-none focus:border-creator/50 placeholder:text-muted"
                  />
                  <button
                    type="submit"
                    disabled={addingAlias || !newAlias.trim()}
                    className="text-xs bg-creator text-black font-semibold px-3 py-1.5 rounded hover:opacity-90 disabled:opacity-40 transition-opacity"
                  >
                    Add
                  </button>
                </form>
              )}
              {aliasError && <p className="text-red-400 text-xs mt-1">{aliasError}</p>}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}
