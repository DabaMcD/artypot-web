'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { admin as adminApi } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import type { CouncilMember } from '@/lib/types';
import { Card, SectionLabel } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Empty } from '@/components/ui/Empty';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

// ── Main page ───────────────────────────────────────────────────────────────
export default function AdminCouncilPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [members, setMembers] = useState<CouncilMember[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<CouncilMember | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'council')) {
      router.push('/');
    }
  }, [authLoading, user, router]);

  const fetchMembers = useCallback(async (page: number) => {
    setLoading(true);
    try {
      const res = await adminApi.listCouncil(page);
      setMembers(res.data);
      setCurrentPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'council') {
      fetchMembers(1);
    }
  }, [user, fetchMembers]);

  const openDeleteModal = (member: CouncilMember) => {
    setDeleteTarget(member);
    setDeleteConfirmName('');
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirmName('');
    setDeleteError(null);
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await adminApi.deleteUser(deleteTarget.id);
      setMembers((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setTotal((prev) => prev - 1);
      closeDeleteModal();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete user.';
      setDeleteError(msg);
    } finally {
      setDeleting(false);
    }
  };

  if (authLoading || !user || user.role !== 'council') return null;

  const canConfirmDelete =
    deleteTarget !== null &&
    deleteConfirmName === deleteTarget.display_name;

  return (
    <div className="space-y-6 pt-2 max-w-3xl">
      {/* Header */}
      <div>
        <SectionLabel className="mb-2">council · admin</SectionLabel>
        <div className="flex items-center gap-3">
          <Link href="/admin">
            <Button variant="ghost" size="sm">← Admin</Button>
          </Link>
          <h1 className="font-display font-bold text-[28px]">Council Members</h1>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-muted">
            {total} member{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Member list */}
      <Card>
        {/* Column headers */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-4 -mx-5 -mt-4 px-5 py-3 border-b border-border bg-surface-2 rounded-t-md mb-0">
          <SectionLabel>Member</SectionLabel>
          <SectionLabel>Appointed by</SectionLabel>
          <SectionLabel>Date</SectionLabel>
          <span />
        </div>

        {loading ? (
          <div className="divide-y divide-border -mx-5 -mb-4 mt-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 bg-surface-2 animate-pulse rounded" />
            ))}
          </div>
        ) : members.length === 0 ? (
          <div className="-mx-5 -mb-4 mt-3">
            <Empty message="No council members found." />
          </div>
        ) : (
          <div className="divide-y divide-border -mx-5 -mb-4 mt-3">
            {members.map((member) => (
              <div key={member.id} className="grid grid-cols-[1fr_auto_auto_auto] gap-4 items-center px-5 py-4">
                {/* Member info */}
                <div>
                  <p className="text-sm font-medium text-foreground">{member.display_name}</p>
                  <p className="font-mono text-[10px] text-muted">{member.email}</p>
                </div>

                {/* Appointed by */}
                <div className="text-right">
                  {member.appointed_by ? (
                    <>
                      <p className="text-xs text-foreground">{member.appointed_by.display_name}</p>
                      <p className="font-mono text-[10px] text-muted">{member.appointed_by.email}</p>
                    </>
                  ) : (
                    <span className="font-mono text-[10px] text-muted italic">—</span>
                  )}
                </div>

                {/* Date */}
                <div className="text-right">
                  <p className="font-mono text-[10px] text-muted whitespace-nowrap">
                    {new Date(member.council_appointed_at).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>

                {/* Delete */}
                <div>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openDeleteModal(member)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {lastPage > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === 1 || loading}
            onClick={() => { const p = currentPage - 1; setCurrentPage(p); fetchMembers(p); }}
          >
            ← Prev
          </Button>
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
            page {currentPage} of {lastPage}
          </span>
          <Button
            variant="default"
            size="sm"
            disabled={currentPage === lastPage || loading}
            onClick={() => { const p = currentPage + 1; setCurrentPage(p); fetchMembers(p); }}
          >
            Next →
          </Button>
        </div>
      )}

      {/* Overlord hint */}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted text-center">
        To grant or revoke council access, use the{' '}
        {user.is_overlord ? (
          <Link href="/obelisk" className="text-[#8A2BE2] hover:underline">Overlord obelisk</Link>
        ) : (
          <span className="text-foreground">Overlord obelisk</span>
        )}
        .
      </p>

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <Modal
          title="Delete User Account"
          onClose={closeDeleteModal}
          actions={
            <>
              <Button variant="ghost" onClick={closeDeleteModal} disabled={deleting}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                disabled={!canConfirmDelete || deleting}
              >
                {deleting ? 'Deleting…' : 'Yes, Delete Account'}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted leading-relaxed mb-3">
            This will <strong className="text-foreground">permanently delete</strong> the account
            for <strong className="text-foreground">{deleteTarget.display_name}</strong>, cancel
            all their active commitments, and scrub their personal data. This cannot be undone.
          </p>
          <p className="text-sm text-muted mb-2">
            Type <strong className="text-foreground font-mono">{deleteTarget.display_name}</strong> to confirm:
          </p>
          <Input
            type="text"
            value={deleteConfirmName}
            onChange={(e) => setDeleteConfirmName(e.target.value)}
            placeholder={deleteTarget.display_name}
            autoFocus
          />
          {deleteError && (
            <p className="mt-2 text-xs text-bad">{deleteError}</p>
          )}
        </Modal>
      )}
    </div>
  );
}
