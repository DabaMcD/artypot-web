'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { overlord as overlordApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import type { CouncilMember } from '@/lib/types';

export default function OverlordPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [emailInput, setEmailInput] = useState('');
  const [granting, setGranting] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<CouncilMember | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await overlordApi.listCouncil();
      setMembers(res.data);
    } catch {
      toast('Failed to load Council members.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { router.replace('/login'); return; }
    if (!user.is_overlord) { router.replace('/'); return; }
    fetchMembers();
  }, [user, authLoading, router, fetchMembers]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) return;
    setGranting(true);
    try {
      const res = await overlordApi.grantCouncil(emailInput.trim());
      setMembers((prev) => [res.data, ...prev]);
      setEmailInput('');
      toast(`✅ ${res.data.user.name} is now Council.`, 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to grant Council access.', 'error');
    } finally {
      setGranting(false);
    }
  };

  const handleRevoke = async (member: CouncilMember) => {
    setRevoking(member.id);
    setConfirmRevoke(null);
    try {
      await overlordApi.revokeCouncil(member.id);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast(`${member.user.name} removed from Council.`, 'success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      toast(e.message ?? 'Failed to revoke Council access.', 'error');
    } finally {
      setRevoking(null);
    }
  };

  if (authLoading || (!user?.is_overlord && !authLoading)) {
    return null; // redirect in useEffect
  }

  return (
    <>
      {/* Revoke confirm dialog */}
      {confirmRevoke && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmRevoke(null); }}
        >
          <div className="bg-surface border border-[#8A2BE2]/30 rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-2">Remove from Council</h2>
            <p className="text-sm text-muted mb-1">
              Remove <strong className="text-foreground">{confirmRevoke.user.name}</strong>{' '}
              (<span className="text-[#8A2BE2]">{confirmRevoke.user.email}</span>) from The Council?
            </p>
            <p className="text-xs text-muted mb-6">
              Their role will downgrade to Summoned or Mob depending on whether they have a claimed summon.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmRevoke(null)}
                disabled={revoking === confirmRevoke.id}
                className="flex-1 border border-border text-foreground text-sm font-medium py-2.5 rounded-lg hover:border-foreground/30 transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRevoke(confirmRevoke)}
                disabled={revoking === confirmRevoke.id}
                className="flex-1 bg-red-600 text-white text-sm font-semibold py-2.5 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-40"
              >
                {revoking === confirmRevoke.id ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-2xl">👁️</span>
            <h1 className="text-2xl font-bold text-foreground">The Overlord Obelisk</h1>
          </div>
          <p className="text-sm text-muted">
            Grant or revoke{' '}
            <span className="font-semibold" style={{ color: '#8A2BE2' }}>Council</span>
            {' '}permissions by email address.
          </p>
        </div>

        {/* Grant form */}
        <div className="bg-surface border border-[#8A2BE2]/30 rounded-xl p-5 mb-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#8A2BE2' }}>
            Grant Council Access
          </h2>
          <form onSubmit={handleGrant} className="flex gap-2">
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              disabled={granting}
              className="flex-1 bg-surface-2 border border-border rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-[#8A2BE2]/60 transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={granting || !emailInput.trim()}
              className="shrink-0 text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50"
              style={{ background: '#8A2BE2', color: '#fff' }}
            >
              {granting ? 'Granting…' : 'Grant'}
            </button>
          </form>
        </div>

        {/* Current Council */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: '#8A2BE2' }}>
            The Council
            {!loadingMembers && (
              <span className="ml-2 font-normal text-muted normal-case tracking-normal">
                ({members.length} member{members.length === 1 ? '' : 's'})
              </span>
            )}
          </h2>

          {loadingMembers ? (
            <div className="py-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-[#8A2BE2] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-sm text-muted py-2">No Council members yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between bg-surface-2 border border-border rounded-lg px-4 py-3 gap-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{m.user.name}</p>
                    <p className="text-xs text-muted truncate">{m.user.email}</p>
                    {m.appointed_at && (
                      <p className="text-xs text-muted/60 mt-0.5">
                        Appointed{' '}
                        {new Date(m.appointed_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                        {m.appointed_by && ` by ${m.appointed_by.name}`}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(m)}
                    disabled={revoking === m.id}
                    className="shrink-0 text-xs text-muted hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {revoking === m.id ? 'Removing…' : 'Remove'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </>
  );
}
