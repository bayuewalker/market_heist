import { Suspense } from "react";
import type { Metadata } from "next";
import { getTelegramBotConfigForPublicPage } from "@/lib/telegram-settings";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Telegram Login is additive — only render the widget when the bot is
  // actually configured for it (§2/M13's callback needs both to sign anyone
  // in). Uses the "safe" resolver since login must keep working even if the
  // service-role client can't be built.
  const { botToken, botUsername } = await getTelegramBotConfigForPublicPage();
  const telegramBotUsername = botToken && botUsername ? botUsername : undefined;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted">Log in to your Market Heist dashboard.</p>
      </div>
      <Suspense fallback={<div className="h-72" />}>
        <AuthForm mode="login" telegramBotUsername={telegramBotUsername} />
      </Suspense>
    </div>
  );
}
