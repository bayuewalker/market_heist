/**
 * Minimal hand-written database types for the Market Heist schema. Keep in
 * sync with supabase/migrations. (Can later be replaced by
 * `supabase gen types typescript`.)
 */

export type SignalBias = "long" | "short" | "neutral";
export type SignalStatus = "active" | "closed";
export type MarketKind = "crypto" | "forex" | "commodity";

export type PlanRow = {
  id: string;
  name: string;
  price_monthly: number | null;
  signal_limit: number | null;
  features: string[];
  badge: string | null;
  sort: number;
};

export type UserRole = "member" | "admin";
export type RiskProfile = "conservative" | "moderate" | "aggressive";

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_id: string;
  plan_expires_at: string | null;
  role: UserRole;
  risk_profile: RiskProfile | null;
  created_at: string;
};

export type PaymentPeriod = "monthly" | "annual";
export type PaymentStatus = "pending" | "confirmed" | "expired";

export type PaymentRow = {
  id: string;
  user_id: string;
  plan_id: string;
  period: PaymentPeriod;
  amount_usdt: number;
  address: string;
  network: string;
  status: PaymentStatus;
  tx_hash: string | null;
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  last_checked_at: string | null;
};

export type SignalRow = {
  id: string;
  user_id: string;
  pair: string;
  market: MarketKind | null;
  timeframe: string | null;
  bias: SignalBias;
  entry: number | null;
  target: number | null;
  stop: number | null;
  confidence: number | null;
  technique: string | null;
  rationale: string | null;
  status: SignalStatus;
  created_at: string;
};

export type TrendUpdateRow = {
  id: string;
  market: MarketKind;
  for_date: string;
  headline: string;
  summary: string;
  created_at: string;
};

export type BrokerRow = {
  id: string;
  name: string;
  referral_base_url: string;
  markets: MarketKind[];
  active: boolean;
  sort: number;
};

export type BrokerAccountStatus =
  | "submitted"
  | "under_review"
  | "verified"
  | "rejected"
  | "duplicate"
  | "inactive";

export type BrokerAccountRow = {
  id: string;
  user_id: string;
  broker_id: string;
  uid: string;
  status: BrokerAccountStatus;
  note: string | null;
  verified_at: string | null;
  verified_by: string | null;
  created_at: string;
  updated_at: string;
};

export type CommissionImportRow = {
  id: string;
  broker_id: string;
  period: string;
  source: "csv" | "api" | "manual";
  row_count: number;
  imported_by: string | null;
  created_at: string;
};

export type CommissionRowRow = {
  id: string;
  import_id: string;
  broker_id: string;
  uid: string;
  volume: number | null;
  fees: number | null;
  backend_commission: number;
  matched_user_id: string | null;
  for_period: string;
  created_at: string;
};

export type RewardAllocationType = "member" | "captain" | "leaderboard" | "campaign" | "donation" | "operation";
export type RewardLedgerStatus = "estimated" | "pending" | "approved" | "paid";
export type RewardSourceType = "commission_row" | "manual" | "campaign";

export type RewardLedgerRow = {
  id: string;
  user_id: string | null;
  source_type: RewardSourceType;
  allocation_type: RewardAllocationType;
  amount: number;
  status: RewardLedgerStatus;
  period: string | null;
  commission_row_id: string | null;
  created_at: string;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  paid_by: string | null;
};

