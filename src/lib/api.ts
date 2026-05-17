import type {
  User,
  PublicUser,
  Creator,
  CreatorName,
  NotificationSettings,
  UserNotification,
  NotificationPage,
  Nudge,
  Bounty,
  BountyPledge,
  BountyCompletion,
  BountyHistory,
  CreatorClaim,
  PaginatedResponse,
  PledgePage,
  CashBalance,
  PaymentMethod,
  BountyStatus,
  RemovePledgeResult,
  DeletePaymentMethodResult,
  CouncilMember,
  CouncilPage,
  AdminCreatorClaim,
  AdminBountyCompletion,
  AdminHandleReview,
  ExternalPayout,
  CreatorSearchResult,
  CreatorEarning,
  CreatorBalance,
  Comment,
  UserHandle,
  HandlePlatform,
  HandleClaim,
  HandleSearchResult,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('artypot_token');
}

export function setToken(token: string): void {
  localStorage.setItem('artypot_token', token);
}

export function clearToken(): void {
  localStorage.removeItem('artypot_token');
}

interface ApiError {
  status: number;
  message: string;
  requires_w9?: boolean;
  /** 422 body reason code, e.g. 'pledge_cap_exceeded' | 'payment_grace_period' */
  reason?: string;
  /** Free-form body payload for 422 responses (cap, current_total, requested, grace_expires_at, etc.) */
  data?: Record<string, unknown>;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    let message: string = body.message ?? res.statusText;
    if (res.status === 422 && body.errors) {
      const firstField = Object.values(body.errors as Record<string, string[]>)[0];
      if (firstField?.[0]) message = firstField[0];
    }
    const error: ApiError = {
      status: res.status,
      message,
      ...(body.requires_w9 ? { requires_w9: true } : {}),
      ...(body.reason ? { reason: body.reason as string } : {}),
      data: body as Record<string, unknown>,
    };
    throw error;
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// For multipart/form-data (file uploads) — no Content-Type header so browser sets boundary
async function requestMultipart<T>(path: string, body: FormData): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body });

  if (!res.ok) {
    const json = await res.json().catch(() => ({})) as { message?: string; errors?: Record<string, string[]> };
    let message: string = json.message ?? res.statusText;
    if (res.status === 422 && json.errors) {
      const firstField = Object.values(json.errors)[0];
      if (firstField?.[0]) message = firstField[0];
    }
    const error: ApiError = { status: res.status, message };
    throw error;
  }

  return res.json() as Promise<T>;
}

