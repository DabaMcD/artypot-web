import type {
  User,
  PublicUser,
  Creator,
  NotificationSettings,
  UserNotification,
  NotificationPage,
  Nudge,
  Bounty,
  BountyBacking,
  BountyCompletion,
  BountyHistory,
  PaginatedResponse,
  BackingPage,
  FanStats,
  FanPaymentSummary,
  FanPaymentStatus,
  CashBalance,
  PaymentMethod,
  BountyStatus,
  RemoveBackingResult,
  DeletePaymentMethodResult,
  CouncilMember,
  CouncilPage,
  TreasurySummary,
  PlatformWithdrawal,
  PlatformWithdrawalCategory,
  SystemSnapshot,
  IntegrityReport,
  AdminBountyCompletion,
  HandleVerificationApplicationRow,
  HandleVerificationApplicationStatus,
  ExternalPayout,
  CreatorSearchResult,
  CreatorEarning,
  CreatorBalance,
  Comment,
  HandlePlatform,
  HandleClaim,
  HandleSearchResult,
  SearchResponse,
  SearchBountyResult,
  ComplianceSource,
  ComplianceSanction,
  ComplianceSanctionEntity,
  ComplianceMatchCandidate,
  ComplianceTaxTreaty,
  CompliancePaymentSupport,
  ComplianceStateThreshold,
  CompliancePlatformFeeTaxRate,
  ComplianceContentRule,
  ComplianceJobRun,
  ComplianceAuditEntry,
  BillingRun,
  BillingRunDetail,
  CountryTiersResponse,
  AuditLogResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('artypot_token');
}

/**
 * Best-effort flag cookie used by the Edge middleware (`src/middleware.ts`)
 * to gate `/admin` and `/obelisk` routes server-side. The middleware only
 * checks the cookie's presence — not its value — so we store an innocuous
 * `1` rather than mirroring the bearer token (which would needlessly expose
 * it to same-site requests). The real auth check stays Bearer-header-based.
 */
const SESSION_COOKIE = 'artypot_session';

function writeSessionCookie(): void {
  if (typeof document === 'undefined') return;
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  // No Max-Age → session cookie; cleared on browser close, matching the
  // localStorage token's effective lifetime in private windows.
  document.cookie = `${SESSION_COOKIE}=1; Path=/; SameSite=Lax${secure}`;
}

function clearSessionCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function setToken(token: string): void {
  localStorage.setItem('artypot_token', token);
  writeSessionCookie();
}

export function clearToken(): void {
  localStorage.removeItem('artypot_token');
  clearSessionCookie();
}

/**
 * Ensure the session cookie is present when a token is already in localStorage.
 * Called from <AuthProvider> on boot so users who logged in before the cookie
 * code existed aren't permanently locked out of `/admin` / `/obelisk` by the
 * middleware until they log out and back in.
 */
export function ensureSessionCookie(): void {
  if (typeof document === 'undefined') return;
  if (!localStorage.getItem('artypot_token')) return;
  const has = document.cookie.split(';').some((c) => c.trim().startsWith(`${SESSION_COOKIE}=`));
  if (!has) writeSessionCookie();
}

