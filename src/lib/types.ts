export type UserRole = 'mob' | 'summoned' | 'council';
export type PotStatus = 'open' | 'pending' | 'completed' | 'paid_out' | 'revoked';
export type PotType = 'direct';
export type SummonClaimStatus = 'pending' | 'approved' | 'rejected';
export type PotCompletionStatus = 'pending_review' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type SummonW9Status = 'initiated' | 'completed' | 'tin_matched' | 'tin_failed';

export interface SummonW9Record {
  id: number;
  status: SummonW9Status;
  qualifies: boolean;
  tin_matched: boolean;
  tin_failed: boolean;
  w9_url: string | null;
  w9_url_expires_at: string | null;
  completed_at: string | null;
  tin_matched_at: string | null;
}

export interface FormW9StatusResponse {
  tax_year: number;
  ytd_withdrawals: number;
  threshold: number;
  requires_w9: boolean;
  record: SummonW9Record | null;
}

export interface Withdrawal {
  id: number;
  summon_id: number;
  amount: number;
  status: WithdrawalStatus;
  plaid_transfer_id?: string | null;
  initiated_at?: string | null;
  created_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  pending_email?: string | null;
  email_verified_at?: string | null;
  phone_number?: string | null;
  phone_verified_at?: string | null;
  role: UserRole;
  profile_picture?: string;
  total_given?: number;
  open_votives_count?: number;
  cover_processing_fees?: boolean;
  is_anonymous?: boolean;
  is_overlord?: boolean;
  summon?: Summon;
}

export interface CouncilMember {
  id: number;
  user_id: number;
  user: { id: number; name: string; email: string };
  /** When the appointedBy relation is loaded, this is the appointing user object; otherwise null. */
  appointed_by: { id: number; name: string; email: string } | null;
  permissions: Record<string, boolean>;
  appointed_at: string;
}