// Auth
export const auth = {
  register: (name: string, email: string, password: string, password_confirmation: string) =>
    request<{ token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ display_name: name, email, password, password_confirmation, agreed_to_terms: true }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<{ data: User }>('/auth/me'),

  /**
   * POST /auth/become-creator
   * Re-verifies all three gates server-side and creates the Creator record.
   * Gate status is derived from the /me response — no separate status fetch needed.
   */
  /**
   * POST /auth/become-creator
   * Activates creator mode after all four gates pass.
   * `slug` becomes the creator's permanent artypot.com/{slug} URL.
   */
  becomeCreator: (slug: string) =>
    request<{ message: string; slug: string }>('/auth/become-creator', {
      method: 'POST',
      body: JSON.stringify({ agreed_to_creator_terms: true, slug }),
    }),

  /** GET /auth/slug — current slug + cooldown availability. */
  getSlug: () =>
    request<{ slug: string | null; slug_changed_at: string | null; cooldown_until: string | null; cooldown_days: number }>('/auth/slug'),

  /** PATCH /auth/slug — change the creator's slug. Subject to the 30-day cooldown. */
  updateSlug: (slug: string) =>
    request<{ message: string; slug: string }>('/auth/slug', {
      method: 'PATCH',
      body: JSON.stringify({ slug }),
    }),

  /** GET /auth/slug/check?slug=… — lightweight availability check for the picker UI. */
  checkSlug: (slug: string) =>
    request<{ available: boolean; error: string | null }>(
      `/auth/slug/check?slug=${encodeURIComponent(slug)}`
    ),

  /**
   * GET /auth/handles
   * Returns the authenticated user's handle requests (pending + verified).
   */
  myHandles: () => request<{ data: HandleClaim[] }>('/auth/handles'),

  broke: () =>
    request<{ data: { revoked_count: number } }>('/auth/broke', { method: 'POST' }),

  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  verifyEmail: (id: string, hash: string, expires: string, signature: string) =>
    request<{ message: string }>(
      `/auth/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`
    ),

  resendVerification: () =>
    request<{ message: string }>('/auth/email/resend', { method: 'POST' }),

  oauthRedirect: (provider: string) =>
    request<{ url: string }>(`/auth/oauth/${provider}/redirect`),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/password/forgot', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  resetPassword: (data: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) =>
    request<{ message: string }>('/auth/password/reset', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  changePassword: (data: {
    current_password: string;
    password: string;
    password_confirmation: string;
  }) =>
    request<{ message: string }>('/auth/password/change', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  requestEmailChange: (email: string) =>
    request<{ message: string }>('/auth/email/change', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  confirmEmailChange: (id: string, hash: string, expires: string, signature: string) =>
    request<{ message: string }>(
      `/auth/email/change/confirm/${id}/${hash}?expires=${expires}&signature=${signature}`
    ),
};

// Phone number verification
export const phone = {
  /** Send a 6-digit code to the given number and save it as pending. */
  sendCode: (phone_number: string) =>
    request<{ message: string }>('/auth/phone', {
      method: 'POST',
      body: JSON.stringify({ phone_number }),
    }),

  /** Verify the 6-digit code received via SMS. */
  verifyCode: (code: string) =>
    request<{ message: string; phone_number: string; phone_verified_at: string }>('/auth/phone/verify', {
      method: 'POST',
      body: JSON.stringify({ code }),
    }),

  /** Remove the saved phone number entirely. */
  remove: () =>
    request<{ message: string }>('/auth/phone', { method: 'DELETE' }),
};

// Creators
export const creators = {
  list: (params?: {
    q?: string;
    page?: number;
    status?: 'answered' | 'unanswered';
    sort?: 'newest' | 'most_pledged' | 'most_completed';
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Creator>>(`/creators${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Creator }>(`/creators/${id}`),

  /**
   * GET /creators/by-slug/{slug}
   * Resolves a public creator URL slug to its current owner.
   *  - match === 'current'  → live slug, returns user
   *  - match === 'redirect' → historical slug, returns current_slug to redirect to
   */
  bySlug: (slug: string) =>
    request<
      | { match: 'current';  user: { id: number; display_name: string; slug: string; profile_picture: string | null; bio: string | null } }
      | { match: 'redirect'; current_slug: string }
    >(`/creators/by-slug/${encodeURIComponent(slug)}`),

  /**
   * GET /platform/{platform}/{handle}
   *  - match === 'claimed'   → handle is verified by a creator; redirect client to /{user.slug}
   *  - match === 'unclaimed' → no claim; returns bounties for share/recruitment UI
   */
  byPlatformHandle: (platform: string, handle: string) =>
    request<
      | { match: 'claimed';   user: { id: number; display_name: string; slug: string; profile_picture: string | null } }
      | { match: 'unclaimed'; handle: { id: number | null; platform: string; username: string }; bounties: Array<{ id: number; title: string; status: string; total_pledged: string; created_at: string }> }
    >(`/platform/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}`),

  create: (data: Partial<Creator>) =>
    request<{ data: Creator }>('/creators', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Creator>) =>
    request<{ data: Creator }>(`/creators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  claim: (creator_id: number, contact_info: string) =>
    request<{ data: CreatorClaim }>('/creator-claims', {
      method: 'POST',
      body: JSON.stringify({ creator_id, contact_info }),
    }),
};

// Creator Names (aliases)
export const creatorNames = {
  list: (creatorId: number) =>
    request<{ data: CreatorName[] }>(`/creators/${creatorId}/names`),

  create: (creatorId: number, name: string) =>
    request<{ data: CreatorName }>(`/creators/${creatorId}/names`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  delete: (creatorId: number, nameId: number) =>
    request<void>(`/creators/${creatorId}/names/${nameId}`, { method: 'DELETE' }),
};

// Bounties
export const bounties = {
  list: (params?: { creator_id?: number; status?: BountyStatus; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Bounty>>(`/bounties${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Bounty }>(`/bounties/${id}`),

  create: (data: {
    title: string;
    description?: string;
    initial_pledge_amount?: number;
    target_user_id?: number;
    target_handle_id?: number;
    platform?: string;
    username?: string;
    display_name?: string;
  }) =>
    request<{ data: Bounty }>('/bounties', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: { title?: string; description?: string }) =>
    request<{ data: Bounty }>(`/bounties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  pledge: (bountyId: number, amount: number, expires_at?: string) =>
    request<{ data: BountyPledge & { bounty: { total_pledged: number } } }>(`/bounties/${bountyId}/pledges`, {
      method: 'POST',
      body: JSON.stringify({ amount, ...(expires_at ? { expires_at } : {}) }),
    }),

  removePledge: (bountyId: number, pledgeId: number) =>
    request<RemovePledgeResult>(`/bounties/${bountyId}/pledges/${pledgeId}`, { method: 'DELETE' }),

  submitCompletion: (bountyId: number, submission_url: string, submission_notes?: string) =>
    request<{ data: BountyCompletion }>(`/bounties/${bountyId}/completion`, {
      method: 'POST',
      body: JSON.stringify({ submission_url, submission_notes }),
    }),

  history: (bountyId: number) =>
    request<BountyHistory>(`/bounties/${bountyId}/history`),

  creatorRemove: (bountyId: number, reason: string) =>
    request<{ message: string }>(`/bounties/${bountyId}/creator-remove`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
};

// Users
export const users = {
  get: (id: number) =>
    request<{ data: PublicUser }>(`/users/${id}`),

  update: (id: number, data: Partial<Pick<User, 'display_name' | 'profile_picture' | 'is_anonymous' | 'country_code' | 'state_code'>>) =>
    request<{ data: User }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  uploadProfilePicture: (id: number, file: File) => {
    const form = new FormData();
    form.append('profile_picture', file);
    return requestMultipart<{ data: { profile_picture: string } }>(`/users/${id}/profile-picture`, form);
  },
};

// Comments
export const comments = {
  /** Paginated top-level comments for a bounty. */
  list: (bountyId: number, page = 1) =>
    request<PaginatedResponse<Comment>>(`/bounties/${bountyId}/comments?page=${page}`),

  /** All direct replies to a top-level comment (not paginated). */
  replies: (commentId: number) =>
    request<{ data: Comment[] }>(`/comments/${commentId}/replies`),

  /** Post a new top-level comment on a bounty. */
  create: (bountyId: number, content: string) =>
    request<{ data: Comment }>(`/bounties/${bountyId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /** Post a reply to a top-level comment. */
  createReply: (commentId: number, content: string) =>
    request<{ data: Comment }>(`/comments/${commentId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  /** Edit a comment's content. */
  update: (commentId: number, content: string) =>
    request<{ data: Comment }>(`/comments/${commentId}`, {
      method: 'PATCH',
      body: JSON.stringify({ content }),
    }),

  /** Soft-delete a comment. */
  delete: (commentId: number) =>
    request<{ message: string }>(`/comments/${commentId}`, { method: 'DELETE' }),

  /**
   * React to a comment. Toggles: calling with the same type removes the reaction;
   * calling with a different type swaps it.
   */
  react: (commentId: number, type: 'like' | 'dislike') =>
    request<{ likes_count: number; dislikes_count: number; user_reaction: 'like' | 'dislike' | null }>(
      `/comments/${commentId}/react`,
      { method: 'POST', body: JSON.stringify({ type }) }
    ),
};

// Featured bounties (public)
export const featuredBounties = {
  list: () => request<{ data: Bounty[] }>('/featured-bounties'),
};

// Pledges (authenticated user's own)
export const pledges = {
  list: (params?: { sort?: 'date' | 'amount'; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PledgePage>(`/auth/pledges${qs ? `?${qs}` : ''}`);
  },
};

// Notification settings
export const notificationSettings = {
  get: () => request<NotificationSettings>('/auth/notification-settings'),
  update: (data: Partial<NotificationSettings>) =>
    request<NotificationSettings>('/auth/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

// Nudges
export const nudges = {
  get: () =>
    request<{ nudge: Nudge | null }>('/auth/nudge'),
  dismiss: (type: string) =>
    request<{ message: string }>(`/auth/nudge/${type}/dismiss`, { method: 'POST' }),
};

// In-app notifications
export const notifications = {
  list: (page = 1) =>
    request<NotificationPage>(`/notifications?page=${page}`),

  unreadCount: () =>
    request<{ unread_count: number }>('/notifications/unread-count'),

  markRead: (id: number) =>
    request<UserNotification>(`/notifications/${id}/read`, { method: 'PATCH' }),

  markAllRead: () =>
    request<{ message: string }>('/notifications/read-all', { method: 'POST' }),

  bulkRead: (ids: number[]) =>
    request<{ message: string }>('/notifications/bulk-read', {
      method: 'POST',
      body: JSON.stringify({ ids }),
    }),
};

// Cash / Billing
export const billing = {
  cash: () => request<CashBalance>('/cash'),

  paymentMethods: () => request<{ data: PaymentMethod[] }>('/billing/payment-methods'),

  setupIntent: () =>
    request<{ data: { client_secret: string; setup_intent_id: string } }>('/billing/setup-intent', {
      method: 'POST',
    }),

  deletePaymentMethod: (id: string) =>
    request<DeletePaymentMethodResult>(`/billing/payment-methods/${id}`, { method: 'DELETE' }),

  /** Confirm an existing card is still valid, resetting its 90-day activity window. */
  confirmPaymentMethod: (id: string) =>
    request<{ data: PaymentMethod }>(`/billing/payment-methods/${id}/confirm`, { method: 'POST' }),

  /** Immediately charge the authenticated user's full negative available_cash balance. */
  payNow: () =>
    request<{ message: string; charged: number }>('/billing/pay-now', { method: 'POST' }),
};

// Cash (creator-specific endpoints)
export const cash = {
  /** Wallet overview for the authenticated creator: confirmed balance + pending earnings. */
  creatorBalance: () =>
    request<CreatorBalance>('/cash/creator-balance'),

  /** Per-bounty earnings breakdown for the authenticated creator. */
  creatorEarnings: () =>
    request<{ data: CreatorEarning[] }>('/cash/creator-earnings'),
};

// W-9 — tax compliance for creators
export const w9 = {
  /** Current W-9 status + YTD withdrawal total for the authenticated creator. */
  status: () =>
    request<{ data: import('./types').FormW9StatusResponse }>('/w9/status'),

  /** Create or retrieve the TaxBandits hosted W-9 form URL for the current tax year. */
  w9Url: () =>
    request<{ data: { w9_url: string; w9_url_expires_at: string; status: string } }>('/w9/url', {
      method: 'POST',
    }),
};

// W-8BEN — tax compliance for non-US creators
export const w8ben = {
  /** Current W-8BEN status + YTD withdrawal total for the authenticated non-US creator. */
  status: () =>
    request<{ data: import('./types').FormW8BENStatusResponse }>('/w8ben/status'),

  /** Create or retrieve the TaxBandits hosted W-8BEN form URL for the current tax year. */
  w8benUrl: () =>
    request<{ data: { w8ben_url: string; w8ben_url_expires_at: string; status: string } }>('/w8ben/url', {
      method: 'POST',
    }),
};

// Withdrawals — creator payout (creator/council only)
export const withdrawals = {
  /** Request a payout of `amount` dollars to the linked bank account. */
  request: (amount: number) =>
    request<{ data: import('./types').Withdrawal }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};

// Stripe Connect — bank account onboarding for creators
export const stripeConnect = {
  /**
   * Create (or retrieve) the creator's Stripe Connect account and return a
   * Stripe-hosted Account Link URL for onboarding (KYC + bank via Financial Connections).
   * Idempotent — safe to call multiple times; always returns a fresh link URL.
   */
  createAccount: (returnUrl: string, refreshUrl: string) =>
    request<{ data: { account_id: string; onboarding_url: string } }>('/payout/stripe/account', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
    }),

  /** Get the current Connect account status (payouts_enabled, etc.). */
  accountStatus: () =>
    request<{
      data: {
        account_id: string | null;
        payouts_enabled: boolean;
        charges_enabled: boolean;
        details_submitted: boolean;
        requirements: string[];
      };
    }>('/payout/stripe/account'),

  /** Generate a fresh Account Link URL for a creator who needs to re-enter onboarding. */
  onboardingLink: (returnUrl: string, refreshUrl: string) =>
    request<{ data: { onboarding_url: string } }>('/payout/stripe/onboarding-link', {
      method: 'POST',
      body: JSON.stringify({ return_url: returnUrl, refresh_url: refreshUrl }),
    }),

  /** Disconnect and delete the creator's Stripe Connect account so they can re-onboard. */
  disconnect: () =>
    request<{ data: { disconnected: boolean } }>('/payout/stripe/account', { method: 'DELETE' }),
};

// Overlord — logs
export const handles = {
  /** GET /handles/search?q=... — unified handle search for bounty targeting */
  search: (q: string) =>
    request<{ data: HandleSearchResult }>(
      `/handles/search?q=${encodeURIComponent(q)}`
    ),

  /** POST /handles — find-or-create a handle and create an unverified claim */
  store: (platform: HandlePlatform, username: string) =>
    request<{ data: HandleClaim }>('/handles', {
      method: 'POST',
      body: JSON.stringify({ platform, username }),
    }),

  /** DELETE /handles/{claimId} — remove the authenticated user's handle claim */
  destroy: (claimId: number) =>
    request<void>(`/handles/${claimId}`, { method: 'DELETE' }),

  /**
   * POST /handles/{claimId}/request-review
   * Submit a claim for admin review. contactMessage tells admins how to verify ownership.
   */
  requestReview: (claimId: number, contactMessage: string) =>
    request<{ message: string; data: HandleClaim }>(`/handles/${claimId}/request-review`, {
      method: 'POST',
      body: JSON.stringify({ contact_message: contactMessage }),
    }),
};

export const logs = {
  list: (params?: { page?: number; level?: string; search?: string }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<{
      data: { logged_at: string; level: string; message: string; context: string | null }[];
      meta: { current_page: number; last_page: number; total: number; per_page: number };
    }>(`/overlord/logs${qs ? `?${qs}` : ''}`);
  },

  deleteBefore: (before: string) =>
    request<{ message: string; deleted: number; remaining: number }>('/overlord/logs', {
      method: 'DELETE',
      body: JSON.stringify({ before }),
    }),
};

// Overlord — grant/revoke Council by email
export const overlord = {
  listCouncil: () =>
    request<CouncilPage>('/overlord/council'),

  grantCouncil: (email: string) =>
    request<{ data: CouncilMember }>('/overlord/council', {
      method: 'POST',
      body: JSON.stringify({ email }),
    }),

  revokeCouncil: (councilId: number) =>
    request<void>(`/overlord/council/${councilId}`, { method: 'DELETE' }),
};

// Admin (Council only)
export const admin = {
  // Handle Verification
  listHandleReviews: (page = 1) =>
    request<PaginatedResponse<AdminHandleReview>>(`/admin/handles?page=${page}`),

  approveHandle: (handleId: number) =>
    request<{ data: unknown }>(`/admin/handles/${handleId}/approve`, { method: 'POST' }),

  rejectHandle: (handleId: number) =>
    request<{ data: unknown }>(`/admin/handles/${handleId}/reject`, { method: 'POST' }),

  // Creator Claims
  listClaims: (status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending', page = 1) =>
    request<PaginatedResponse<AdminCreatorClaim>>(`/admin/creator-claims?status=${status}&page=${page}`),

  reviewClaim: (claimId: number, data: { status: 'approved' | 'rejected'; council_notes?: string }) =>
    request<{ data: AdminCreatorClaim }>(`/admin/creator-claims/${claimId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Bounty Completions
  listCompletions: (status: 'pending_review' | 'approved' | 'rejected' | 'all' = 'pending_review', page = 1) =>
    request<PaginatedResponse<AdminBountyCompletion>>(`/admin/bounty-completions?status=${status}&page=${page}`),

  reviewCompletion: (bountyId: number, data: { status: 'approved' | 'rejected'; council_notes?: string }) =>
    request<{ data: Bounty }>(`/admin/bounties/${bountyId}/completion`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Council Members
  listCouncil: (page = 1) =>
    request<PaginatedResponse<CouncilMember>>(`/admin/council?page=${page}`),

  // Featured Bounties
  getFeaturedBounties: () =>
    request<{ data: Array<{ position: number; bounty: Bounty | null; added_by: { id: number; name: string } | null; updated_at: string }> }>('/admin/featured-bounties'),

  setFeaturedBounties: (slots: Array<{ bounty_id: number }>) =>
    request<{ data: Array<{ position: number; bounty: Bounty | null; added_by: { id: number; name: string } | null; updated_at: string }> }>('/admin/featured-bounties', {
      method: 'PUT',
      body: JSON.stringify({ slots }),
    }),

  // Users
  listUsers: (params?: { q?: string; filter?: 'creator' | 'council' | 'fan'; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<import('./types').PaginatedResponse<import('./types').AdminUser>>(
      `/admin/users${qs ? `?${qs}` : ''}`
    );
  },

  getUser: (id: number) =>
    request<{ data: import('./types').AdminUser }>(`/admin/users/${id}`),

  // Creators
  listCreators: (params?: { q?: string; claimed?: 'true' | 'false' | 'all'; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '' && v !== 'all')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<import('./types').PaginatedResponse<import('./types').AdminCreator>>(
      `/admin/creators${qs ? `?${qs}` : ''}`
    );
  },

  getCreator: (id: number) =>
    request<{ data: import('./types').AdminCreator & {
      w9_records: Array<{
        id: number;
        tax_year: number;
        status: import('./types').CreatorW9Status;
        completed_at: string | null;
        tin_matched_at: string | null;
        created_at: string;
      }>;
    } }>(`/admin/creators/${id}`),

  // External Payouts (off-Stripe payouts: Wise, PayPal, wire, check, etc.)
  externalPayouts: {
    list: (params?: { creator_id?: number; include_reversed?: boolean; page?: number }) => {
      const entries = Object.entries(params ?? {})
        .filter(([, v]) => v != null)
        .map(([k, v]) => [k, String(v)]) as [string, string][];
      const qs = new URLSearchParams(entries).toString();
      return request<PaginatedResponse<ExternalPayout>>(`/admin/external-payouts${qs ? `?${qs}` : ''}`);
    },

    get: (id: number) =>
      request<{ data: ExternalPayout }>(`/admin/external-payouts/${id}`),

    /** multipart/form-data — caller builds the FormData with creator_id, amount, method, etc. */
    create: (form: FormData) =>
      requestMultipart<{ data: ExternalPayout }>('/admin/external-payouts', form),

    reverse: (id: number, reason: string) =>
      request<{ data: ExternalPayout }>(`/admin/external-payouts/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),

    searchCreators: (q: string) =>
      request<{ data: CreatorSearchResult[] }>(
        `/admin/external-payouts/creators?q=${encodeURIComponent(q)}`
      ),
  },
};
