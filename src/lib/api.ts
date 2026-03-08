import type {
  User,
  PublicUser,
  Summon,
  SummonName,
  NotificationSettings,
  UserNotification,
  NotificationPage,
  Pot,
  PotVotive,
  PotCompletion,
  PotHistory,
  SummonClaim,
  PaginatedResponse,
  VotivePage,
  CashBalance,
  PaymentMethod,
  PotStatus,
  RemoveVotiveResult,
  DeletePaymentMethodResult,
  CouncilMember,
  CouncilPage,
  AdminSummonClaim,
  AdminPotCompletion,
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
    const error: ApiError = { status: res.status, message: body.message ?? res.statusText };
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
    const json = await res.json().catch(() => ({}));
    const error: ApiError = { status: res.status, message: (json as { message?: string }).message ?? res.statusText };
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

// Summons
export const summons = {
  list: (params?: {
    q?: string;
    page?: number;
    status?: 'answered' | 'unanswered';
    sort?: 'newest' | 'most_summoned' | 'most_completed';
  }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Summon>>(`/summons${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Summon }>(`/summons/${id}`),

  create: (data: Partial<Summon>) =>
    request<{ data: Summon }>('/summons', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Summon>) =>
    request<{ data: Summon }>(`/summons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  claim: (summon_id: number, contact_info: string) =>
    request<{ data: SummonClaim }>('/summon-claims', {
      method: 'POST',
      body: JSON.stringify({ summon_id, contact_info }),
    }),
};

// Summon Names (aliases)
export const summonNames = {
  list: (summonId: number) =>
    request<{ data: SummonName[] }>(`/summons/${summonId}/names`),

  create: (summonId: number, name: string) =>
    request<{ data: SummonName }>(`/summons/${summonId}/names`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  delete: (summonId: number, nameId: number) =>
    request<void>(`/summons/${summonId}/names/${nameId}`, { method: 'DELETE' }),
};

// Pots
export const pots = {
  list: (params?: { summon_id?: number; status?: PotStatus; page?: number }) => {
    const entries = Object.entries(params ?? {})
      .filter(([, v]) => v != null)
      .map(([k, v]) => [k, String(v)]) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Pot>>(`/pots${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Pot }>(`/pots/${id}`),

  create: (data: { title: string; description?: string; summon_id: number; initial_votive_amount?: number }) =>
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
  // Summon Claims
  listClaims: (status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending', page = 1) =>
    request<PaginatedResponse<AdminSummonClaim>>(`/admin/summon-claims?status=${status}&page=${page}`),

  reviewClaim: (claimId: number, data: { status: 'approved' | 'rejected'; council_notes?: string }) =>
    request<{ data: AdminSummonClaim }>(`/admin/summon-claims/${claimId}`, {
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
};
