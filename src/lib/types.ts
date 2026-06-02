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
  /** True only while an application is awaiting an admin decision. Flips back
   *  to false once approved/denied/retracted, regardless of verification_method. */
  pending_review: boolean;
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
  open_backings_count?: number;
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
  /** Default backing expiry — number of units (e.g. 39) prefilled on the bounty creation form. */
  default_expiry_value?: number;
  /** Unit for default backing expiry: 'day' | 'week' | 'month' | 'year'. */
  default_expiry_unit?: string;
  /** Default backing amount prefilled in the backing form. Null → frontend env fallback. */
  default_backing_amount?: number | null;
  /** Public bio shown on the creator profile. */
  bio?: string | null;
  /** Creator-set noun for their fans (singular), e.g. "patron". */
  fan_name?: string | null;
  /** Creator-set plural noun for their fans, e.g. "patrons". */
  fan_name_plural?: string | null;
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

// ── Unified search (GET /v1/search) ────────────────────────────────────────

export interface SearchMatchReason {
  /** People: 'exact' | 'handle' | 'display_name' | 'alias'. Bounties: 'title' | 'description' | 'creator_name'. */
  kind: string;
  /** People match value, e.g. "@lordemusic" or an alias. */
  value?: string | null;
  /** Bounty description snippet with the matched term wrapped in <mark> (sanitized before render). */
  snippet?: string | null;
}

export interface SearchPerson {
  type: 'creator' | 'unverified_handle';
  id: string;
  display_name: string;
  avatar_url: string | null;
  verified_handle_count: number;
  open_bounty_count: number;
  total_backed_open: number;
  match_reason: SearchMatchReason | null;
  url: string | null;
}

export interface SearchBountyResult {
  id: string;
  title: string;
  creator: { id: string | null; display_name: string | null; url: string | null };
  amount_backed: number;
  status: string;
  match_reason: SearchMatchReason | null;
  url: string;
}

export interface SearchResponse {
  query: string;
  people: SearchPerson[];
  bounties: SearchBountyResult[];
}

export interface Creator {
  id: number;
  /** Public URL slug — `artypot.com/{slug}`. Present on full Creator objects; may be absent on embedded/minimal selects. */
  slug?: string | null;
  user_id?: number;
  user?: { id: number; display_name: string };
  display_name: string;
  description?: string;
  bio?: string | null;
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
  /** Gross backings on open/pending bounties (no charge written yet) */
  total_backing_sum?: number;
  /** Gross backing amounts locked on completed bounties, not yet charged via Stripe */
  pending_backing_total?: number;
  /** Whether the currently authenticated user can edit this creator */
  can_edit?: boolean;
  /** The authenticated user's own 24h-aged backing total across all bounties for this creator */
  user_aged_backing_total?: number | null;
  /** True when the creator has a Stripe Connect account (may still need onboarding) */
  bank_connected?: boolean;
  /** True when Stripe has placed a hold on payouts requiring additional KYC. */
  payout_hold?: boolean;
  /** List of Stripe requirement field names causing the hold. */
  payout_hold_reason?: string[] | null;
  /**
   * Country payment category derived from the creator's location.
   * 1 = Stripe Global Payouts supported (low minimum).
   * 2 = Not Stripe-supported, not sanctioned (higher minimum, manual payout).
   * 3 = Comprehensive sanction — payouts blocked, money features hidden.
   * Null when location is not yet set.
   */
  payout_category?: 1 | 2 | 3 | null;
  /** Minimum withdrawal amount in dollars for this creator's country. Null when blocked (category 3) or location unknown. */
  payout_minimum?: number | null;
  /** Timestamp of TOS agreement, stamped when the user activates creator mode. */
  creator_tos_agreed_at?: string | null;
  verified_at?: string;
  merged_into_creator_id?: number;
}

