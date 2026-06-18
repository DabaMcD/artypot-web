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
  /** Paid out this year + currently-available funds — the "earned" figure. */
  ytd_earnings: number;
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
  /** Paid out this year + currently-available funds — the "earned" figure. */
  ytd_earnings: number;
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
  /**
   * Fan-market gate (admin-managed). False ONLY when the user has DECLARED a
   * closed-market country — they can still place (soft) backings but can't add
   * a card / be charged. Undeclared fans are chargeable-pending → true. Drives
   * the FanMarketBanner. Included in /me response only.
   */
  fan_market_open?: boolean;
  /**
   * For a frozen fan, the ISO-3166-1 alpha-2 of the closed region they're held
   * against (drives the FanMarketBanner's "we'll email you when <region> opens"
   * copy). Null when not frozen. Included in /me response only.
   */
  fan_market_country?: string | null;
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

/** Overlord Treasury — platform-wide financial reconciliation. */
export interface TreasurySummary {
  /** Live USD platform balance (available + pending) from Stripe. Null if unreachable. */
  stripe_balance: number | null;
  /** What the ledger says Stripe should be holding (owed_to_creators + platform_float). */
  expected_balance: number;
  /** Whether stripe_balance matches expected within tolerance. Null if balance unavailable. */
  reconciled: boolean | null;
  /** stripe_balance − expected_balance. Null if balance unavailable. */
  discrepancy: number | null;
  /** Count of payments Stripe captured but that never settled past the staleness window — money taken, ledger not booked. 0 when healthy. */
  unsettled_captured_count: number;
  /** Gross dollar total of those captured-but-unsettled payments. */
  unsettled_captured_amount: number;
  /** Total un-withdrawn creator earnings (our liability). */
  owed_to_creators: number;
  /** Portion of owed_to_creators that is withdrawable now. */
  owed_available: number;
  /** Portion of owed_to_creators still inside the payout hold window. */
  owed_clearing: number;
  /** Our own accumulated fee revenue still in the platform account. */
  platform_float: number;
  /** Platform fee revenue collected month-to-date. */
  fee_revenue_mtd: number;
  /** Platform fee revenue collected all-time. */
  platform_fees_total: number;
  /** Gross collected from fans all-time (net + stripe fees + platform fees). */
  gross_collected: number;
  /** Stripe processing fees paid all-time. */
  stripe_fees_total: number;
  /** Total ever paid out to creators (withdrawals + external payouts). */
  paid_out_to_creators: number;
  /** Rail fees Artypot has absorbed on manual payouts (non-reversed). Reduces the float. */
  absorbed_payout_fees: number;
  /** Lifetime platform funds swept out of Stripe for business use (non-reversed). Reduces the float. */
  business_withdrawals_total: number;
  /** ISO timestamp the snapshot was computed. */
  as_of: string;
}

// ── Overlord Data Integrity ─────────────────────────────────────────────────

export type IntegrityStatus = 'ok' | 'warn' | 'fail';

export interface IntegrityCheck {
  key: string;
  label: string;
  description: string;
  severity: 'warn' | 'fail';
  status: IntegrityStatus;
  count: number;
  sample: string[];
}

export interface IntegrityReport {
  summary: { ok: number; warn: number; fail: number };
  checks: IntegrityCheck[];
  as_of: string;
}

// ── Overlord System ops (crons, queues, failed jobs) ────────────────────────

export interface ScheduledTask {
  name: string;
  type: 'command' | 'job';
  expression: string;
  description: string | null;
  next_run_at: string | null;
  /** Previous scheduled fire boundary (next − interval). Anchors the cooldown bar. */
  prev_run_at: string | null;
  timezone: string;
  /** When the task last actually finished executing. Null if never recorded. */
  last_run_at: string | null;
  /** Duration of the last execution in ms. Null if unknown / failed. */
  last_duration_ms: number | null;
  /** Whether the most recent recorded run failed. */
  last_failed: boolean;
}

export interface QueueDepth {
  queue: string;
  total: number;
  reserved: number;
  ready: number;
  oldest_available_at: string | null;
}

