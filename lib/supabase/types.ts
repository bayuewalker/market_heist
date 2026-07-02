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

export type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  plan_id: string;
  created_at: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