export interface Bounty {
  id: number;
  title: string;
  description?: string;
  /**
   * Fan-supplied human name for the person this bounty targets.
   * Only populated when the handle has no verified owner (owner_user_id is null).
   * When owner_user_id is set, owner_user.display_name is used for display instead.
   */
  display_name?: string | null;
  type: BountyType;
  status: BountyStatus;
  initiator_user_id: number;
  initiator?: User;
  owner_user_id?: number | null;
  /** The user who owns this bounty (i.e. the creator). Serialised from ownerUser relation. */
  owner_user?: Pick<User, 'id' | 'display_name' | 'profile_picture' | 'slug'> & {
    fan_name?: string | null;
    fan_name_plural?: string | null;
  };
  total_backed: number;
  /** Sum of backings from fans with an active payment method. Appended by the backend on show(). */
  solid_total?: number;
  target_handle_id?: number | null;
  target_user_id?: number | null;
  /** Eager-loaded handle record. Present when the bounty targets a platform handle. */
  target_handle?: { id: number; platform: string; username: string; status: string } | null;
  /** Backend-appended profile picture of the owner user. Null for owner-less bounties. */
  avatar_url?: string | null;
  completed_at?: string;
  approved_at?: string;
  paid_out_at?: string;
  /** Sum of fan charges already collected via billing for this bounty. */
  cleared_amount?: number;
  backings?: BountyBacking[];
  completion?: BountyCompletion;
}

export interface BountyBacking {
  id: number;
  bounty_id: number;
  user_id: number;
  user?: Pick<User, 'id' | 'display_name' | 'profile_picture'>;
  amount: number;
  revoked_at?: string;
  revoke_reason?: string;
  expires_at?: string;
}

export interface PublicUserBacking {
  id: number;
  bounty_id: number;
  bounty?: Pick<Bounty, 'id' | 'title' | 'status'>;
  amount: number;
  expires_at?: string;
  created_at: string;
}

export interface BackingPage {
  data: PublicUserBacking[];
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
  backings: PublicUserBacking[];
  /** Server-computed sum of all active (unrevoked) backings. Null for anonymous users viewed by others. */
  total_backing_amount?: number;
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
    total_backed: number;
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
  broke_cooldown: { ends_at: string; started_at: string } | null;
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
  /** True if the card has no invalidation stamp AND its expiry date is in the future. */
  is_valid: boolean;
  /** ISO timestamp of when validity was lost. Null while still valid. */
  invalidated_at: string | null;
  /**
   * Why the card was invalidated. One of:
   *   'expired' | 'detached_at_stripe' | 'replaced_by_updater' | 'billing_failure'
   * Null while is_valid is true.
   */
  invalidation_reason: 'expired' | 'detached_at_stripe' | 'replaced_by_updater' | 'billing_failure' | null;
}

export interface CreatorBalance {
  /** All backings on open bounties — no charge locked yet (solid + soft) */
  open_backings: number;
  /** Subset of open_backings from fans with an active payment method */
  solid_open_backings: number;
  /** Backings on bounties awaiting Council approval */
  pending_verification: number;
  /** Gross fan obligations locked on approved bounties, not yet billed */
  pending_payment: number;
  /** Subset of pending_payment from fans with an active payment method */
  solid_pending_payment: number;
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
  // ── Email preferences (no prefix) ────────────────────────────────────────
  creator_verified: boolean;
  bounty_pending_review: boolean;
  bounty_confirmed: boolean;
  backing_confirmed: boolean;
  backing_expired: boolean;
  billing_preview: boolean;
  billing_receipt: boolean;
  bounty_activity: boolean;
  creator_activity: boolean;
  comment_reply: boolean;
  // ── Creator-side email preferences ───────────────────────────────────────
  creator_new_bounty: boolean;
  creator_bounty_verified: boolean;
  // creator_bounty_rejected: mandatory ON — no column
  // ── SMS preferences (sms_ prefix) ────────────────────────────────────────
  sms_creator_verified: boolean;
  sms_bounty_pending_review: boolean;
  sms_bounty_confirmed: boolean;
  sms_backing_confirmed: boolean;
  sms_backing_expired: boolean;
  sms_billing_preview: boolean;
  sms_billing_receipt: boolean;
  sms_bounty_activity: boolean;
  sms_creator_activity: boolean;
  sms_comment_reply: boolean;
  sms_creator_new_bounty: boolean;
  sms_creator_bounty_verified: boolean;
  // ── Bell preferences (in_app_ prefix) ────────────────────────────────────
  // Note: backing_confirmed and billing_preview have no bell column (mandatory OFF).
  // Note: account_management and creator_bounty_rejected have no columns (mandatory ON).
  in_app_creator_verified: boolean;
  in_app_bounty_pending_review: boolean;
  in_app_bounty_confirmed: boolean;
  in_app_backing_expired: boolean;
  in_app_billing_receipt: boolean;
  in_app_bounty_activity: boolean;
  in_app_creator_activity: boolean;
  in_app_comment_reply: boolean;
  in_app_creator_new_bounty: boolean;
  in_app_creator_bounty_verified: boolean;
  // ── Master channel toggles ────────────────────────────────────────────────
  email_master: boolean;
  sms_master: boolean;
  in_app_master: boolean;
}

