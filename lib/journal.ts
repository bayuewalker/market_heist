import type { TradeJournalRow } from "@/lib/supabase/types";

const OVERTRADING_DAILY_THRESHOLD = 5;

export type JournalStats = {
  disciplineScore: number | null;
  totalTrades: number;
  followedPlanCount: number;
  overtrading: boolean;
  tradesToday: number;
};

/**
 * Discipline score = % of logged trades where the member followed their own
 * plan (stuck to the stop/entry rules they set going in). Overtrading flags
 * when a member logs more than OVERTRADING_DAILY_THRESHOLD trades on a
 * single UTC day — a common precursor to revenge-trading.
 */
export function computeJournalStats(trades: Pick<TradeJournalRow, "followed_plan" | "traded_at">[]): JournalStats {
  const totalTrades = trades.length;
  const followedPlanCount = trades.filter((t) => t.followed_plan).length;
  const disciplineScore = totalTrades > 0 ? Math.round((followedPlanCount / totalTrades) * 100) : null;

  const tradesByDay = new Map<string, number>();
  for (const trade of trades) {
    const day = trade.traded_at.slice(0, 10);
    tradesByDay.set(day, (tradesByDay.get(day) ?? 0) + 1);
  }
  const maxTradesInADay = Math.max(0, ...tradesByDay.values());
  const today = new Date().toISOString().slice(0, 10);
  const tradesToday = tradesByDay.get(today) ?? 0;

  return {
    disciplineScore,
    totalTrades,
    followedPlanCount,
    overtrading: maxTradesInADay > OVERTRADING_DAILY_THRESHOLD,
    tradesToday,
  };
}