interface ApiError {
  status: number;
  message: string;
  requires_w9?: boolean;
  /** 422 body reason code, e.g. 'backing_cap_exceeded' | 'payment_grace_period' */
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
  register: (payload: {
    name: string;
    email?: string;
    phone_number?: string;
    password: string;
    password_confirmation: string;
  }) =>
    request<{ token: string; phone_verification_required?: boolean }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        display_name:           payload.name,
        email:                  payload.email       || undefined,
        phone_number:           payload.phone_number || undefined,
        password:               payload.password,
        password_confirmation:  payload.password_confirmation,
        agreed_to_terms:        true,
      }),
    }),

  login: (identifier: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      // Phone numbers start with '+'; everything else is treated as an email.
      body: JSON.stringify(
        identifier.startsWith('+')
          ? { phone_number: identifier, password }
          : { email: identifier, password },
      ),
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
    sort?: 'newest' | 'most_backed' | 'most_completed';
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
   *  - match === 'verified'   → handle is verified by a creator; redirect client to /{user.slug}
   *  - match === 'unverified' → no verified claim; returns bounties for share/recruitment UI
   */
  byPlatformHandle: (platform: string, handle: string) =>
    request<
      | { match: 'verified';   user: { id: number; display_name: string; slug: string; profile_picture: string | null } }
      | { match: 'unverified'; handle: { id: number | null; platform: string; username: string }; bounties: Array<{ id: number; title: string; status: string; total_backed: string; created_at: string }> }
    >(`/platform/${encodeURIComponent(platform)}/${encodeURIComponent(handle)}`),

  create: (data: Partial<Creator>) =>
    request<{ data: Creator }>('/creators', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Creator>) =>
    request<{ data: Creator }>(`/creators/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
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
    initial_backing_amount?: number;
    target_user_id?: number;
    target_handle_id?: number;
    platform?: string;
    username?: string;
    url?: string;
    display_name?: string;
    backing_expiry_value?: number;
    backing_expiry_unit?: string;
  }) =>
    request<{ data: Bounty; default_update_prompts?: import('./default-update-prompt-context').DefaultUpdatePrompts }>(
      '/bounties',
      { method: 'POST', body: JSON.stringify(data) },
    ),

  update: (id: number, data: { title?: string; description?: string; display_name?: string | null }) =>
    request<{ data: Bounty }>(`/bounties/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  backing: (
    bountyId: number,
    amount: number,
    expires_at?: string,
    expiry_value?: number,
    expiry_unit?: string,
  ) =>
    request<{
      data: BountyBacking;
      bounty: { id: number; total_backed: number; solid_total: number };
      default_update_prompts?: import('./default-update-prompt-context').DefaultUpdatePrompts;
    }>(`/bounties/${bountyId}/backings`, {
      method: 'POST',
      body: JSON.stringify({
        amount,
        ...(expires_at ? { expires_at } : {}),
        ...(expiry_value !== undefined ? { backing_expiry_value: expiry_value } : {}),
        ...(expiry_unit !== undefined ? { backing_expiry_unit: expiry_unit } : {}),
      }),
    }),

  removeBacking: (bountyId: number, backingId: number) =>
    request<RemoveBackingResult>(`/bounties/${bountyId}/backings/${backingId}`, { method: 'DELETE' }),

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

  /** Creator-only: itemized preview of refunding every backer on this bounty. */
  refundPreview: (bountyId: number) =>
    request<{ data: import('./types').BountyRefundPreview }>(`/bounties/${bountyId}/refund-preview`),

  /**
   * Creator-only: refund every backer. Gated on balance ≥ gross clawback.
   * `reason` is required and shown publicly to every refunded backer.
   */
  refundAll: (bountyId: number, reason: string) =>
    request<{ data: import('./types').BountyRefundResult }>(`/bounties/${bountyId}/refund-all`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
};

// Users
export const users = {
  get: (id: number) =>
    request<{ data: PublicUser }>(`/users/${id}`),

  update: (id: number, data: Partial<Pick<User, 'display_name' | 'profile_picture' | 'is_anonymous' | 'country_code' | 'state_code' | 'default_expiry_value' | 'default_expiry_unit' | 'default_backing_amount' | 'bio' | 'fan_name' | 'fan_name_plural'>>) =>
    request<{ data: User }>(`/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
};

// Comments
export const comments = {
  /** Paginated top-level comments for a bounty. */
  list: (bountyId: number, page = 1) =>
    request<PaginatedResponse<Comment>>(`/bounties/${bountyId}/comments?page=${page}`),

  /** A single comment by id — used for deep-linking (notification/email). */
  get: (commentId: number) =>
    request<{ data: Comment }>(`/comments/${commentId}`),

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

// Backings (authenticated user's own)
export const backings = {
  list: (params?: { sort?: 'date' | 'amount'; page?: number; bounty_status?: string; per_page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<BackingPage>(`/auth/backings${qs ? `?${qs}` : ''}`);
  },
  stats: () => request<FanStats>('/auth/backings/stats'),
};

// Notification settings
export const notificationSettings = {
  get: () => request<NotificationSettings>('/auth/notification-settings'),
  update: (data: Partial<NotificationSettings>) =>
    request<NotificationSettings>('/auth/notification-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  reset: () =>
    request<NotificationSettings>('/auth/notification-settings/reset', {
      method: 'PUT',
    }),
};

// Following
export const following = {
  index: () =>
    request<{ users: number[]; bounties: number[] }>('/auth/following'),
  follow: (type: 'user' | 'bounty', id: number) =>
    request<{ followed: boolean }>('/auth/following', {
      method: 'POST',
      body: JSON.stringify({ type, id }),
    }),
  unfollow: (type: 'user' | 'bounty', id: number) =>
    request<{ followed: boolean }>(`/auth/following/${type}/${id}`, {
      method: 'DELETE',
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

  /**
   * Immediately charge the authenticated user's full negative available_cash balance.
   *
   * Response shape varies:
   *   - Happy path:        { message, charged }
   *   - 3DS / SCA needed:  { message, requires_action: true, client_secret, fan_payment_id }
   *
   * Callers MUST check `requires_action` before treating the response as success
   * and open the ConfirmPaymentModal with the returned `client_secret`.
   */
  payNow: () =>
    request<{
      message: string;
      charged?: number;
      requires_action?: boolean;
      client_secret?: string;
      fan_payment_id?: number;
    }>('/billing/pay-now', { method: 'POST' }),

  /**
   * Returns the user's outstanding 3DS / SCA challenge, if any.
   *
   * Polled on app load (and after billing-page mounts) to decide whether to
   * render PaymentAuthBanner / Complete Authentication CTA.
   */
  pendingAction: () =>
    request<{
      pending: boolean;
      fan_payment_id?: number;
      client_secret?: string;
      amount_cents?: number;
      requires_action_at?: string;
      expires_at?: string;
    }>('/billing/pending-action'),

  /** Paginated history of the fan's past charges, each itemized by the backings it settled. */
  payments: (params?: { page?: number; status?: FanPaymentStatus }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<FanPaymentSummary>>(`/billing/payments${qs ? `?${qs}` : ''}`);
  },
};

// Cash (creator-specific endpoints)
export const cash = {
  /** Wallet overview for the authenticated creator: confirmed balance + pending earnings. */
  creatorBalance: (page?: number) =>
    request<CreatorBalance>(`/cash/creator-balance${page && page > 1 ? `?available_page=${page}` : ''}`),

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

export const search = {
  /**
   * GET /search — unified header/global search (people + bounties).
   * Pass an AbortSignal to cancel an in-flight request when the query changes.
   */
  query: (
    params: {
      q: string;
      mode?: 'dropdown' | 'full';
      limit_people?: number;
      limit_bounties?: number;
      include_completed?: boolean;
    },
    signal?: AbortSignal,
  ) => {
    const entries = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<SearchResponse>(`/search?${qs}`, { signal });
  },

  /** GET /search/trending — top open bounties by recent backing velocity. */
  trending: (signal?: AbortSignal) =>
    request<{ data: SearchBountyResult[] }>(`/search/trending`, { signal }),
};

// Overlord — logs
export const handles = {
  /** GET /handles/search?q=... — unified handle search for bounty targeting */
  search: (q: string, signal?: AbortSignal) =>
    request<{ data: HandleSearchResult }>(
      `/handles/search?q=${encodeURIComponent(q)}`,
      { signal }
    ),

  /**
   * POST /handles — find-or-create a handle and create an unverified claim.
   *
   * - Curated platform: pass `{ platform: 'twitter', value: 'zachking' }`. The
   *   `value` becomes the username and is canonicalised server-side.
   * - 'other' platform: pass `{ platform: 'other', value: 'https://…' }`. The
   *   `value` is treated as a URL and canonicalised into a host+path key.
   */
  store: (platform: HandlePlatform, value: string) => {
    const body = platform === 'other'
      ? { platform, url: value }
      : { platform, username: value };
    return request<{ data: HandleClaim; already_claimed?: boolean }>('/handles', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },

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

// Overlord — sitewide metrics
export const metrics = {
  get: () =>
    request<{
      data: {
        total_bounties:              number;
        avg_bounty_amount:           number;
        stddev_bounty_amount:        number;
        total_backed_amount:        number;
        total_hard_backings:          number;
        avg_hard_backing_amount:      number;
        total_soft_backings:          number;
        avg_soft_backing_amount:      number;
        total_users:                 number;
        total_creators:              number;
        total_paid_by_fans:          number;
        total_paid_out_to_creators:  number;
        total_unpaid_to_creators:    number;
        total_comments:              number;
        reply_percentage:            number;
      };
    }>('/overlord/metrics'),
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

  treasury: () =>
    request<{ data: TreasurySummary }>('/overlord/treasury'),

  withdrawals: {
    list: (params?: { include_reversed?: boolean; page?: number }) => {
      const qs = new URLSearchParams();
      if (params?.include_reversed) qs.set('include_reversed', 'true');
      if (params?.page) qs.set('page', String(params.page));
      const s = qs.toString();
      return request<PaginatedResponse<PlatformWithdrawal>>(`/overlord/treasury/withdrawals${s ? `?${s}` : ''}`);
    },

    create: (body: {
      amount: number;
      category: PlatformWithdrawalCategory;
      destination?: string;
      external_reference_id?: string;
      withdrawn_at: string;
      notes?: string;
    }) =>
      request<{ data: PlatformWithdrawal }>('/overlord/treasury/withdrawals', {
        method: 'POST',
        body: JSON.stringify(body),
      }),

    reverse: (id: number, reason: string) =>
      request<{ data: PlatformWithdrawal }>(`/overlord/treasury/withdrawals/${id}/reverse`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  integrity: () =>
    request<{ data: IntegrityReport }>('/overlord/integrity'),

  system: {
    get: () =>
      request<{ data: SystemSnapshot }>('/overlord/system'),

    retryFailed: (uuid: string) =>
      request<{ message: string }>(`/overlord/system/failed-jobs/${uuid}/retry`, { method: 'POST' }),

    forgetFailed: (uuid: string) =>
      request<{ message: string }>(`/overlord/system/failed-jobs/${uuid}`, { method: 'DELETE' }),

    retryAllFailed: () =>
      request<{ message: string }>('/overlord/system/failed-jobs/retry-all', { method: 'POST' }),

    flushFailed: () =>
      request<{ message: string }>('/overlord/system/failed-jobs', { method: 'DELETE' }),
  },
};

// Admin (Council only)
export const admin = {
  // Handle Verification
  /** Pending applications queue (the active admin review work list). */
  listHandleReviews: (page = 1) =>
    request<PaginatedResponse<HandleVerificationApplicationRow>>(`/admin/handles?page=${page}`),

  /**
   * Decided / retracted application history with optional filters.
   * `reviewer_q` matches admin display_name or email.
   * `creator_q`  matches claimant display_name, email, OR handle username.
   */
  listHandleHistory: (params: {
    status?: HandleVerificationApplicationStatus | 'all';
    reviewer_q?: string;
    creator_q?: string;
    page?: number;
  } = {}) => {
    const entries = Object.entries(params)
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<HandleVerificationApplicationRow>>(
      `/admin/handles/history${qs ? `?${qs}` : ''}`
    );
  },

  approveHandle: (handleId: number, decisionNotes?: string) =>
    request<{ data: unknown }>(`/admin/handles/${handleId}/approve`, {
      method: 'POST',
      body: JSON.stringify(decisionNotes ? { decision_notes: decisionNotes } : {}),
    }),

  rejectHandle: (handleId: number, decisionNotes?: string) =>
    request<{ data: unknown }>(`/admin/handles/${handleId}/reject`, {
      method: 'POST',
      body: JSON.stringify(decisionNotes ? { decision_notes: decisionNotes } : {}),
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

  deleteUser: (id: number) =>
    request<null>(`/admin/users/${id}`, { method: 'DELETE' }),

  // Creators
  listCreators: (params?: { q?: string; verified?: 'true' | 'false' | 'all'; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '' && v !== 'all')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<import('./types').PaginatedResponse<import('./types').AdminCreator>>(
      `/admin/creators${qs ? `?${qs}` : ''}`
    );
  },

  getCreator: (id: number) =>
    request<{ data: import('./types').AdminCreatorDetail }>(`/admin/creators/${id}`),

  // Billing Runs (monthly fan-charge cycles + their failure/chargeback fallout)
  billingRuns: {
    list: (page = 1) =>
      request<PaginatedResponse<BillingRun>>(`/admin/billing-runs?page=${page}`),

    get: (id: number) =>
      request<{ data: BillingRunDetail }>(`/admin/billing-runs/${id}`),

    trigger: () =>
      request<{ message: string }>('/admin/billing-runs/trigger', { method: 'POST' }),
  },

  // Refunds (partial refunds of grouped charges; creator clawed back at net)
  refunds: {
    list: (page = 1) =>
      request<PaginatedResponse<import('./types').AdminRefund>>(`/admin/refunds?page=${page}`),

    /** Per-backing breakdown of a grouped charge — pick which slice to refund. */
    paymentBackings: (fanPaymentId: number) =>
      request<{ data: import('./types').FanPaymentBackingsResponse }>(
        `/admin/fan-payments/${fanPaymentId}/backings`
      ),

    /** `reason` is required and shown publicly to the fan and creator. */
    refundBacking: (backingId: number, reason: string, notes?: string) =>
      request<{ data: import('./types').AdminRefund }>(`/admin/backings/${backingId}/refund`, {
        method: 'POST',
        body: JSON.stringify({ reason, ...(notes ? { notes } : {}) }),
      }),
  },

  // Country tiers (read-only, derived live from compliance data)
  countryTiers: () =>
    request<CountryTiersResponse>('/admin/country-tiers'),

  // Platform audit log (read-only feed of admin/council actions)
  auditLog: (params?: { source?: string; category?: string; actor_id?: number; from?: string; to?: string; page?: number; per_page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null && v !== '')
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<AuditLogResponse>(`/admin/audit-log${qs ? `?${qs}` : ''}`);
  },

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

  // Compliance — extended
  complianceDashboard: () =>
    request<{
      sources: ComplianceSource[];
      pending_sanctions: number;
      pending_matches: number;
      annual_review_overdue: Record<string, number>;
      recent_job_runs: ComplianceJobRun[];
    }>('/admin/compliance/dashboard'),

  complianceSanctions: (params?: { status?: string; country_code?: string; severity?: string; active_only?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.country_code) qs.set('country_code', params.country_code);
    if (params?.severity) qs.set('severity', params.severity);
    if (params?.active_only) qs.set('active_only', '1');
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceSanction>>(`/admin/compliance/sanctions?${qs}`);
  },

  complianceSanctionEntities: (id: number) =>
    request<{ sanction: ComplianceSanction; entities: ComplianceSanctionEntity[] }>(`/admin/compliance/sanctions/${id}/entities`),

  compliancePendingSanctions: (page = 1) =>
    request<PaginatedResponse<ComplianceSanction>>(`/admin/compliance/sanctions/pending?page=${page}`),

  approveSanction: (id: number) =>
    request<{ message: string; sanction: ComplianceSanction; alerts_sent: number }>(`/admin/compliance/sanctions/${id}/approve`, { method: 'POST' }),

  proposeSanction: (body: {
    country_code: string;
    subdivision_code?: string | null;
    program_name: string;
    severity: 'comprehensive_block' | 'sectoral' | 'list_based' | 'advisory';
    applies_to: 'all_residents' | 'specific_entities' | 'specific_sectors';
    source: string;
    source_url?: string | null;
    effective_date: string;
    sunset_date?: string | null;
    notes?: string | null;
  }) =>
    request<{
      message: string;
      sanction: ComplianceSanction;
      impact: { affected_user_count: number; sample_user_ids: number[]; owned_open_bounties: number; backed_open_bounties: number };
    }>('/admin/compliance/sanctions', { method: 'POST', body: JSON.stringify(body) }),

  complianceDryRun: (body: { country_code: string; subdivision_code?: string | null; severity?: string }) =>
    request<{
      affected_user_count: number;
      sample_user_ids: number[];
      owned_open_bounties: number;
      backed_open_bounties: number;
    }>('/admin/compliance/dry-run', { method: 'POST', body: JSON.stringify(body) }),

  rejectSanction: (id: number, notes?: string) =>
    request<{ message: string }>(`/admin/compliance/sanctions/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),

  complianceMatches: (page = 1) =>
    request<PaginatedResponse<ComplianceMatchCandidate>>(`/admin/compliance/sanctions/matches?page=${page}`),

  complianceMatchHistory: (params?: { status?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.status) qs.set('status', params.status);
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceMatchCandidate>>(`/admin/compliance/matches/history?${qs}`);
  },

  reviewMatch: (id: number, status: string, review_notes?: string) =>
    request<{ message: string }>(`/admin/compliance/sanctions/matches/${id}/review`, {
      method: 'POST',
      body: JSON.stringify({ status, review_notes }),
    }),

  complianceTreaties: (params?: { country_code?: string; requires_w8ben?: boolean; active_only?: boolean; overdue_review?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.country_code) qs.set('country_code', params.country_code);
    if (params?.requires_w8ben !== undefined) qs.set('requires_w8ben', params.requires_w8ben ? '1' : '0');
    if (params?.active_only) qs.set('active_only', '1');
    if (params?.overdue_review) qs.set('overdue_review', '1');
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceTaxTreaty>>(`/admin/compliance/treaties?${qs}`);
  },

  compliancePaymentSupport: (params?: { provider?: string; supported?: boolean; country_code?: string; active_only?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.provider) qs.set('provider', params.provider);
    if (params?.supported !== undefined) qs.set('supported', params.supported ? '1' : '0');
    if (params?.country_code) qs.set('country_code', params.country_code);
    if (params?.active_only) qs.set('active_only', '1');
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<CompliancePaymentSupport>>(`/admin/compliance/payment-support?${qs}`);
  },

  complianceStateThresholds: (params?: { state_code?: string; tax_year?: number; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.state_code) qs.set('state_code', params.state_code);
    if (params?.tax_year) qs.set('tax_year', String(params.tax_year));
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceStateThreshold>>(`/admin/compliance/state-thresholds?${qs}`);
  },

  compliancePlatformFeeTaxRates: (params?: { state_code?: string; active_only?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.state_code) qs.set('state_code', params.state_code);
    if (params?.active_only) qs.set('active_only', '1');
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<CompliancePlatformFeeTaxRate>>(`/admin/compliance/platform-fee-tax-rates?${qs}`);
  },

  createPlatformFeeTaxRate: (body: {
    state_code: string;
    subdivision_code?: string | null;
    rate: number;
    source: string;
    source_url?: string | null;
    effective_date: string;
    sunset_date?: string | null;
    notes?: string | null;
  }) =>
    request<{ message: string; rate: CompliancePlatformFeeTaxRate }>('/admin/compliance/platform-fee-tax-rates', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updatePlatformFeeTaxRate: (id: number, body: {
    subdivision_code?: string | null;
    rate: number;
    source: string;
    source_url?: string | null;
    effective_date: string;
    sunset_date?: string | null;
    notes?: string | null;
  }) =>
    request<{ message: string; rate: CompliancePlatformFeeTaxRate }>(`/admin/compliance/platform-fee-tax-rates/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  sunsetPlatformFeeTaxRate: (id: number, body?: { sunset_date?: string }) =>
    request<{ message: string; rate: CompliancePlatformFeeTaxRate }>(`/admin/compliance/platform-fee-tax-rates/${id}/sunset`, {
      method: 'POST',
      body: JSON.stringify(body ?? {}),
    }),

  complianceContentRules: (params?: { country_code?: string; requires_age_verification?: boolean; requires_local_representative?: boolean; active_only?: boolean; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.country_code) qs.set('country_code', params.country_code);
    if (params?.requires_age_verification !== undefined) qs.set('requires_age_verification', params.requires_age_verification ? '1' : '0');
    if (params?.requires_local_representative !== undefined) qs.set('requires_local_representative', params.requires_local_representative ? '1' : '0');
    if (params?.active_only) qs.set('active_only', '1');
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceContentRule>>(`/admin/compliance/content-rules?${qs}`);
  },

  complianceCountries: () =>
    request<{ data: { code_alpha2: string; code_alpha3: string; name_common: string; region: string }[] }>('/admin/compliance/countries'),

  complianceSources: () =>
    request<{ data: ComplianceSource[] }>('/admin/compliance/sources'),

  complianceJobRuns: (page = 1) =>
    request<{ data: ComplianceJobRun[] }>(`/admin/compliance/job-runs?page=${page}`),

  complianceAuditLog: (params?: { table_name?: string; field?: string; q?: string; page?: number }) => {
    const qs = new URLSearchParams();
    if (params?.table_name) qs.set('table_name', params.table_name);
    if (params?.field) qs.set('field', params.field);
    if (params?.q) qs.set('q', params.q);
    if (params?.page) qs.set('page', String(params.page));
    return request<PaginatedResponse<ComplianceAuditEntry>>(`/admin/compliance/audit-log?${qs}`);
  },
};