/**
 * Default notification preference values.
 *
 * IMPORTANT: Keep in sync with NotificationSettings::DEFAULTS in
 * artypot-api/app/Models/NotificationSettings.php — update both together
 * whenever a notification type is added or a default changes.
 */
export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  creator_verified: true,      sms_creator_verified: true,      in_app_creator_verified: true,
  bounty_pending_review: true, sms_bounty_pending_review: true, in_app_bounty_pending_review: true,
  bounty_confirmed: false,     sms_bounty_confirmed: false,     in_app_bounty_confirmed: false,
  backing_confirmed: false,    sms_backing_confirmed: false,
  backing_expired: false,      sms_backing_expired: false,      in_app_backing_expired: false,
  billing_preview: false,      sms_billing_preview: false,
  billing_receipt: true,       sms_billing_receipt: false,      in_app_billing_receipt: true,
  bounty_activity: false,         sms_bounty_activity: false,         in_app_bounty_activity: true,
  creator_activity: false,        sms_creator_activity: false,        in_app_creator_activity: true,
  comment_reply: false,           sms_comment_reply: false,           in_app_comment_reply: true,
  creator_new_bounty: false,      sms_creator_new_bounty: false,      in_app_creator_new_bounty: false,
  creator_bounty_verified: false, sms_creator_bounty_verified: true,  in_app_creator_bounty_verified: true,
  email_master: true,
  sms_master: true,
  in_app_master: true,
};

/**
 * Notification types that are always sent on all channels (mandatory ON).
 * These show as a locked indicator in the UI — cannot be toggled.
 *
 * IMPORTANT: Keep in sync with NotificationSettings::MANDATORY_ON in
 * artypot-api/app/Models/NotificationSettings.php — update both together.
 */
export const MANDATORY_ON_TYPES = ['account_management', 'creator_bounty_rejected'] as const;

/**
 * Notification types whose bell channel is permanently OFF.
 * These show as an inert dash in the bell column — no toggle rendered.
 *
 * IMPORTANT: Keep in sync with NotificationSettings::MANDATORY_OFF_BELL in
 * artypot-api/app/Models/NotificationSettings.php — update both together.
 */
export const MANDATORY_OFF_BELL = ['backing_confirmed', 'billing_preview'] as const;

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

