export type UserRole = 'fan' | 'creator' | 'council';

/**
 * A handle platform slug. Open string union — every entry in the backend's
 * config/platforms.php catalogue (mirrored in src/lib/platforms.ts) is valid,
 * plus the special `'other'` for free-form URLs. Codepaths that need an
 * exhaustive list (icons, default labels, etc.) should import
 * `CURATED_PLATFORMS` / `KNOWN_PLATFORMS` from `@/lib/platforms` rather
 * than narrow this type.
 */
export type HandlePlatform = string;

/** Curated slugs that have first-class UI support — useful for narrow type guards. */
export type KnownHandlePlatform =
  | 'twitter' | 'youtube' | 'instagram' | 'tiktok' | 'twitch' | 'bluesky' | 'kick' | 'other';

export type HandleStatus = 'unverified' | 'verified' | 'disputed' | 'retired';

export interface UserHandle {
  id: number;
  platform: HandlePlatform;
  username: string;
  status: HandleStatus;
  verified_at: string | null;
  created_at: string;
}

/** Shape returned by GET /auth/handles and POST /handles */
export interface HandleClaim {
  claim_id: number;
  status: 'unverified' | 'verified';
  /** 'oauth' = verified via OAuth; 'admin' = submitted for admin review or admin-approved; null = not yet submitted */
  verification_method: 'oauth' | 'admin' | null;
  /** Message the creator left for admins when requesting review. */
  contact_message: string | null;
  verified_at: string | null;
  handle: {
    id: number;
    platform: HandlePlatform;
    username: string;
    /** Canonical profile URL — built from the platform template, or the
     *  pasted URL itself for 'other' handles. Null for legacy rows. */
    profile_url?: string | null;
    status: string;
  };
  created_at: string;
}

/** Shape returned by GET /handles/search */
export interface HandleSearchResult {
  type: 'user' | 'handle';
  display_name: string;
  platform: HandlePlatform;
  username: string;
  /** Always null when verified = false. */
  avatar_url: string | null;
  /** Outbound profile link — null when the handle row has none stored. */
  profile_url: string | null;
  user_id: number | null;
  handle_id: number;
  verified: boolean;
  pending_bounty_count: number;
}

export type BountyStatus = 'open' | 'pending' | 'completed' | 'paid_out' | 'revoked';
export type BountyType = 'direct';
export type CreatorClaimStatus = 'pending' | 'approved' | 'rejected';
export type BountyCompletionStatus = 'pending_review' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed';
export type CreatorW9Status = 'initiated' | 'completed' | 'tin_matched' | 'tin_failed';

export interface CreatorW9Record {
  id: number;
  status: CreatorW9Status;
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
  record: CreatorW9Record | null;
}

export type CreatorW8BENStatus = 'initiated' | 'completed' | 'invalid';

export interface CreatorW8BENRecord {
  id: number;
  status: CreatorW8BENStatus;
  qualifies: boolean;
  w8ben_url: string | null;
  w8ben_url_expires_at: string | null;
  completed_at: string | null;
}

export interface FormW8BENStatusResponse {
  tax_year: number;
  ytd_withdrawals: number;
  threshold: number;
  requires_w8ben: boolean;
  record: CreatorW8BENRecord | null;
}

export interface Withdrawal {
  id: number;
  creator_id: number;
  amount: number;
  status: WithdrawalStatus;
  stripe_payout_id?: string | null;
  initiated_at?: string | null;
  created_at: string;
}

export interface User {
  id: number;
  display_name: string;
  /** Creator URL slug — `artypot.com/{slug}`. Null until creator mode is enabled. */
  slug?: string | null;
  /** ISO timestamp of the most recent slug change. Null if slug has never been set. */
  slug_changed_at?: string | null;
  email: string | null; // null for OAuth-only users (e.g. signed up via Reddit)
  pending_email?: string | null;
  email_verified_at?: string | null;
  phone_number?: string | null;
  phone_verified_at?: string | null;
  role: UserRole;
  profile_picture?: string;
  total_given?: number;
  open_pledges_count?: number;
  is_anonymous?: boolean;
  /** ISO-3166-1 alpha-2 country code, e.g. "US". Nullable. */
  country_code?: string | null;
  /** State/province code (required when country_code = "US"). Nullable. */
  state_code?: string | null;
  is_overlord?: boolean;
  /** Server-computed: country set (+ state for US). Included in /me response only. */
  location_complete?: boolean;
  /** Server-computed: user has at least one council-verified handle. Included in /me response only. */
  has_verified_handle?: boolean;
  /** ISO timestamp of last failed billing charge. Null when no recent failure. */
  payment_failed_at?: string | null;
  /** ISO timestamp of when the post-failure grace period expires. Computed by backend. */
  payment_grace_expires_at?: string | null;
  creator?: Creator;
}

