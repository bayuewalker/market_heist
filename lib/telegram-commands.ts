import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { appUrl, sendTelegramMessage, type InlineButton } from "@/lib/telegram";

type TelegramFrom = { id: number; username?: string; first_name?: string };

const HELP_TEXT = `<b>Market Heist commands</b>
/start - link your account and see the welcome intro
/signal - your latest signal
/mission - mission status (coming soon)
/brokers - broker referral links
/rank - your Heister Rank (coming soon)
/profile - your account status
/help - this message`;

async function getPersona(admin: SupabaseClient<Database>) {
  const { data } = await admin
    .from("character_configs")
    .select("character_name, bot_intro_message")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  return data;
}

async function getLinkedUserId(admin: SupabaseClient<Database>, telegramId: number): Promise<string | null> {
  const { data } = await admin.from("telegram_links").select("user_id").eq("telegram_id", telegramId).maybeSingle();
  return data?.user_id ?? null;
}

const DASHBOARD_BUTTONS: InlineButton[] = [
  { text: "Open Dashboard", url: appUrl("/dashboard") },
  { text: "Broker Station", url: appUrl("/dashboard/broker") },
  { text: "Signals", url: appUrl("/dashboard/signals") },
];

async function handleStart(admin: SupabaseClient<Database>, from: TelegramFrom, code: string | undefined) {
  const persona = await getPersona(admin);
  const intro = persona?.bot_intro_message || "Welcome to MARKET HEIST.";

  if (code) {
    const { data: linkCode } = await admin
      .from("telegram_link_codes")
      .select("id, user_id, expires_at, consumed_at")
      .eq("code", code)
      .maybeSingle();

    if (!linkCode || linkCode.consumed_at || new Date(linkCode.expires_at).getTime() < Date.now()) {
      return sendTelegramMessage(from.id, "That link code is invalid or expired. Generate a new one from your dashboard.");
    }

    const { data: existingForTelegram } = await admin
      .from("telegram_links")
      .select("user_id")
      .eq("telegram_id", from.id)
      .maybeSingle();
    if (existingForTelegram && existingForTelegram.user_id !== linkCode.user_id) {
      return sendTelegramMessage(from.id, "This Telegram account is already linked to a different Market Heist account.");
    }

    const { data: existingForUser } = await admin
      .from("telegram_links")
      .select("id")
      .eq("user_id", linkCode.user_id)
      .maybeSingle();
    if (!existingForUser) {
      await admin.from("telegram_links").insert({
        user_id: linkCode.user_id,
        telegram_id: from.id,
        telegram_username: from.username ?? null,
      });
    }
    await admin.from("telegram_link_codes").update({ consumed_at: new Date().toISOString() }).eq("id", linkCode.id);

    return sendTelegramMessage(from.id, `${intro}\n\nYour account is linked. Choose your path:`, {
      buttons: [DASHBOARD_BUTTONS],
    });
  }

  const linkedUserId = await getLinkedUserId(admin, from.id);
  if (linkedUserId) {
    return sendTelegramMessage(from.id, `${intro}\n\nWelcome back. Choose your path:`, { buttons: [DASHBOARD_BUTTONS] });
  }

  return sendTelegramMessage(
    from.id,
    `${intro}\n\nLink your Market Heist account first — open your dashboard and tap "Link Telegram" under Account.`,
    { buttons: [[{ text: "Open Dashboard", url: appUrl("/dashboard/account") }]] },
  );
}

async function requireLinked(admin: SupabaseClient<Database>, from: TelegramFrom): Promise<string | null> {
  const linkedUserId = await getLinkedUserId(admin, from.id);
  if (!linkedUserId) {
    await sendTelegramMessage(from.id, "Link your Market Heist account first — open your dashboard and tap \"Link Telegram\" under Account.", {
      buttons: [[{ text: "Open Dashboard", url: appUrl("/dashboard/account") }]],
    });
  }
  return linkedUserId;
}

async function handleBrokers(admin: SupabaseClient<Database>, from: TelegramFrom) {
  const { data: brokers } = await admin
    .from("brokers")
    .select("name, referral_base_url")
    .eq("active", true)
    .order("sort", { ascending: true });

  if (!brokers || brokers.length === 0) {
    return sendTelegramMessage(from.id, "No broker partners are available right now.");
  }

  return sendTelegramMessage(from.id, "Open a broker referral link, then submit your UID on the Broker Station:", {
    buttons: brokers.map((b) => [{ text: b.name, url: b.referral_base_url }]),
  });
}