export interface RemoveBackingResult {
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
  | 'backing_added'
  | 'backing_updated'
  | 'backing_revoked'
  | 'details_edited'
  | 'privilege_transfer'
  | 'creator_assigned'
  | 'pending'
  | 'completed';

export interface BountyHistoryEvent {
  type: BountyHistoryEventType;
  /** ISO 8601 timestamp */
  at: string;
  user?: { id: number; display_name: string; profile_picture?: string | null } | null;
  amount?: number | null;
  /** Set only for `backing_updated`: the previous backing amount the user replaced. */
  old_amount?: number | null;
  field?: string | null;
  old_value?: string | null;
  meta?: Record<string, unknown> | null;
  backing_id?: number | null;
  running_total: number;
  snapshot: { title: string; description: string | null; display_name: string | null };
}

export interface BountyHistory {
  events: BountyHistoryEvent[];
  current: { title: string; description: string | null; total_backed: number };
}

// ── Admin: User & Creator search ─────────────────────────────────────────────

export interface AdminUser {
  id: number;
  display_name: string;
  email: string;
  profile_picture?: string | null;
  slug?: string | null;
  role: UserRole;
  is_anonymous: boolean;
  email_verified_at: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  created_at: string;
  deleted_at: string | null;
  broke_cooldown: { ends_at: string; started_at?: string } | null;
  creator: {
    id: number;
    display_name: string;
    verified: boolean;
    verified_at: string | null;
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
  /** Active handle claims (verified + unverified). Only populated by /admin/users/{user}, not by the list endpoint. */
  handles?: {
    claim_id: number;
    status: 'verified' | 'unverified';
    verification_method: string | null;
    verified_at: string | null;
    handle: { platform: string; username: string; profile_url: string | null };
    created_at: string;
  }[];
}

export interface AdminCreator {
  id: number;
  display_name: string;
  profile_picture?: string | null;
  /** Public URL slug (artypot.com/{slug}); null if creator has not picked one yet. */
  slug?: string | null;
  verified: boolean;
  verified_at: string | null;
  user: { id: number; display_name: string; email: string } | null;
  w9_status: CreatorW9Status | null;
  amount_earned: number;
  projects_open: number;
  projects_finished: number;
  created_at: string;
}

// ── Admin creator detail (single-creator modal) ────────────────────────────

// ── Compliance admin types ────────────────────────────────────────────────

export interface ComplianceSource {
  id: number;
  source_key: string;
  description: string;
  source_url: string | null;
  refresh_cadence: string;
  refresh_mode: string;
  last_fetched_at: string | null;
  last_verified_at: string | null;
  next_refresh_due_at: string | null;
  freshness: 'fresh' | 'aging' | 'stale' | 'critical';
}

export interface ComplianceSanction {
  id: number;
  country_code: string;
  subdivision_code: string | null;
  program_name: string;
  severity: 'comprehensive_block' | 'sectoral' | 'list_based' | 'advisory';
  applies_to: 'all_residents' | 'specific_entities' | 'specific_sectors';
  status: 'pending_review' | 'active' | 'rejected' | 'superseded';
  source: string;
  source_url: string | null;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  country?: { code_alpha2: string; name_common: string };
}

export interface ComplianceSanctionEntity {
  id: number;
  country_sanctions_id: number;
  entity_name: string;
  entity_aliases: string[];
  entity_type: 'individual' | 'organization' | 'vessel' | 'aircraft';
  address: string | null;
  dob: string | null;
  identifiers: Record<string, string>[];
  match_strength_required: number;
}

export interface ComplianceMatchCandidate {
  id: number;
  country_sanctions_entity_id: number;
  user_id: number;
  match_strength: number;
  matched_field: string;
  status: 'pending' | 'confirmed_match' | 'false_positive' | 'dismissed';
  reviewed_by_user_id: number | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  user?: { id: number; display_name: string; email: string; country_code: string | null };
  entity?: { id: number; entity_name: string; entity_type: string; match_strength_required: number;
             sanction?: { id: number; program_name: string; country_code: string; severity: string } };
}

export interface ComplianceTaxTreaty {
  id: number;
  country_code: string;
  treaty_in_force_date: string;
  withholding_rate_services: string;
  withholding_rate_royalties: string;
  withholding_rate_other: string | null;
  requires_w8ben: boolean;
  treaty_article_reference: string | null;
  source: string;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
  country?: { code_alpha2: string; name_common: string };
}

export interface CompliancePaymentSupport {
  id: number;
  country_code: string;
  provider: 'stripe_charges' | 'stripe_connect' | 'plaid_payouts';
  supported: boolean;
  currency_codes: string[];
  restrictions: Record<string, unknown> | null;
  source: string;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
  country?: { code_alpha2: string; name_common: string };
}

export interface ComplianceStateThreshold {
  id: number;
  state_code: string;
  tax_year: number;
  threshold_gross_payments: string | null;
  threshold_transaction_count: number | null;
  requires_separate_state_filing: boolean;
  state_filing_method: string | null;
  source: string;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
}

export interface ComplianceContentRule {
  id: number;
  country_code: string;
  subdivision_code: string | null;
  regulation_name: string;
  requires_age_verification: boolean;
  age_verification_threshold: number | null;
  requires_local_representative: boolean;
  requires_content_moderation_reports: boolean;
  applies_to_us_based_platforms: boolean;
  source: string;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
  country?: { code_alpha2: string; name_common: string };
}

export interface ComplianceJobRun {
  id: number;
  command: string;
  status: 'running' | 'success' | 'failure' | 'partial';
  started_at: string;
  finished_at: string | null;
  records_processed: number;
  records_added: number;
  records_changed: number;
  error_message: string | null;
  output: string | null;
  created_at: string;
}

export interface ComplianceAuditEntry {
  id: number;
  table_name: string;
  record_id: number;
  edited_by_user_id: number | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  editor?: { id: number; display_name: string; email: string };
}

export interface AdminCreatorDetail extends AdminCreator {
  // Identity
  email: string;
  email_verified_at: string | null;
  phone_number: string | null;
  phone_verified_at: string | null;
  country_code: string | null;
  state_code: string | null;
  bio: string | null;
  profile_picture: string | null;
  last_active_at: string | null;

