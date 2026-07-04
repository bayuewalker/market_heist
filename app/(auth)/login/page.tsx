import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  // Telegram Login is additive — only render the widget when the bot is
  // actually configured for it (§2/M13's callback needs both to sign anyone in).
  const telegramBotUsername =
    process.env.TELEGRAM_BOT_USERNAME && process.env.TELEGRAM_BOT_TOKEN
      ? process.env.TELEGRAM_BOT_USERNAME
      : undefined;

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
