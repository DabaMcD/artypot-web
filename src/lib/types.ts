export type UserRole = 'mob' | 'summoned' | 'council';
export type PotStatus = 'open' | 'completed' | 'approved' | 'paid_out' | 'revoked';
export type PotType = 'direct';
export type SummonClaimStatus = 'pending' | 'approved' | 'rejected';
export type PotCompletionStatus = 'pending_review' | 'approved' | 'rejected';
export type WithdrawalStatus = 'pending' | 'processing' | 'paid' | 'failed';

export interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  phone_number?: string | null;
  phone_verified_at?: string | null;
  role: UserRole;
  profile_picture?: string;
  total_given?: number;
  open_votives_count?: number;
  cover_processing_fees?: boolean;
  is_anonymous?: boolean;
  summon?: Summon;
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
  rating?: number;
  /** Live-computed count of open pots */
  projects_open?: number;
  /** Live-computed count of paid-out pots */
  projects_finished?: number;
  amount_earned?: number;
  /** Live-computed sum of total_pledged across all pots */
  total_votive_sum?: number;
  /** Whether the currently authenticated user can edit this summon */
  can_edit?: boolean;
  /** The authenticated user's own 24h-aged votive total across all pots for this summon */
  user_aged_votive_total?: number | null;
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
  revoke_deadline_at?: string;
  paid_out_at?: string;
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
}

export interface PublicUser {
  id: number;
  name: string;
  profile_picture?: string;
  is_anonymous: boolean;
  created_at: string;
  votives: PublicUserVotive[];
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

export interface CashBalance {
  balance: number;
  pending_total: number;
  available: PaginatedResponse<AvailableCash>;
  pending: AvailableCash[];
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