export interface CouncilMember {
  id: number;
  display_name: string;
  email: string;
  council_permissions: Record<string, boolean>;
  council_appointed_at: string;
  appointed_by: { id: number; display_name: string; email: string } | null;
}

export interface CouncilPage {
  data: CouncilMember[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export interface CreatorName {
  id: number;
  creator_id: number;
  name: string;
  added_by_user_id?: number;
  created_at: string;
}

export interface Creator {
  id: number;
  /** Public URL slug — `artypot.com/{slug}`. Present on full Creator objects; may be absent on embedded/minimal selects. */
  slug?: string | null;
  user_id?: number;
  user?: { id: number; display_name: string };
  /** Herald of an unclaimed creator (has editing rights) */
  herald?: { id: number; display_name: string };
  herald_user_id?: number;
  herald_total_pledge?: number;
  display_name: string;
  description?: string;
  profile_picture?: string;
  fan_name?: string;
  fan_name_plural?: string;
  youtube_handle?: string;
  twitter_handle?: string;
  tiktok_handle?: string;
  instagram_handle?: string;
  soundcloud_url?: string;
  bandcamp_url?: string;
  domain?: string;
  wikipedia_url?: string;
  country_code?: string | null;
  state_code?: string | null;
  rating?: number;
  /** Live-computed count of open bounties */
  projects_open?: number;
  /** Live-computed count of paid-out bounties */
  projects_finished?: number;
  /** Confirmed earnings: sum of creator credits where Stripe has collected */
  amount_earned?: number;
  /** Gross pledges on open/pending bounties (no charge written yet) */
  total_pledge_sum?: number;
  /** Gross pledge amounts locked on completed bounties, not yet charged via Stripe */
  pending_pledge_total?: number;
  /** Whether the currently authenticated user can edit this creator */
  can_edit?: boolean;
  /** The authenticated user's own 24h-aged pledge total across all bounties for this creator */
  user_aged_pledge_total?: number | null;
  /** True when the creator has a Stripe Connect account (may still need onboarding) */
  bank_connected?: boolean;
  /** True when Stripe has placed a hold on payouts requiring additional KYC. */
  payout_hold?: boolean;
  /** List of Stripe requirement field names causing the hold. */
  payout_hold_reason?: string[] | null;
  /** Timestamp of TOS agreement, stamped when the user activates creator mode. */
  creator_tos_agreed_at?: string | null;
  claimed_at?: string;
  merged_into_creator_id?: number;
  creator_names?: CreatorName[];
}

export interface Bounty {
  id: number;
  title: string;
  description?: string;
  type: BountyType;
  status: BountyStatus;
  initiator_user_id: number;
  initiator?: User;
  owner_user_id?: number | null;
  /** The user who owns this bounty (i.e. the creator). Serialised from ownerUser relation. */
  owner_user?: Pick<User, 'id' | 'display_name' | 'profile_picture' | 'slug'>;
  total_pledged: number;
  /** Sum of pledges from fans with an active payment method. Appended by the backend on show(). */
  solid_total?: number;
  /** New targeting fields */
  target_handle_id?: number | null;
  target_user_id?: number | null;
  /** Backend-appended. Null when target is unverified. */
  avatar_url?: string | null;
  target_display_name?: string | null;
  target_platform?: string | null;
  target_username?: string | null;
  completed_at?: string;
  approved_at?: string;
  paid_out_at?: string;
  /** Sum of fan charges already collected via billing for this bounty. */
  cleared_amount?: number;
  pledges?: BountyPledge[];
  completion?: BountyCompletion;
}

export interface BountyPledge {
  id: number;
  bounty_id: number;
  user_id: number;
  user?: Pick<User, 'id' | 'display_name' | 'profile_picture'>;
  amount: number;
  revoked_at?: string;
  revoke_reason?: string;
  expires_at?: string;
}

export interface PublicUserPledge {
  id: number;
  bounty_id: number;
  bounty?: Pick<Bounty, 'id' | 'title' | 'status'>;
  amount: number;
  expires_at?: string;
  created_at: string;
}

export interface PledgePage {
  data: PublicUserPledge[];
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
  display_name: string;
  /** Creator URL slug — present when the user has creator mode enabled. */
  slug?: string | null;
  profile_picture?: string;
  is_anonymous: boolean;
  created_at: string;
  pledges: PublicUserPledge[];
  /** Server-computed sum of all active (unrevoked) pledges. Null for anonymous users viewed by others. */
  total_pledge_amount?: number;
}

export interface BountyCompletion {
  id: number;
  bounty_id: number;
  submission_url: string;
  submission_notes?: string;
  status: BountyCompletionStatus;
  council_notes?: string;
  verified_at?: string;
}

export interface CreatorClaim {
  id: number;
  user_id: number;
  creator_id: number;
  creator?: Pick<Creator, 'id' | 'display_name'>;
  status: CreatorClaimStatus;
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

export type HandleVerificationApplicationStatus = 'pending' | 'approved' | 'denied' | 'retracted';

/**
 * Shape returned by GET /admin/handles (pending queue) and /admin/handles/history (decided).
 * Each row is one submission for review — full audit trail.
 */
export interface HandleVerificationApplicationRow {
  id: number;
  handle_claim_id: number;
  status: HandleVerificationApplicationStatus;
  contact_message: string;
  /** Admin who approved/denied this application; null while still pending. */
  reviewed_by: number | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  created_at: string;
  /** The creator who submitted the application. */
  user: { id: number; display_name: string; email: string };
  /** The admin who decided; null while pending. */
  reviewer?: { id: number; display_name: string; email: string } | null;
  /** The handle this application is for, plus its current claim status. */
  claim: {
    id: number;
    status: string;
    handle: { id: number; platform: HandlePlatform; username: string; status: HandleStatus };
  };
}

export interface AdminCreatorClaim {
  id: number;
  user_id: number;
  user: { id: number; display_name: string; email: string };
  creator_id: number;
  creator: { id: number; display_name: string; slug?: string | null };
  contact_info: string;
  status: CreatorClaimStatus;
  council_notes?: string | null;
  reviewed_by?: number | null;
  reviewer?: { id: number; display_name: string } | null;
  reviewed_at?: string | null;
  created_at: string;
}

export interface AdminBountyCompletion {
  id: number;
  bounty_id: number;
  bounty: {
    id: number;
    title: string;
    total_pledged: number;
    creator_id: number;
    status: BountyStatus;
    creator?: { id: number; display_name: string; slug?: string | null } | null;
  };
  submitted_by_user_id: number;
  submitted_by: { id: number; display_name: string };
  submission_url: string;
  submission_notes?: string | null;
  status: BountyCompletionStatus;
  council_notes?: string | null;
  reviewed_by?: number | null;
  reviewer?: { id: number; display_name: string } | null;
  reviewed_at?: string | null;
  verified_at?: string | null;
  created_at: string;
}

export interface CashBalance {
  balance: number;
  available: PaginatedResponse<CashLedgerEntry>;
}

export interface CashLedgerEntry {
  id: number;
  entity_type: 'user' | 'creator';
  entity_id: number;
  amount: number;
  running_balance: number;
  available_after: string | null;
  description: string;
  bounty?: Pick<Bounty, 'id' | 'title'>;
  fan_payment_id?: number | null;
  creator_withdrawal_id?: number | null;
  external_payout_id?: number | null;
  external_payout?: {
    id: number;
    method: ExternalPayoutMethod;
    external_reference_id: string | null;
    sent_at: string;
  } | null;
}

// ── External Payouts (admin) ────────────────────────────────────────────────

export type ExternalPayoutMethod = 'wise' | 'paypal' | 'wire' | 'check' | 'other';

export interface ExternalPayout {
  id: number;
  creator_id: number;
  creator?: { id: number; display_name: string; email?: string };
  amount: number;
  method: ExternalPayoutMethod;
  external_reference_id: string | null;
  sent_at: string;          // YYYY-MM-DD
  notes: string | null;
  receipt_path: string | null;
  recorded_by_admin_id: number;
  recorded_by?: { id: number; display_name: string };
  reversed_at: string | null;
  reversed_by_admin_id: number | null;
  reversed_by?: { id: number; display_name: string };
  reversal_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreatorSearchResult {
  id: number;
  display_name: string;
  email: string | null;
  country_code: string | null;
  available_balance: number;
}

export interface PaymentMethod {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  /** True if the card has been used, added, or confirmed within the active window. */
  is_active: boolean;
  /** ISO timestamp of the most recent activity (added, charged, or confirmed). */
  last_active_at: string | null;
}

export interface CreatorBalance {
  /** All pledges on open bounties — no charge locked yet (solid + soft) */
  open_pledges: number;
  /** Subset of open_pledges from fans with an active payment method */
  solid_open_pledges: number;
  /** Pledges on bounties awaiting Council approval */
  pending_verification: number;
  /** Gross fan obligations locked on approved bounties, not yet billed */
  pending_payment: number;
  /** Stripe-collected funds within the 7-day hold period */
  clearing: number;
  /** Withdrawable balance (hold period elapsed) */
  available_balance: number;
  /** Total ever transferred to the creator's bank */
  paid_out: number;
  available: PaginatedResponse<CashLedgerEntry>;
}

export interface CreatorEarning {
  bounty: Pick<Bounty, 'id' | 'title'> & { status: BountyStatus };
  /** Confirmed available_cash credits already received (net of fees) */
  earned: number;
  /** Gross fan amounts not yet billed — actual credit will be lower after fees */
  incoming: number;
  /** earned + incoming */
  total: number;
}

export interface NotificationSettings {
  // Email preferences
  creator_answered: boolean;
  bounty_pending_completion: boolean;
  bounty_confirmed_completed: boolean;
  pledge_confirmation: boolean;
  pledge_expired: boolean;
  bounty_updated: boolean;
  monthly_pledge_preview: boolean;
  monthly_pledge_receipt: boolean;
  herald_status_lost: boolean;
  // In-app preferences
  in_app_creator_answered: boolean;
  in_app_bounty_pending_completion: boolean;
  in_app_bounty_confirmed_completed: boolean;
  in_app_pledge_confirmation: boolean;
  in_app_pledge_expired: boolean;
  in_app_bounty_updated: boolean;
  in_app_monthly_pledge_preview: boolean;
  in_app_monthly_pledge_receipt: boolean;
  in_app_herald_status_lost: boolean;
  // SMS preferences
  sms_creator_answered: boolean;
  sms_bounty_pending_completion: boolean;
  sms_bounty_confirmed_completed: boolean;
  sms_pledge_confirmation: boolean;
  sms_pledge_expired: boolean;
  sms_bounty_updated: boolean;
  sms_monthly_pledge_preview: boolean;
  sms_monthly_pledge_receipt: boolean;
  sms_herald_status_lost: boolean;
  // Payment-action-required (3DS / SCA)
  payment_action_required: boolean;
  in_app_payment_action_required: boolean;
  sms_payment_action_required: boolean;
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

export interface Nudge {
  type: string;
  title: string;
  body: string;
  link: string | null;
  dismissable: boolean;
}

export interface RemovePledgeResult {
  bounty_deleted: boolean;
  new_initiator_id: number | null;
}

export interface Comment {
  id: number;
  user: {
    id: number;
    name: string;
    display_name: string;
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

export type BountyHistoryEventType =
  | 'created'
  | 'pledge_added'
  | 'pledge_revoked'
  | 'details_edited'
  | 'privilege_transfer'
  | 'pending'
  | 'completed';

export interface BountyHistoryEvent {
  type: BountyHistoryEventType;
  /** ISO 8601 timestamp */
  at: string;
  user?: { id: number; display_name: string } | null;
  amount?: number | null;
  field?: string | null;
  old_value?: string | null;
  meta?: Record<string, unknown> | null;
  pledge_id?: number | null;
  running_total: number;
  snapshot: { title: string; description: string | null };
}

export interface BountyHistory {
  events: BountyHistoryEvent[];
  current: { title: string; description: string | null; total_pledged: number };
}

// ── Admin: User & Creator search ─────────────────────────────────────────────

export interface AdminUser {
  id: number;
  display_name: string;
  email: string;
  slug?: string | null;
  role: UserRole;
  is_anonymous: boolean;
  email_verified_at: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  created_at: string;
  deleted_at: string | null;
  creator: {
    id: number;
    display_name: string;
    claimed: boolean;
    claimed_at: string | null;
    amount_earned: number;
    projects_open: number;
    projects_finished: number;
    w9: {
      id: number;
      status: CreatorW9Status;
      completed_at: string | null;
      tin_matched_at: string | null;
    } | null;
  } | null;
}

export interface AdminCreator {
  id: number;
  display_name: string;
  /** Public URL slug (artypot.com/{slug}); null if creator has not picked one yet. */
  slug?: string | null;
  claimed: boolean;
  claimed_at: string | null;
  user: { id: number; display_name: string; email: string } | null;
  w9_status: CreatorW9Status | null;
  amount_earned: number;
  projects_open: number;
  projects_finished: number;
  created_at: string;
}