async function handleProfile(admin: SupabaseClient<Database>, from: TelegramFrom) {
  const userId = await requireLinked(admin, from);
  if (!userId) return;

  const { data: profile } = await admin.from("profiles").select("full_name, plan_id").eq("id", userId).single();

  const [{ data: plan }, { data: brokerAccounts }] = await Promise.all([
    admin.from("plans").select("name").eq("id", profile?.plan_id ?? "basic").single(),
    admin.from("broker_accounts").select("status").eq("user_id", userId),
  ]);

  const verifiedCount = (brokerAccounts ?? []).filter((a) => a.status === "verified").length;
  const name = profile?.full_name?.trim() || "Heister";

  const lines = [
    `<b>Heister:</b> ${name}`,
    `<b>Plan:</b> ${plan?.name ?? "Basic"}`,
    `<b>Verified brokers:</b> ${verifiedCount}`,
    `<b>Heist Points / Rank:</b> coming soon`,
  ];
  return sendTelegramMessage(from.id, lines.join("\n"));
}

async function handleRank(admin: SupabaseClient<Database>, from: TelegramFrom) {
  const userId = await requireLinked(admin, from);
  if (!userId) return;
  return sendTelegramMessage(from.id, "Heister Rank is coming soon — missions and points launch shortly. Stay tuned!");
}

async function handleMission(admin: SupabaseClient<Database>, from: TelegramFrom) {
  const userId = await requireLinked(admin, from);
  if (!userId) return;
  return sendTelegramMessage(from.id, "Missions aren't live yet — check back soon for your first objectives.");
}

async function handleSignal(admin: SupabaseClient<Database>, from: TelegramFrom) {
  const userId = await requireLinked(admin, from);
  if (!userId) return;

  const { data: signal } = await admin
    .from("signals")
    .select("pair, bias, entry, target, stop, rationale, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!signal) {
    return sendTelegramMessage(from.id, "No signals yet — request one from the dashboard.", {
      buttons: [[{ text: "Request a signal", url: appUrl("/dashboard/request") }]],
    });
  }

  const lines = [
    "<b>MARKET HEIST SIGNAL ALERT</b>",
    `Pair: ${signal.pair}`,
    `Bias: ${signal.bias}`,
    signal.entry !== null ? `Entry: ${signal.entry}` : null,
    signal.target !== null ? `Target: ${signal.target}` : null,
    signal.stop !== null ? `Stop: ${signal.stop}` : null,
    signal.rationale ? `\n${signal.rationale}` : null,
  ].filter(Boolean);
  return sendTelegramMessage(from.id, lines.join("\n"), {
    buttons: [[{ text: "Open full analysis", url: appUrl("/dashboard/signals") }]],
  });
}

/**
 * Routes a Telegram command to its handler. Returns the event_type used for
 * `bot_events` logging, and the resolved user_id (if the sender is linked)
 * so the caller can attach it to the log row.
 */
export async function handleTelegramCommand(
  admin: SupabaseClient<Database>,
  from: TelegramFrom,
  command: string,
  args: string[],
): Promise<{ eventType: string }> {
  switch (command) {
    case "/start":
      await handleStart(admin, from, args[0]);
      return { eventType: "command.start" };
    case "/help":
      await sendTelegramMessage(from.id, HELP_TEXT);
      return { eventType: "command.help" };
    case "/brokers":
      await handleBrokers(admin, from);
      return { eventType: "command.brokers" };
    case "/profile":
      await handleProfile(admin, from);
      return { eventType: "command.profile" };
    case "/rank":
      await handleRank(admin, from);
      return { eventType: "command.rank" };
    case "/mission":
      await handleMission(admin, from);
      return { eventType: "command.mission" };
    case "/signal":
      await handleSignal(admin, from);
      return { eventType: "command.signal" };
    default:
      await sendTelegramMessage(from.id, `Unknown command. Try /help.`);
      return { eventType: "command.unknown" };
  }
}
