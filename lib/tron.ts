// USDT TRC20 contract on TRON mainnet.
const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
const TRONGRID_BASE = "https://api.trongrid.io";
const USDT_DECIMALS = 1_000_000; // 6 decimals

export type IncomingTransfer = {
  txId: string;
  from: string;
  to: string;
  amount: number; // in USDT (human units)
  timestampMs: number;
};

/**
 * Fetch incoming USDT (TRC20) transfers to `address` since `minTimestampMs`,
 * using the public TronGrid API. An optional TRONGRID_API_KEY raises rate
 * limits. Returns confirmed transfers only.
 */
export async function fetchIncomingUsdt(
  address: string,
  minTimestampMs: number,
): Promise<IncomingTransfer[]> {
  const url = new URL(`${TRONGRID_BASE}/v1/accounts/${address}/transactions/trc20`);
  url.searchParams.set("only_to", "true");
  url.searchParams.set("only_confirmed", "true");
  url.searchParams.set("contract_address", USDT_TRC20_CONTRACT);
  url.searchParams.set("min_timestamp", String(Math.max(0, Math.floor(minTimestampMs))));
  url.searchParams.set("limit", "100");

  const headers: Record<string, string> = { Accept: "application/json" };
  if (process.env.TRONGRID_API_KEY) headers["TRON-PRO-API-KEY"] = process.env.TRONGRID_API_KEY;

  const res = await fetch(url, { headers, cache: "no-store" });
  if (!res.ok) {
    throw new Error(`TronGrid error ${res.status}`);
  }
  const json = await res.json();
  const rows: unknown[] = Array.isArray(json?.data) ? json.data : [];

  const transfers: IncomingTransfer[] = [];
  for (const r of rows as Record<string, unknown>[]) {
    const contract = (r.token_info as Record<string, unknown> | undefined)?.address;
    if (contract !== USDT_TRC20_CONTRACT) continue;
    if (r.type && r.type !== "Transfer") continue;
    const rawValue = typeof r.value === "string" ? Number(r.value) : Number(r.value ?? 0);
    if (!Number.isFinite(rawValue)) continue;
    transfers.push({
      txId: String(r.transaction_id ?? ""),
      from: String(r.from ?? ""),
      to: String(r.to ?? ""),
      amount: rawValue / USDT_DECIMALS,
      timestampMs: Number(r.block_timestamp ?? 0),
    });
  }
  return transfers;
}

/**
 * Match an incoming transfer to an expected amount. USDT has 6 decimals; we
 * compare at cent precision (our unique amounts are 2-decimal).
 */
export function amountMatches(transfer: number, expected: number): boolean {
  return Math.round(transfer * 100) === Math.round(expected * 100);
}