  // Creator status
  creator_enabled_at: string | null;
  creator_tos_accepted_at: string | null;
  tax_form_status: string | null;
  stripe_connect_account_id: string | null;
  payout_hold: boolean;
  payout_hold_reason: string[] | null;
  payout_category: 1 | 2 | 3 | null;

  // Aggregate summary
  w8ben_status: CreatorW8BENStatus | null;

  // Wallet
  wallet: {
    available_balance: number;
    clearing_balance: number;
    open_backing_total: number;
    total_paid_out: number;
    amount_earned: number;
  };

  // Handle claims
  handle_claims: Array<{
    id: number;
    handle_id: number;
    status: string;
    verification_method: string | null;
    verified_at: string | null;
    created_at: string;
    handle: {
      id: number;
      platform: HandlePlatform;
      username: string;
      profile_url: string | null;
      status: string;
    } | null;
  }>;

  // Stripe withdrawals
  withdrawals: Array<{
    id: number;
    amount: number;
    status: string;
    stripe_payout_id: string | null;
    initiated_at: string | null;
    completed_at: string | null;
    failure_reason: string | null;
    created_at: string;
  }>;

  // External (non-Stripe) payouts
  external_payouts: Array<{
    id: number;
    amount: number;
    method: ExternalPayoutMethod;
    external_reference_id: string | null;
    sent_at: string;
    notes: string | null;
    reversed_at: string | null;
    reversal_reason: string | null;
    recorded_by: { id: number; display_name: string } | null;
    created_at: string;
  }>;

  // Tax records
  w9_records: Array<{
    id: number;
    tax_year: number;
    status: CreatorW9Status;
    completed_at: string | null;
    tin_matched_at: string | null;
    created_at: string;
  }>;

  w8ben_records: Array<{
    id: number;
    tax_year: number;
    status: CreatorW8BENStatus;
    completed_at: string | null;
    created_at: string;
  }>;

  // Recent bounties
  recent_bounties: Array<{
    id: number;
    title: string;
    status: BountyStatus;
    total_backed: number;
    created_at: string;
    completed_at: string | null;
  }>;
}
