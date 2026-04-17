import type {
  User,
  PublicUser,
  Creator,
  CreatorName,
  NotificationSettings,
  UserNotification,
  NotificationPage,
  Pot,
  PotVotive,
  PotCompletion,
  PotHistory,
  CreatorClaim,
  PaginatedResponse,
  VotivePage,
  CashBalance,
  PaymentMethod,
  PotStatus,
  RemoveVotiveResult,
  DeletePaymentMethodResult,
  CouncilMember,
  CouncilPage,
  AdminCreatorClaim,
  AdminPotCompletion,
  CreatorEarning,
  CreatorBalance,
  Comment,
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
      body: JSON.stringify({ name, email, password, password_confirmation }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => request('/auth/logout', { method: 'POST' }),

  me: () => request<{ data: User }>('/auth/me'),

  broke: () =>
    request<{ data: { revoked_count: number } }>('/auth/broke', { method: 'POST' }),

  deleteAccount: () => request('/auth/account', { method: 'DELETE' }),

  verifyEmail: (id: string, hash: string, expires: string, signature: string) =>
    request<{ message: string }>(
      `/auth/email/verify/${id}/${hash}?expires=${expires}&signature=${signature}`
    ),

  resendVerification: () =>
    request<{ message: string }>('/auth/email/resend', { method: 'POST' }),

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

// Pots
export const pots = {
  list: (params?: { creator_id?: number; status?: PotStatus; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Pot>>(`/pots${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Pot }>(`/pots/${id}`),

  create: (data: { title: string; description?: string; creator_id: number; initial_votive_amount?: number }) =>
    request<{ data: Pot }>('/pots', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: { title?: string; description?: string }) =>
    request<{ data: Pot }>(`/pots/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  votive: (potId: number, amount: number, expires_at?: string) =>
    request<{ data: PotVotive & { pot: { total_pledged: number } } }>(`/pots/${potId}/votives`, {
      method: 'POST',
      body: JSON.stringify({ amount, ...(expires_at ? { expires_at } : {}) }),
    }),

  removeVotive: (potId: number, votiveId: number) =>
    request<RemoveVotiveResult>(`/pots/${potId}/votives/${votiveId}`, { method: 'DELETE' }),

  submitCompletion: (potId: number, submission_url: string, submission_notes?: string) =>
    request<{ data: PotCompletion }>(`/pots/${potId}/completion`, {
      method: 'POST',
      body: JSON.stringify({ submission_url, submission_notes }),
    }),

  history: (potId: number) =>
    request<PotHistory>(`/pots/${potId}/history`),

  creatorRemove: (potId: number, reason: string) =>
    request<{ message: string }>(`/pots/${potId}/creator-remove`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
};

// Users
export const users = {
  get: (id: number) =>
    request<{ data: PublicUser }>(`/users/${id}`),

  update: (id: number, data: Partial<Pick<User, 'name' | 'profile_picture' | 'is_anonymous' | 'cover_processing_fees'>>) =>
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
  /** Paginated top-level comments for a pot. */
  list: (potId: number, page = 1) =>
    request<PaginatedResponse<Comment>>(`/pots/${potId}/comments?page=${page}`),

  /** All direct replies to a top-level comment (not paginated). */
  replies: (commentId: number) =>
    request<{ data: Comment[] }>(`/comments/${commentId}/replies`),

  /** Post a new top-level comment on a pot. */
  create: (potId: number, content: string) =>
    request<{ data: Comment }>(`/pots/${potId}/comments`, {
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

// Featured pots (public)
export const featuredPots = {
  list: () => request<{ data: Pot[] }>('/featured-pots'),
};

// Votives (authenticated user's own)
export const votives = {
  list: (params?: { sort?: 'date' | 'amount'; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<VotivePage>(`/auth/votives${qs ? `?${qs}` : ''}`);
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

  /** Immediately charge the authenticated user's full negative available_cash balance. */
  payNow: () =>
    request<{ message: string; charged: number }>('/billing/pay-now', { method: 'POST' }),
};

// Cash (creator-specific endpoints)
export const cash = {
  /** Wallet overview for the authenticated creator: confirmed balance + pending earnings. */
  creatorBalance: () =>
    request<CreatorBalance>('/cash/creator-balance'),

  /** Per-pot earnings breakdown for the authenticated creator. */
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

// Withdrawals — creator payout (creator/council only)
export const withdrawals = {
  /** Request a payout of `amount` dollars to the linked bank account. */
  request: (amount: number) =>
    request<{ data: import('./types').Withdrawal }>('/withdrawals', {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};

// Plaid — bank account connection (creator-only)
export const plaid = {
  /** Get a Plaid Link token to initialise the Link flow. */
  linkToken: () =>
    request<{ data: { link_token: string } }>('/payout/plaid/link-token', { method: 'POST' }),

  /** Exchange a public token returned by Plaid Link for stored credentials. */
  exchange: (publicToken: string) =>
    request<{ data: { item_id: string; account_id: string; linked: boolean } }>('/payout/plaid/exchange', {
      method: 'POST',
      body: JSON.stringify({ public_token: publicToken }),
    }),
};

// Overlord — logs
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
  // Creator Claims
  listClaims: (status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending', page = 1) =>
    request<PaginatedResponse<AdminCreatorClaim>>(`/admin/creator-claims?status=${status}&page=${page}`),

  reviewClaim: (claimId: number, data: { status: 'approved' | 'rejected'; council_notes?: string }) =>
    request<{ data: AdminCreatorClaim }>(`/admin/creator-claims/${claimId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Pot Completions
  listCompletions: (status: 'pending_review' | 'approved' | 'rejected' | 'all' = 'pending_review', page = 1) =>
    request<PaginatedResponse<AdminPotCompletion>>(`/admin/pot-completions?status=${status}&page=${page}`),

  reviewCompletion: (potId: number, data: { status: 'approved' | 'rejected'; council_notes?: string }) =>
    request<{ data: Pot }>(`/admin/pots/${potId}/completion`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Council Members
  listCouncil: (page = 1) =>
    request<PaginatedResponse<CouncilMember>>(`/admin/council?page=${page}`),

  // Featured Pots
  getFeaturedPots: () =>
    request<{ data: Array<{ position: number; pot: Pot | null; added_by: { id: number; name: string } | null; updated_at: string }> }>('/admin/featured-pots'),

  setFeaturedPots: (slots: Array<{ pot_id: number }>) =>
    request<{ data: Array<{ position: number; pot: Pot | null; added_by: { id: number; name: string } | null; updated_at: string }> }>('/admin/featured-pots', {
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
};