export interface FailedJob {
  uuid: string;
  name: string;
  queue: string;
  connection: string;
  exception: string;
  failed_at: string;
}

export interface SystemSnapshot {
  warp_speed: boolean;
  queue_driver: string;
  scheduled: ScheduledTask[];
  queues: QueueDepth[];
  failed: {
    total: number;
    recent: FailedJob[];
  };
  as_of: string;
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
  // The verified handle that anchors a creator's identity in the row, e.g.
  // { platform: 'youtube', username: 'mrbeast', label: 'youtube/@mrbeast' }.
  // Null for unverified handles (their display_name is already the handle).
  primary_handle?: { platform: string; username: string; label: string } | null;
  url: string | null;
}

export interface SearchBountyResult {
  id: string;
  title: string;
  // `handle` is the platform-qualified identity anchor (e.g. "youtube/@mrbeast")
  // — the target handle for unclaimed bounties, or the owner's matching handle
  // (same logic as a person's primary_handle). Null when none applies.
  creator: { id: string | null; display_name: string | null; handle?: string | null; url: string | null };
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
  /** Distinct count of people who have backed this creator's bounties (active + paid-out + locked). */
  supporter_count?: number;
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
  /**
   * Creator-market gate (admin-managed). False when Artypot has not yet launched
   * creator support in this creator's country. Distinct from `payout_category === 3`
   * (sanctions): an unsanctioned creator can still be outside an open market.
   * Drives the /c/* full-page takeover (own /me) and the public profile "on hold"
   * notice (public profile payload).
   */
  creator_market_open?: boolean;
  /** Timestamp of TOS agreement, stamped when the user activates creator mode. */
  creator_tos_agreed_at?: string | null;
  verified_at?: string;
  merged_into_creator_id?: number;
  /**
   * Verified handle claims, returned by `GET /creators/{user}`. Each claim's
   * `handle` carries just `id`/`platform`/`username` (the backend selects only
   * those columns). Used to derive a creator's primary handle for display, e.g.
   * when deep-linking into `/bounties/new?creator_id=…`.
   */
  handle_claims?: Array<{
    id: number;
    handle_id: number;
    status: string;
    handle: { id: number; platform: HandlePlatform; username: string } | null;
  }>;
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
  /**
   * The authenticated fan's own active backing amount on this bounty, or null
   * if they don't back it. Appended by the list endpoint (index) so cards can
   * show "you back $X" without the full backings list. Absent (undefined) on
   * payloads that don't compute it, e.g. for guests.
   */
  user_backing?: number | null;
  /** Active supporter count. Appended by the list endpoint via withCount. */
  backings_count?: number;
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

/** At-a-glance fan stats for the dashboard (GET /auth/backings/stats). */
export interface FanStats {
  /** Distinct bounties the fan actively backs or helped deliver. */
  bounties_supported: number;
  /** Bounties the fan themselves initiated (and hasn't had revoked). */
  bounties_started: number;
  /** Distinct creators/handles the fan has petitioned (backed) or helped deliver. */
  creators_supported: number;
  /** Distinct creators the fan has actually paid (from delivered bounties). */
  creators_paid: number;
  /** Lifetime amount actually charged ($0 until a backed bounty is delivered). */
  lifetime_paid: number;
  /** Everything pledged: active commitments + delivered. */
  total_backed: number;
}

// ── Payment history (past fan charges) ──────────────────────────────────────

export type FanPaymentStatus = 'pending' | 'requires_action' | 'failed' | 'completed';

export interface FanPaymentItem {
  bounty_id: number;
  bounty: { id: number; title: string } | null;
  /** Serialized as a decimal string by the API; coerce with Number() at render. */
  amount: number | string;
}

export interface FanPaymentSummary {
  id: number;
  status: FanPaymentStatus;
  /** Total charged. Serialized as a decimal string by the API. */
  gross_paid: number | string;
  charged_at: string;             // ISO 8601 (UTC)
  billing_run_date: string | null; // null for a manual pay-now
  items: FanPaymentItem[];
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

// ── Handle investigation registry (GET /admin/handle-registry[/{id}]) ─────────

export type HandleClaimStatus = 'unverified' | 'verified' | 'rejected' | 'abandoned';
export type HandleVerificationMethod = 'oauth' | 'manual_post' | 'manual_dm' | 'admin';

/** Per-status claim tallies for one handle. */
export interface HandleClaimSummary {
  total: number;
  verified: number;
  rejected: number;
  unverified: number;
  abandoned: number;
}

/** A row in the handle registry list. */
export interface HandleRegistryRow {
  id: number;
  platform: HandlePlatform;
  username: string;
  status: HandleStatus;
  created_at: string;
  owner: { id: number; display_name: string } | null;
  verification_method: HandleVerificationMethod | null;
  verified_at: string | null;
  claim_summary: HandleClaimSummary;
}

/** One claim in a handle's full dossier. */
export interface HandleDossierClaim {
  id: number;
  status: HandleClaimStatus;
  verification_method: HandleVerificationMethod | null;
  verified_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  user: { id: number; display_name: string; email: string | null; country_code: string | null } | null;
  /** Set on rejected claims: the claim (and user) that won the handle. */
  rejected_in_favor_of: {
    claim_id: number;
    user: { id: number; display_name: string } | null;
  } | null;
  /** This claim's admin-review submission history, newest first. */
  applications: Array<{
    id: number;
    status: HandleVerificationApplicationStatus;
    contact_message: string;
    decision_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
    reviewer: { id: number; display_name: string; email: string | null } | null;
  }>;
}

/** Full investigation dossier for one handle (GET /admin/handle-registry/{id}). */
export interface HandleDossier {
  handle: {
    id: number;
    platform: HandlePlatform;
    username: string;
    username_normalized: string;
    external_id: string | null;
    profile_url: string | null;
    status: HandleStatus;
    last_synced_at: string | null;
    created_at: string;
    updated_at: string;
  };
  /** Null until the handle has a verified claim. */
  verification: {
    verified_claim_id: number;
    method: HandleVerificationMethod | null;
    verified_at: string | null;
    owner: { id: number; display_name: string; email: string | null } | null;
    /** The approved admin application behind a manual verification; null for OAuth. */
    review: {
      reviewer: { id: number; display_name: string; email: string | null } | null;
      reviewed_at: string | null;
      decision_notes: string | null;
      contact_message: string;
    } | null;
  } | null;
  claim_summary: HandleClaimSummary;
  claims: HandleDossierClaim[];
  aliases: Array<{ id: number; alias: string; source: string; created_at: string }>;
  bounties: {
    total: number;
    pot_total: number;
    items: Array<{ id: number; title: string; status: BountyStatus; total_backed: number }>;
  };
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
  /**
   * The submitter's prior review outcomes (approved/rejected completion
   * counts). `total_decided === 0` means this is their first reviewed
   * submission — i.e. no track record to judge by.
   */
  creator_history: {
    approved: number;
    rejected: number;
    total_decided: number;
  };
}

export interface CashBalance {
  balance: number;
  available: PaginatedResponse<CashLedgerEntry>;
  broke_cooldown: { ends_at: string; started_at: string } | null;
}

/** Self-describing type for a cash_ledger row. Mirrors App\Enums\CashLedgerEntryType. */
export type CashLedgerEntryType =
  | 'fan_obligation'
  | 'fan_settlement'
  | 'broke_declaration'
  | 'creator_earning'
  | 'platform_fee'
  | 'platform_fee_tax'
  | 'creator_withdrawal'
  | 'external_payout'
  | 'external_payout_reversal'
  | 'dispute_adjustment'
  | 'refund_clawback'
  | 'adjustment';

export interface CashLedgerEntry {
  id: number;
  entity_type: 'user' | 'creator';
  entity_id: number;
  amount: number;
  available_after: string | null;
  description: string;
  /** Nullable only for legacy rows written before the column existed. */
  entry_type?: CashLedgerEntryType | null;
  created_at?: string;
  bounty?: Pick<Bounty, 'id' | 'title'>;
  fan_payment_id?: number | null;
  creator_withdrawal_id?: number | null;
  external_payout_id?: number | null;
  /** Derived (not stored) on historical creator_earning rows so the UI can show the fee breakdown. */
  gross_amount?: number | null;
  /** Derived (not stored) platform fee for historical net earnings. New payouts carry the fee as its own row. */
  platform_fee?: number | null;
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
  /** Rail fee (Wise/PayPal/wire/etc.) absorbed by Artypot. Not deducted from the creator. */
  transaction_fee: number;
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

export type PlatformWithdrawalCategory =
  | 'business_expense'
  | 'payroll'
  | 'tax'
  | 'owner_draw'
  | 'transfer'
  | 'other';

/** A withdrawal of platform funds from Stripe for non-creator purposes. */
export interface PlatformWithdrawal {
  id: number;
  amount: number;
  category: PlatformWithdrawalCategory;
  destination: string;
  external_reference_id: string | null;
  withdrawn_at: string;       // YYYY-MM-DD
  notes: string | null;
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

// ── Country Tiers (admin · read-only, derived from compliance data) ──────────

export type CountryTier = 'full' | 'manual_payout' | 'restricted' | 'blocked';

/** How a creator in this country is paid out. */
export type CountryPayoutMode = 'automated' | 'manual' | 'blocked';

export interface CountryTierSanction {
  program_name: string;
  severity: string | null;
  subdivision_code: string | null;
}

export interface CountryTierRow {
  code: string;          // ISO 3166-1 alpha-2
  code3: string;
  name: string;
  region: string | null;
  tier: CountryTier;
  tier_rank: number;     // 1 = lowest friction … 4 = blocked
  charges_supported: boolean;  // can fans in this country be billed (Stripe charges)
  connect_supported: boolean;  // is automated Stripe Connect payout available
  payout_mode: CountryPayoutMode;
  sanction_block: boolean;
  sanctions: CountryTierSanction[];
  reason: string;
}

export interface CountryTierDefinition {
  tier: CountryTier;
  rank: number;
  label: string;
  description: string;
}

export interface CountryTiersResponse {
  data: CountryTierRow[];
  summary: Record<CountryTier, number>;
  definitions: CountryTierDefinition[];
}

// ── Billing Runs (admin) ────────────────────────────────────────────────────

export type BillingRunStatus = 'pending' | 'running' | 'completed' | 'failed';

/** A minimal user reference attached to billing-run detail rows. */
export interface BillingRunUserRef {
  id: number;
  display_name: string;
  email: string | null;
}

/**
 * Live, webhook-derived rollup for one billing run. The run row's own
 * total_collected/total_fees are *attempted* (dispatch-time) figures; these
 * fields reflect confirmed reality.
 */
export interface BillingRunSummary {
  collected_count: number;
  collected_amount: number;
  failed_count: number;
  failed_amount: number;
  pending_action_count: number;
  pending_action_amount: number;
  in_flight_count: number;
  in_flight_amount: number;
  failed_attempts: number;
  charged_users: number;
  dropped_backings: number;
  chargeback_count: number;
  chargeback_amount: number;
}

export interface BillingRun {
  id: number;
  run_date: string;            // YYYY-MM-DD
  status: BillingRunStatus;
  /** Attempted (dispatch-time) totals — decimal strings from the API. */
  total_collected: number | string;
  total_paid_out: number | string;
  total_fees: number | string;
  soft_backings_cancelled: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  summary: BillingRunSummary;
}

/** A failed fan-payment annotated with the latest Stripe decline detail. */
export interface BillingRunFailedPayment {
  id: number;
  user: BillingRunUserRef | null;
  gross_paid: number;
  attempts: number;
  decline_code: string | null;
  error_code: string | null;
  error_message: string | null;
  last_attempt_at: string | null;
}

/** A payment stuck awaiting 3DS / SCA authentication. */
export interface BillingRunPendingAction {
  id: number;
  user: BillingRunUserRef | null;
  gross_paid: number;
  requires_action_at: string | null;
}

/** A chargeback / dispute against a payment collected in this run. */
export interface BillingRunChargeback {
  id: number;
  user: BillingRunUserRef | null;
  fan_payment_id: number | null;
  amount: number;
  reason: string | null;
  status: string | null;
  status_label: string | null;
  is_terminal: boolean;
  /** null = chargeback on unknown charge; true = creator clawed back; false = platform absorbed. */
  pre_clearing: boolean | null;
  clawback_amount: number | null;
  created_at: string;
}

/** A backing dropped before charging because the fan had no valid card. */
export interface BillingRunDroppedBacking {
  id: number;
  user: BillingRunUserRef | null;
  bounty: { id: number; title: string } | null;
  amount: number;
  revoked_at: string | null;
}

export interface BillingRunDetail extends BillingRun {
  failed_payments: BillingRunFailedPayment[];
  pending_action: BillingRunPendingAction[];
  chargebacks: BillingRunChargeback[];
  dropped_backings: BillingRunDroppedBacking[];
}

// ── Refunds (admin partial-refund tooling + creator bounty-wide refunds) ─────

/** One refunded backing — a partial Stripe refund of a grouped charge. */
export interface AdminRefund {
  id: number;
  backing_id: number;
  fan_payment_id: number;
  bounty: { id: number; title: string } | null;
  fan: { id: number; display_name: string; email: string | null } | null;
  creator: { id: number; display_name: string } | null;
  initiated_by: { id: number; display_name: string } | null;
  source: 'admin' | 'creator';
  /** Gross returned to the fan's card. */
  amount: number;
  /** Amount debited from the creator (net for admin refunds, gross for creator refunds). */
  creator_clawback: number;
  status: 'succeeded' | 'pending' | 'failed';
  failure_reason: string | null;
  /** Publicly-visible reason shown to the fan and creator. */
  reason: string | null;
  /** Internal admin-only note. */
  notes: string | null;
  created_at: string;
}

/** One backing slice of a grouped charge, as seen by the admin refund tool. */
export interface FanPaymentBackingRow {
  backing_id: number;
  bounty: { id: number; title: string } | null;
  creator: { id: number; display_name: string } | null;
  fan: { id: number; display_name: string } | null;
  amount: number;
  /** What the creator actually received (gross − platform fee). */
  creator_net: number;
  refunded_at: string | null;
  refundable: boolean;
}

export interface FanPaymentBackingsResponse {
  fan_payment: {
    id: number;
    gross_paid: number;
    net_paid: number;
    status: string;
    user: { id: number; display_name: string } | null;
  };
  backings: FanPaymentBackingRow[];
}

/** Creator-side preview of a bounty-wide refund. */
export interface BountyRefundPreview {
  settled: Array<{
    backing_id: number;
    fan: { id: number; display_name: string };
    amount: number;
  }>;
  unsettled_count: number;
  unsettled_total: number;
  total_refund: number;
  /** Gross clawback — what the refund will cost the creator. */
  total_clawback: number;
  /** The creator's current running balance. */
  balance: number;
  sufficient: boolean;
}

export interface BountyRefundResult {
  refunded: number;
  revoked: number;
  failed: number;
  total_refunded: number;
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
  /** Lifetime platform fees withheld from this creator's earnings (incl. derived historical). */
  lifetime_platform_fees: number;
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
  // ── Fan market-available (region opened) ─────────────────────────────────
  market_available: boolean;
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
  sms_market_available: boolean;
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
  in_app_market_available: boolean;
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
  // billing_preview email defaults ON — the fan's only advance notice of the
  // monthly charge (bell is mandatory-OFF, SMS disabled platform-wide).
  billing_preview: true,       sms_billing_preview: false,
  billing_receipt: true,       sms_billing_receipt: true,       in_app_billing_receipt: true,
  bounty_activity: false,         sms_bounty_activity: false,         in_app_bounty_activity: true,
  creator_activity: false,        sms_creator_activity: false,        in_app_creator_activity: true,
  comment_reply: false,           sms_comment_reply: false,           in_app_comment_reply: true,
  creator_new_bounty: false,      sms_creator_new_bounty: false,      in_app_creator_new_bounty: false,
  creator_bounty_verified: false, sms_creator_bounty_verified: true,  in_app_creator_bounty_verified: true,
  // Fired to a frozen fan when payment opens in their region — email + bell ON.
  market_available: true,         sms_market_available: false,        in_app_market_available: true,
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

// ── Admin audit log (read-only feed of admin/council actions) ───────────────

export type AuditLogCategory = 'accounts' | 'compliance' | 'money' | 'content' | 'governance';

export interface AuditLogActor {
  id: number;
  display_name: string;
}

export interface AuditLogEntry {
  /** Stable composite key, e.g. "payout_reversed:42". */
  id: string;
  source: string;
  event: string;
  category: AuditLogCategory;
  occurred_at: string;        // ISO 8601
  actor: AuditLogActor | null;
  target_user: AuditLogActor | null;
  subject: string | null;     // e.g. "bounty #7", "country_payment_support #3"
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  note: string | null;
}

export interface AuditLogSource {
  key: string;
  label: string;
  category: AuditLogCategory;
}

export interface AuditLogResponse {
  data: AuditLogEntry[];
  current_page: number;
  per_page: number;
  total: number;
  last_page: number;
  sources: AuditLogSource[];
}

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

export interface CompliancePlatformFeeTaxRate {
  id: number;
  state_code: string;
  subdivision_code: string | null;
  rate: string; // decimal fraction of the platform fee, e.g. "0.062500"
  source: string;
  source_url: string | null;
  source_fetched_at: string | null;
  effective_date: string;
  sunset_date: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at?: string;
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

/** Admin: an unclaimed handle ranked by the pot waiting for its creator. */
export interface UnclaimedHandlePot {
  id: number;
  platform: string;
  username: string;
  open_bounty_count: number;
  pot_total: number;
}

/** Admin: a Content Policy report queue row. */
export interface BountyReportRow {
  id: number;
  bounty_id: number;
  reason: 'harassment' | 'illegal' | 'adult_content' | 'spam' | 'other';
  details: string | null;
  status: 'pending' | 'reviewed' | 'actioned' | 'dismissed';
  review_notes: string | null;
  reviewed_at: string | null;
  created_at: string;
  bounty?: {
    id: number;
    title: string;
    status: string;
    total_backed: number;
    target_handle?: { id: number; platform: string; username: string } | null;
  };
  reporter?: { id: number; display_name: string; email: string };
  reviewed_by?: { id: number; display_name: string } | null;
}

/** Admin: platform-wide market defaults (the Phase 2 launch switch). */
export interface MarketPolicyData {
  fan_default: 'open' | 'closed';
  creator_default: 'open' | 'closed';
  updated_at: string;
}

/** Admin: one country's market overrides + research dossier. */
export interface MarketCountryRow {
  country_code: string;
  /** name_common from the compliance countries table; null when no row exists for the code. */
  name: string | null;
  /** Explicit override, or null = follow the platform default. */
  fan_status: 'open' | 'closed' | null;
  creator_status: 'open' | 'closed' | null;
  /** Resolved status (override ?? default). */
  fan_effective: 'open' | 'closed';
  creator_effective: 'open' | 'closed';
  watch_notes: string | null;
  legal_basis_notes: string | null;
  activation_notes: string | null;
  creator_notes: string | null;
  updated_at: string;
}

/** Admin: per-country billed volume for VAT registration-threshold monitoring. */
export interface MarketVolumeRow {
  /** null = fans who never declared a country (the "Undeclared" bucket). */
  country_code: string | null;
  /** Null for the Undeclared bucket and for codes missing from the countries table. */
  name: string | null;
  fans_total: number;
  fans_with_card: number;
  active_backing_total: number;
  settled_12mo: number;
  settled_lifetime: number;
  fan_effective: 'open' | 'closed' | null;
}

/** Admin: a fan whose declared country contradicts their card's issuing country. */
/** One independent location signal in the conflict review queue. */
export interface MarketConflictSignal {
  country: string;
  fan_open: boolean;
}

export interface MarketConflictRow {
  user_id: number;
  display_name: string;
  email: string;
  /** The closed region this fan is held against (their notify target). */
  waiting_on: string | null;
  card: MarketConflictSignal | null;
  billing: MarketConflictSignal | null;
  ip: MarketConflictSignal | null;
  declared: MarketConflictSignal | null;
}
