'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { comments as commentsApi } from '@/lib/api';
import type { Comment } from '@/lib/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function UserAvatar({ user, size = 8 }: { user: Comment['user']; size?: number }) {
  const sizeClass = `w-${size} h-${size}`;
  if (!user) {
    return (
      <div
        className={`${sizeClass} rounded-full bg-surface-2 border border-border flex-shrink-0`}
      />
    );
  }
  if (user.profile_picture) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.profile_picture}
        alt={user.name}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0`}
      />
    );
  }
  const initial = user.name.charAt(0).toUpperCase();
  const roleColor =
    user.role === 'council'
      ? 'bg-council/20 text-council'
      : user.role === 'creator'
        ? 'bg-creator/20 text-creator'
        : 'bg-fan/20 text-fan';
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${roleColor}`}
    >
      {initial}
    </div>
  );
}

// ── Reaction button ───────────────────────────────────────────────────────────

function ReactionButton({
  type,
  count,
  active,
  disabled,
  onClick,
}: {
  type: 'like' | 'dislike';
  count: number;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const icon = type === 'like' ? '▲' : '▼';
  const activeClass =
    type === 'like'
      ? 'text-creator border-creator/40 bg-creator/10'
      : 'text-red-400 border-red-500/40 bg-red-500/10';
  const idleClass = 'text-muted border-border hover:text-foreground hover:border-foreground/30';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={type === 'like' ? 'Like' : 'Dislike'}
      className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${active ? activeClass : idleClass}`}
    >
      <span>{icon}</span>
      <span>{count}</span>
    </button>
  );
}

// ── Single comment row ────────────────────────────────────────────────────────

interface CommentRowProps {
  comment: Comment;
  isReply?: boolean;
  currentUserId?: number;
  isCouncil?: boolean;
  replies?: Comment[] | 'loading';
  replyText?: string;
  editingText?: string | false;
  onLoadReplies: () => void;
  onSetReplyText: (text: string) => void;
  onSubmitReply: () => void;
  onStartEdit: () => void;
  onSetEditText: (text: string) => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onReact: (type: 'like' | 'dislike') => void;
}

function CommentRow({
  comment,
  isReply = false,
  currentUserId,
  isCouncil,
  replies,
  replyText = '',
  editingText,
  onLoadReplies,
  onSetReplyText,
  onSubmitReply,
  onStartEdit,
  onSetEditText,
  onSubmitEdit,
  onCancelEdit,
  onDelete,
  onReact,
}: CommentRowProps) {
  const isOwn    = !!currentUserId && comment.user?.id === currentUserId;
  const canDelete = isOwn || isCouncil;
  const showReplyBox = replyText !== undefined && !isReply;

  return (
    <div className={isReply ? 'flex gap-3' : 'flex gap-3 py-4 border-b border-border last:border-0'}>
      <UserAvatar user={comment.deleted ? null : comment.user} size={isReply ? 7 : 8} />

      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-baseline gap-2 mb-1">
          {comment.deleted || !comment.user ? (
            <span className="text-sm text-muted italic">[deleted]</span>
          ) : (
            <Link
              href={`/users/${comment.user.id}`}
              className="text-sm font-medium text-foreground hover:underline"
            >
              {comment.user.name}
            </Link>
          )}
          <span className="text-xs text-muted">{timeAgo(comment.created_at)}</span>
          {comment.is_edited && !comment.deleted && (
            <span className="text-xs text-muted/60 italic">edited</span>
          )}
        </div>

        {/* Content */}
        {editingText !== false && editingText !== undefined ? (
          /* Inline edit mode */
          <div className="space-y-2">
            <textarea
              rows={3}
              value={editingText}
              onChange={(e) => onSetEditText(e.target.value)}
              maxLength={2000}
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={onSubmitEdit}
                disabled={!editingText.trim() || editingText === comment.content}
                className="text-xs px-3 py-1.5 bg-fan text-black font-semibold rounded-lg hover:bg-fan-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Save
              </button>
              <button
                onClick={onCancelEdit}
                className="text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p
            className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${
              comment.deleted ? 'text-muted italic' : 'text-foreground'
            }`}
          >
            {comment.content}
          </p>
        )}

        {/* Actions row */}
        {!comment.deleted && editingText === false && (
          <div className="flex items-center gap-3 mt-2">
            {/* Reactions */}
            <ReactionButton
              type="like"
              count={comment.likes_count}
              active={comment.user_reaction === 'like'}
              disabled={!currentUserId}
              onClick={() => onReact('like')}
            />
            <ReactionButton
              type="dislike"
              count={comment.dislikes_count}
              active={comment.user_reaction === 'dislike'}
              disabled={!currentUserId}
              onClick={() => onReact('dislike')}
            />

            {/* Reply — only on top-level, only if logged in */}
            {!isReply && currentUserId && (
              <button
                onClick={() => onSetReplyText(replyText === '' ? '' : '')}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Reply
              </button>
            )}

            {/* Spacer */}
            <div className="flex-1" />

            {/* Edit (own) */}
            {isOwn && (
              <button
                onClick={onStartEdit}
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Edit
              </button>
            )}
            {/* Delete (own or council) */}
            {canDelete && (
              <button
                onClick={onDelete}
                className="text-xs text-muted hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}

        {/* Reply compose box */}
        {!isReply && showReplyBox && currentUserId !== undefined && (
          <div className="mt-3 space-y-2">
            <textarea
              rows={2}
              value={replyText}
              onChange={(e) => onSetReplyText(e.target.value)}
              maxLength={2000}
              placeholder="Write a reply…"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={onSubmitReply}
                disabled={!replyText.trim()}
                className="text-xs px-3 py-1.5 bg-fan text-black font-semibold rounded-lg hover:bg-fan-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Post reply
              </button>
              <button
                onClick={() => onSetReplyText('\x00CLOSE')}
                className="text-xs px-3 py-1.5 text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Replies section */}
        {!isReply && (
          <div className="mt-3">
            {comment.reply_count > 0 && replies === undefined && (
              <button
                onClick={onLoadReplies}
                className="text-xs text-fan hover:text-fan-dim transition-colors"
              >
                {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'} ↓
              </button>
            )}
            {replies === 'loading' && (
              <div className="space-y-2 mt-2">
                {[...Array(2)].map((_, i) => (
                  <div key={i} className="h-12 bg-surface-2 animate-pulse rounded-lg" />
                ))}
              </div>
            )}
            {Array.isArray(replies) && replies.length > 0 && (
              <div className="mt-2 pl-3 border-l-2 border-border space-y-4">
                {replies.map((reply) => (
                  <CommentRow
                    key={reply.id}
                    comment={reply}
                    isReply
                    currentUserId={currentUserId}
                    isCouncil={isCouncil}
                    onLoadReplies={() => {}}
                    onSetReplyText={() => {}}
                    onSubmitReply={() => {}}
                    onStartEdit={() => {}}
                    onSetEditText={() => {}}
                    onSubmitEdit={() => {}}
                    onCancelEdit={() => {}}
                    onDelete={() => {}}
                    onReact={() => {}}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────────

interface CommentSectionProps {
  potId: number;
  /**
   * When true, strips the outer border/margin wrapper and the "Comments" h2
   * heading — use when embedding inside a parent card that provides its own
   * container and heading (e.g. the tabbed backers/comments card on the pot page).
   */
  inline?: boolean;
  /** Called whenever the total comment count changes (useful for tab labels). */
  onTotalChange?: (total: number) => void;
}

export default function CommentSection({ potId, inline = false, onTotalChange }: CommentSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [commentList, setCommentList] = useState<Comment[]>([]);
  const [page, setPage]               = useState(1);
  const [lastPage, setLastPage]       = useState(1);
  const [total, setTotal]             = useState(0);
  const [loading, setLoading]         = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Compose new comment
  const [newText, setNewText]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Per-comment state maps
  // replies: undefined = not loaded | 'loading' | Comment[]
  const [repliesMap, setRepliesMap] = useState<Record<number, Comment[] | 'loading'>>({});
  // replyText: undefined = reply box closed | string = open with content
  const [replyTextMap, setReplyTextMap]   = useState<Record<number, string | undefined>>({});
  // editingText: false = not editing | string = editing with content
  const [editingMap, setEditingMap] = useState<Record<number, string | false>>({});

  // ── Data loading ────────────────────────────────────────────────────────────

  const loadComments = useCallback(async (pageNum: number, append = false) => {
    try {
      const res = await commentsApi.list(potId, pageNum);
      setCommentList((prev) => (append ? [...prev, ...res.data] : res.data));
      setPage(res.current_page);
      setLastPage(res.last_page);
      setTotal(res.total);
      onTotalChange?.(res.total);
    } catch {
      if (!append) toast('Failed to load comments.', 'error');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [potId, toast, onTotalChange]);

  useEffect(() => {
    loadComments(1);
  }, [loadComments]);

  const loadMore = async () => {
    if (page >= lastPage || loadingMore) return;
    setLoadingMore(true);
    await loadComments(page + 1, true);
  };

  const loadReplies = async (commentId: number) => {
    setRepliesMap((prev) => ({ ...prev, [commentId]: 'loading' }));
    try {
      const res = await commentsApi.replies(commentId);
      setRepliesMap((prev) => ({ ...prev, [commentId]: res.data }));
    } catch {
      toast('Failed to load replies.', 'error');
      setRepliesMap((prev) => {
        const next = { ...prev };
        delete next[commentId];
        return next;
      });
    }
  };

  // ── Write actions ───────────────────────────────────────────────────────────

  const submitComment = async () => {
    if (!newText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const res = await commentsApi.create(potId, newText.trim());
      setCommentList((prev) => [res.data, ...prev]);
      setTotal((t) => t + 1);
      setNewText('');
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to post comment.';
      toast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitReply = async (parentId: number) => {
    const text = replyTextMap[parentId]?.trim();
    if (!text) return;
    try {
      const res = await commentsApi.createReply(parentId, text);
      // Append reply to the open replies list (or start one)
      setRepliesMap((prev) => {
        const existing = Array.isArray(prev[parentId]) ? (prev[parentId] as Comment[]) : [];
        return { ...prev, [parentId]: [...existing, res.data] };
      });
      // Update reply_count on parent
      setCommentList((prev) =>
        prev.map((c) =>
          c.id === parentId ? { ...c, reply_count: c.reply_count + 1 } : c
        )
      );
      // Close reply box
      setReplyTextMap((prev) => {
        const next = { ...prev };
        delete next[parentId];
        return next;
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to post reply.';
      toast(msg, 'error');
    }
  };

  const submitEdit = async (commentId: number) => {
    const newContent = editingMap[commentId];
    if (!newContent || typeof newContent !== 'string') return;
    try {
      const res = await commentsApi.update(commentId, newContent.trim());
      // Update in comment list (top-level)
      setCommentList((prev) =>
        prev.map((c) => (c.id === commentId ? res.data : c))
      );
      // Update in replies map (if it's a reply)
      setRepliesMap((prev) => {
        const next = { ...prev };
        for (const [parentId, replies] of Object.entries(next)) {
          if (Array.isArray(replies)) {
            next[Number(parentId)] = replies.map((r) =>
              r.id === commentId ? res.data : r
            );
          }
        }
        return next;
      });
      // Close edit mode
      setEditingMap((prev) => ({ ...prev, [commentId]: false }));
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to save edit.';
      toast(msg, 'error');
    }
  };

  const deleteComment = async (commentId: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentsApi.delete(commentId);
      // Mark as deleted in list
      const markDeleted = (c: Comment): Comment =>
        c.id === commentId
          ? { ...c, deleted: true, content: '[deleted]', user: null }
          : c;
      setCommentList((prev) => prev.map(markDeleted));
      setRepliesMap((prev) => {
        const next = { ...prev };
        for (const [parentId, replies] of Object.entries(next)) {
          if (Array.isArray(replies)) {
            next[Number(parentId)] = replies.map(markDeleted);
          }
        }
        return next;
      });
    } catch (err: unknown) {
      const msg = (err as { message?: string })?.message ?? 'Failed to delete comment.';
      toast(msg, 'error');
    }
  };

  const reactToComment = async (
    commentId: number,
    type: 'like' | 'dislike',
    isReplyOf?: number
  ) => {
    if (!user) return;
    try {
      const res = await commentsApi.react(commentId, type);
      const applyReaction = (c: Comment): Comment =>
        c.id === commentId
          ? { ...c, likes_count: res.likes_count, dislikes_count: res.dislikes_count, user_reaction: res.user_reaction }
          : c;

      if (isReplyOf !== undefined) {
        setRepliesMap((prev) => ({
          ...prev,
          [isReplyOf]: Array.isArray(prev[isReplyOf])
            ? (prev[isReplyOf] as Comment[]).map(applyReaction)
            : prev[isReplyOf],
        }));
      } else {
        setCommentList((prev) => prev.map(applyReaction));
      }
    } catch {
      toast('Failed to react.', 'error');
    }
  };

  // ── Reply box helpers ───────────────────────────────────────────────────────

  const openReplyBox = (commentId: number) => {
    setReplyTextMap((prev) => ({ ...prev, [commentId]: '' }));
  };

  const closeReplyBox = (commentId: number) => {
    setReplyTextMap((prev) => {
      const next = { ...prev };
      delete next[commentId];
      return next;
    });
  };

  const setReplyText = (commentId: number, text: string) => {
    // '\x00CLOSE' is a sentinel to close the box (from the Cancel button)
    if (text === '\x00CLOSE') {
      closeReplyBox(commentId);
    } else {
      setReplyTextMap((prev) => ({ ...prev, [commentId]: text }));
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  const skeleton = (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-3 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-full bg-surface-2 animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-24 bg-surface-2 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-surface-2 animate-pulse rounded" />
          </div>
        </div>
      ))}
    </div>
  );

  if (loading) {
    return inline ? skeleton : (
      <section className="border-t border-border mt-16 pt-10">
        <div className="h-6 w-32 bg-surface-2 animate-pulse rounded mb-6" />
        {skeleton}
      </section>
    );
  }

  const body = (
    <>
      {!inline && (
        <h2 className="text-lg font-semibold text-foreground mb-6">
          Comments
          {total > 0 && <span className="text-muted font-normal ml-2 text-base">({total})</span>}
        </h2>
      )}

      {/* Compose new comment */}
      {user ? (
        <div className="flex gap-3 mb-8">
          <UserAvatar user={{ id: user.id, name: user.name, profile_picture: user.profile_picture, is_anonymous: user.is_anonymous ?? false, role: user.role }} />
          <div className="flex-1 space-y-2">
            <textarea
              rows={3}
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              maxLength={2000}
              placeholder="Leave a comment…"
              className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:border-fan transition-colors resize-none"
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted">{newText.length}/2000</span>
              <button
                onClick={submitComment}
                disabled={!newText.trim() || submitting}
                className="text-sm px-4 py-1.5 bg-fan text-black font-semibold rounded-lg hover:bg-fan-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 text-sm text-muted">
          <Link href="/login" className="text-fan hover:underline">Log in</Link>
          {' '}to leave a comment.
        </div>
      )}

      {/* Comment list */}
      {commentList.length === 0 ? (
        <p className="text-muted text-sm py-6 text-center">No comments yet. Be the first.</p>
      ) : (
        <div>
          {commentList.map((comment) => {
            const replyText = replyTextMap[comment.id];
            const editText  = editingMap[comment.id] ?? false;

            return (
              <CommentRow
                key={comment.id}
                comment={comment}
                currentUserId={user?.id}
                isCouncil={user?.role === 'council'}
                replies={repliesMap[comment.id]}
                replyText={replyText}
                editingText={editText}
                onLoadReplies={() => loadReplies(comment.id)}
                onSetReplyText={(text) => {
                  if (replyText === undefined) {
                    // Box is closed — open it
                    openReplyBox(comment.id);
                  } else {
                    setReplyText(comment.id, text);
                  }
                }}
                onSubmitReply={() => submitReply(comment.id)}
                onStartEdit={() =>
                  setEditingMap((prev) => ({ ...prev, [comment.id]: comment.content }))
                }
                onSetEditText={(text) =>
                  setEditingMap((prev) => ({ ...prev, [comment.id]: text }))
                }
                onSubmitEdit={() => submitEdit(comment.id)}
                onCancelEdit={() =>
                  setEditingMap((prev) => ({ ...prev, [comment.id]: false }))
                }
                onDelete={() => deleteComment(comment.id)}
                onReact={(type) => reactToComment(comment.id, type)}
              />
            );
          })}

          {/* Load more */}
          {page < lastPage && (
            <div className="pt-4 text-center">
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="text-sm text-muted hover:text-foreground border border-border hover:border-foreground/30 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Load more comments'}
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (inline) return body;

  return (
    <section className="border-t border-border mt-16 pt-10">
      {body}
    </section>
  );
}
