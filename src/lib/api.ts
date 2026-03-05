import type {
  User,
  PublicUser,
  Summon,
  SummonName,
  Pot,
  PotBid,
  PotCompletion,
  SummonClaim,
  PaginatedResponse,
  CashBalance,
  PaymentMethod,
  PotStatus,
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
};

// Summons
export const summons = {
  list: (params?: { q?: string; page?: number }) => {
    const entries = Object.entries(params ?? {}).filter(([, v]) => v != null) as [string, string][];
    const qs = new URLSearchParams(entries).toString();
    return request<PaginatedResponse<Summon>>(`/summons${qs ? `?${qs}` : ''}`);
  },

  get: (id: number) => request<{ data: Summon }>(`/summons/${id}`),

  create: (data: Partial<Summon>) =>
    request<{ data: Summon }>('/summons', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<Summon>) =>
    request<{ data: Summon }>(`/summons/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  claim: (summon_id: number) =>
    request<{ data: SummonClaim }>('/summon-claims', {
      method: 'POST',
      body: JSON.stringify({ summon_id }),
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

  create: (data: { title: string; description?: string; summon_id: number }) =>
    request<{ data: Pot }>('/pots', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: number) => request(`/pots/${id}`, { method: 'DELETE' }),

  bid: (potId: number, amount: number) =>
    request<{ data: PotBid & { pot: { total_pledged: number } } }>(`/pots/${potId}/bids`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),

  removeBid: (potId: number, bidId: number) =>
    request(`/pots/${potId}/bids/${bidId}`, { method: 'DELETE' }),

  submitCompletion: (potId: number, submission_url: string, submission_notes?: string) =>
    request<{ data: PotCompletion }>(`/pots/${potId}/completion`, {
      method: 'POST',
      body: JSON.stringify({ submission_url, submission_notes }),
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
    request(`/billing/payment-methods/${id}`, { method: 'DELETE' }),
};