export interface CouncilPage {
  data: CouncilMember[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface SummonName {
  id: number;
  summon_id: number;
  name: string;
  added_by_user_id?: number;
  created_at: string;
}

export interface Summon {
  id: number;
  user_id?: number;
  user?: { id: number; name: string };
  /** Herald of an unclaimed summon (has editing rights) */
  herald?: { id: number; name: string };
  herald_user_id?: number;
  herald_total_votive?: number;
  display_name: string;
  description?: string;
  profile_picture?: string;
  fan_name?: string;
  fan_name_plural?: string;
  youtube_handle?: string;
  twitter_handle?: string;
  tiktok_handle?: string;
  instagram_handle?: string;
  soundcloud_handle?: string;
  bandcamp_handle?: string;
  domain?: string;
  wikipedia_handle?: string;
  country_code?: string | null;
  rating?: number;
  /** Live-computed count of open pots */
  projects_open?: number;
  /** Live-computed count of paid-out pots */
  projects_finished?: number;
  /** Confirmed earnings: sum of creator credits where Stripe has collected */
  amount_earned?: number;
  /** Gross pledges on open/pending pots (no charge written yet) */
  total_votive_sum?: number;
  /** Gross votive amounts locked on completed pots, not yet charged via Stripe */
  pending_votive_total?: number;
  /** Whether the currently authenticated user can edit this summon */
  can_edit?: boolean;
  /** The authenticated user's own 24h-aged votive total across all pots for this summon */
  user_aged_votive_total?: number | null;
  /** True when the summon has a linked Plaid bank account */
  bank_connected?: boolean;
  claimed_at?: string;
  merged_into_summon_id?: number;
  summon_names?: SummonName[];
}

export interface Pot {
  id: number;
  title: string;
  description?: string;
  type: PotType;
  status: PotStatus;
  initiator_user_id: number;
  initiator?: User;
  summon_id: number;
  summon?: Summon;
  total_pledged: number;
  completed_at?: string;
  approved_at?: string;
  paid_out_at?: string;
  /** Sum of fan charges already collected via billing for this pot. */
  cleared_amount?: number;
  votives?: PotVotive[];
  completion?: PotCompletion;
}

export interface PotVotive {
  id: number;
  pot_id: number;
  user_id: number;
  user?: Pick<User, 'id' | 'name'>;
  amount: number;
  revoked_at?: string;
  revoke_reason?: string;
  expires_at?: string;
}

export interface PublicUserVotive {
  id: number;
  pot_id: number;
  pot?: Pick<Pot, 'id' | 'title' | 'status'>;
  amount: number;
  expires_at?: string;
  created_at: string;
}

export interface VotivePage {
  data: PublicUserVotive[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
  total_active_amount: number;
}

export interface DeletePaymentMethodResult {
  data: {
    revoked_count: number;
    revoked_amount: number;
  };
}

export interface PublicUser {
  id: number;
  name: string;
  profile_picture?: string;
  is_anonymous: boolean;
  created_at: string;
  votives: PublicUserVotive[];
  /** Server-computed sum of all active (unrevoked) votives. Null for anonymous users viewed by others. */
  total_votive_amount?: number;
}

export interface PotCompletion {
  id: number;
  pot_id: number;
  submission_url: string;
  submission_notes?: string;
  status: PotCompletionStatus;
  council_notes?: string;
  verified_at?: string;
}

export interface SummonClaim {
  id: number;
  user_id: number;
  summon_id: number;
  summon?: Pick<Summon, 'id' | 'display_name'>;
  status: SummonClaimStatus;
  council_notes?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  from: number;
  to: number;
  total: number;
  current_page: number;
  last_page: number;
  per_page: number;
}

// ── Admin types ─────────────────────────────────────────────────────────────

export interface AdminSummonClaim {
  id: number;
  user_id: number;
  user: { id: number; name: string; email: string };
  summon_id: number;
  summon: { id: number; display_name: string };
  contact_info: string;
  status: SummonClaimStatus;
  council_notes?: string | null;
  reviewed_by?: number | null;
  reviewer?: { id: number; name: string } | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AdminPotCompletion {
  id: number;
  pot_id: number;
  pot: {
    id: number;
    title: string;
    total_pledged: number;
    summon_id: number;
    status: PotStatus;
    summon?: { id: number; display_name: string } | null;
  };
  submitted_by_user_id: number;
  submitted_by: { id: number; name: string };
  submission_url: string;
  submission_notes?: string | null;
  status: PotCompletionStatus;
  council_notes?: string | null;
  reviewed_by?: number | null;
  reviewer?: { id: number; name: string } | null;
  reviewed_at?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface CashBalance {
  balance: number;
  available: PaginatedResponse<AvailableCash>;
}

export interface AvailableCash {
  id: number;
  amount: number;
  running_balance: number;
  description: string;
  pot?: Pick<Pot, 'id' | 'title'>;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface SummonBalance {
  /** Confirmed earnings already credited to the summon (billing_run_id IS NOT NULL) */
  available_balance: number;
  /** Locked fan charges not yet billed — net of fees, reflects actual creator payout */
  pending_earnings: number;
  available: PaginatedResponse<AvailableCash>;
}

export interface SummonEarning {
  pot: Pick<Pot, 'id' | 'title'> & { status: PotStatus };
  /** Confirmed available_cash credits already received (net of fees) */
  earned: number;
  /** Gross fan amounts not yet billed — actual credit will be lower after fees */
  incoming: number;
  /** earned + incoming */
  total: number;
}

export interface NotificationSettings {
  // Email preferences
  summon_answered: boolean;
  pot_pending_completion: boolean;
  pot_confirmed_completed: boolean;
  votive_confirmation: boolean;
  votive_expired: boolean;
  pot_updated: boolean;
  monthly_votive_preview: boolean;
  monthly_votive_receipt: boolean;
  herald_status_lost: boolean;
  // In-app preferences
  in_app_summon_answered: boolean;
  in_app_pot_pending_completion: boolean;
  in_app_pot_confirmed_completed: boolean;
  in_app_votive_confirmation: boolean;
  in_app_votive_expired: boolean;
  in_app_pot_updated: boolean;
  in_app_monthly_votive_preview: boolean;
  in_app_monthly_votive_receipt: boolean;
  in_app_herald_status_lost: boolean;
  // SMS preferences
  sms_summon_answered: boolean;
  sms_pot_pending_completion: boolean;
  sms_pot_confirmed_completed: boolean;
  sms_votive_confirmation: boolean;
  sms_votive_expired: boolean;
  sms_pot_updated: boolean;
  sms_monthly_votive_preview: boolean;
  sms_monthly_votive_receipt: boolean;
  sms_herald_status_lost: boolean;
}

export interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body?: string | null;
  link?: string | null;
  read_at?: string | null;
  created_at: string;
}

export interface NotificationPage {
  data: UserNotification[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface RemoveVotiveResult {
  pot_deleted: boolean;
  new_initiator_id: number | null;
}

export interface Comment {
  id: number;
  user: {
    id: number;
    name: string;
    profile_picture?: string;
    is_anonymous: boolean;
    role: UserRole;
  } | null;
  content: string;        // '[deleted]' when deleted === true
  deleted: boolean;
  parent_id: number | null;
  reply_count: number;
  likes_count: number;
  dislikes_count: number;
  user_reaction: 'like' | 'dislike' | null;
  is_edited: boolean;
  edited_at: string | null;
  created_at: string;
  updated_at: string;
}

export type PotHistoryEventType =
  | 'created'
  | 'votive_added'
  | 'votive_revoked'
  | 'details_edited'
  | 'privilege_transfer'
  | 'pending'
  | 'completed';

export interface PotHistoryEvent {
  type: PotHistoryEventType;
  /** ISO 8601 timestamp */
  at: string;
  user?: { id: number; name: string } | null;
  amount?: number | null;
  field?: string | null;
  old_value?: string | null;
  meta?: Record<string, unknown> | null;
  votive_id?: number | null;
  running_total: number;
  snapshot: { title: string; description: string | null };
}

export interface PotHistory {
  events: PotHistoryEvent[];
  current: { title: string; description: string | null; total_pledged: number };
}

// ── Admin: User & Summon search ─────────────────────────────────────────────

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_anonymous: boolean;
  email_verified_at: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  created_at: string;
  deleted_at: string | null;
  summon: {
    id: number;
    display_name: string;
    claimed: boolean;
    claimed_at: string | null;
    amount_earned: number;
    projects_open: number;
    projects_finished: number;
    w9: {
      id: number;
      status: SummonW9Status;
      completed_at: string | null;
      tin_matched_at: string | null;
    } | null;
  } | null;
}

export interface AdminSummon {
  id: number;
  display_name: string;
  claimed: boolean;
  claimed_at: string | null;
  user: { id: number; name: string; email: string } | null;
  w9_status: SummonW9Status | null;
  amount_earned: number;
  projects_open: number;
  projects_finished: number;
  created_at: string;
}