export type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string;
  target_id: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type CharacterConfigRow = {
  id: string;
  character_key: string;
  character_name: string;
  role: string | null;
  tagline: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  bot_intro_message: string | null;
  signal_prefix: string | null;
  dashboard_note_title: string | null;
  dashboard_note_body: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type TelegramLinkRow = {
  id: string;
  user_id: string;
  telegram_id: number;
  telegram_username: string | null;
  linked_at: string;
};

export type TelegramLinkCodeRow = {
  id: string;
  user_id: string;
  code: string;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
};

export type BotEventRow = {
  id: string;
  user_id: string | null;
  event_type: string;
  payload: Record<string, unknown>;
  created_at: string;
};

export type MissionRow = {
  id: string;
  mission_key: string;
  public_name: string;
  description: string | null;
  points_reward: number;
  trigger_type: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
};

export type UserMissionStatus = "pending" | "completed" | "claimed";

export type UserMissionRow = {
  id: string;
  user_id: string;
  mission_id: string;
  status: UserMissionStatus;
  completed_at: string | null;
  claimed_at: string | null;
};

export type HeistPointsSourceType = "mission" | "manual_adjustment";

export type HeistPointsLedgerRow = {
  id: string;
  user_id: string;
  source_type: HeistPointsSourceType;
  source_id: string | null;
  points_delta: number;
  balance_after: number;
  reason: string | null;
  created_at: string;
};

export type HeisterRankRow = {
  id: string;
  name: string;
  min_points: number | null;
  rules_json: Record<string, unknown>;
  active: boolean;
  sort_order: number;
};

export type Database = {
  public: {
    Tables: {
      plans: {
        Row: PlanRow;
        Insert: Partial<PlanRow> & { id: string; name: string };
        Update: Partial<PlanRow>;
        Relationships: [];
      };
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string };
        Update: Partial<ProfileRow>;
        Relationships: [];
      };
      signals: {
        Row: SignalRow;
        Insert: Omit<SignalRow, "id" | "created_at"> &
          Partial<Pick<SignalRow, "id" | "created_at">>;
        Update: Partial<SignalRow>;
        Relationships: [];
      };
      payments: {
        Row: PaymentRow;
        Insert: Omit<
          PaymentRow,
          | "id"
          | "created_at"
          | "network"
          | "status"
          | "tx_hash"
          | "confirmed_at"
          | "last_checked_at"
        > &
          Partial<
            Pick<
              PaymentRow,
              | "id"
              | "created_at"
              | "network"
              | "status"
              | "tx_hash"
              | "confirmed_at"
              | "last_checked_at"
            >
          >;
        Update: Partial<PaymentRow>;
        Relationships: [];
      };
      trend_updates: {
        Row: TrendUpdateRow;
        Insert: Omit<TrendUpdateRow, "id" | "created_at" | "for_date"> &
          Partial<Pick<TrendUpdateRow, "id" | "created_at" | "for_date">>;
        Update: Partial<TrendUpdateRow>;
        Relationships: [];
      };
      brokers: {
        Row: BrokerRow;
        Insert: Partial<BrokerRow> & { id: string; name: string; referral_base_url: string };
        Update: Partial<BrokerRow>;
        Relationships: [];
      };
      broker_accounts: {
        Row: BrokerAccountRow;
        Insert: Omit<
          BrokerAccountRow,
          "id" | "status" | "note" | "verified_at" | "verified_by" | "created_at" | "updated_at"
        > &
          Partial<
            Pick<
              BrokerAccountRow,
              "id" | "status" | "note" | "verified_at" | "verified_by" | "created_at" | "updated_at"
            >
          >;
        Update: Partial<BrokerAccountRow>;
        Relationships: [];
      };
      commission_imports: {
        Row: CommissionImportRow;
        Insert: Omit<CommissionImportRow, "id" | "row_count" | "created_at"> &
          Partial<Pick<CommissionImportRow, "id" | "row_count" | "created_at">>;
        Update: Partial<CommissionImportRow>;
        Relationships: [];
      };
      commission_rows: {
        Row: CommissionRowRow;
        Insert: Omit<CommissionRowRow, "id" | "created_at"> & Partial<Pick<CommissionRowRow, "id" | "created_at">>;
        Update: Partial<CommissionRowRow>;
        Relationships: [];
      };
      reward_ledger: {
        Row: RewardLedgerRow;
        Insert: Omit<
          RewardLedgerRow,
          "id" | "status" | "created_at" | "approved_at" | "approved_by" | "paid_at" | "paid_by"
        > &
          Partial<
            Pick<
              RewardLedgerRow,
              "id" | "status" | "created_at" | "approved_at" | "approved_by" | "paid_at" | "paid_by"
            >
          >;
        Update: Partial<RewardLedgerRow>;
        Relationships: [];
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: Omit<AuditLogRow, "id" | "created_at"> & Partial<Pick<AuditLogRow, "id" | "created_at">>;
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
      character_configs: {
        Row: CharacterConfigRow;
        Insert: Omit<CharacterConfigRow, "id" | "is_active" | "created_at" | "updated_at"> &
          Partial<Pick<CharacterConfigRow, "id" | "is_active" | "created_at" | "updated_at">>;
        Update: Partial<CharacterConfigRow>;
        Relationships: [];
      };
      telegram_links: {
        Row: TelegramLinkRow;
        Insert: Omit<TelegramLinkRow, "id" | "linked_at"> & Partial<Pick<TelegramLinkRow, "id" | "linked_at">>;
        Update: Partial<TelegramLinkRow>;
        Relationships: [];
      };
      telegram_link_codes: {
        Row: TelegramLinkCodeRow;
        Insert: Omit<TelegramLinkCodeRow, "id" | "created_at" | "consumed_at"> &
          Partial<Pick<TelegramLinkCodeRow, "id" | "created_at" | "consumed_at">>;
        Update: Partial<TelegramLinkCodeRow>;
        Relationships: [];
      };
      bot_events: {
        Row: BotEventRow;
        Insert: Omit<BotEventRow, "id" | "created_at"> & Partial<Pick<BotEventRow, "id" | "created_at">>;
        Update: Partial<BotEventRow>;
        Relationships: [];
      };
      missions: {
        Row: MissionRow;
        Insert: Omit<MissionRow, "id" | "is_active" | "sort_order" | "created_at"> &
          Partial<Pick<MissionRow, "id" | "is_active" | "sort_order" | "created_at">>;
        Update: Partial<MissionRow>;
        Relationships: [];
      };
      user_missions: {
        Row: UserMissionRow;
        Insert: Omit<UserMissionRow, "id" | "status" | "completed_at" | "claimed_at"> &
          Partial<Pick<UserMissionRow, "id" | "status" | "completed_at" | "claimed_at">>;
        Update: Partial<UserMissionRow>;
        Relationships: [];
      };
      heist_points_ledger: {
        Row: HeistPointsLedgerRow;
        Insert: Omit<HeistPointsLedgerRow, "id" | "source_id" | "reason" | "created_at"> &
          Partial<Pick<HeistPointsLedgerRow, "id" | "source_id" | "reason" | "created_at">>;
        Update: Partial<HeistPointsLedgerRow>;
        Relationships: [];
      };
      heister_ranks: {
        Row: HeisterRankRow;
        Insert: Omit<HeisterRankRow, "id" | "rules_json" | "active" | "sort_order"> &
          Partial<Pick<HeisterRankRow, "id" | "rules_json" | "active" | "sort_order">>;
        Update: Partial<HeisterRankRow>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      admin_confirmed_revenue: {
        Args: Record<string, never>;
        Returns: number;
      };
      claim_mission: {
        Args: { p_user_id: string; p_mission_id: string };
        Returns: HeistPointsLedgerRow;
      };
      append_heist_points: {
        Args: {
          p_user_id: string;
          p_source_type: HeistPointsSourceType;
          p_source_id: string | null;
          p_points_delta: number;
          p_reason: string | null;
        };
        Returns: HeistPointsLedgerRow;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
