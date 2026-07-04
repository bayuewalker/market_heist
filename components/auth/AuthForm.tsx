"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import TelegramLoginButton from "./TelegramLoginButton";

type AuthFormProps = {
  mode: "login" | "signup";
  /** Only passed on `/login` — Telegram Login only ever signs in an already-linked account, never creates one. */
  telegramBotUsername?: string;
};

const TELEGRAM_ERROR_MESSAGES: Record<string, string> = {
  invalid: "That Telegram sign-in link wasn't valid. Please try again.",
  not_linked: "This Telegram account isn't linked to a Market Heist account yet. Log in with email and link Telegram from your dashboard, or sign up if you're new here.",
  no_email: "Couldn't sign you in with Telegram. Please log in with email instead.",
  session_failed: "Couldn't sign you in with Telegram. Please log in with email instead.",
};

const inputClass =
  "w-full rounded-lg border border-border-subtle bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted/70 transition-colors focus:border-accent/60 focus:outline-none focus:ring-2 focus:ring-accent/30";

/**
 * Only allow redirects to internal, single-slash paths to avoid open-redirect
 * navigation (e.g. "//evil.example" or "/\\evil.example").
 */
function safeRedirect(target: string | null): string {
  if (!target || !target.startsWith("/")) return "/dashboard";
  if (target.startsWith("//") || target.startsWith("/\\")) return "/dashboard";
  return target;
}

export default function AuthForm({ mode, telegramBotUsername }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirect(searchParams.get("redirect"));
  const refCode = searchParams.get("ref")?.trim().toLowerCase().slice(0, 32) || undefined;
  const telegramError = searchParams.get("telegram_error");

  const isSignup = mode === "signup";
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(
    telegramError ? TELEGRAM_ERROR_MESSAGES[telegramError] ?? TELEGRAM_ERROR_MESSAGES.invalid : null,
  );
  const [notice, setNotice] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSignup && !agreed) {
      setError("Please accept the Terms and Risk Disclaimer to continue.");
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    const supabase = createClient();

    try {
      if (isSignup) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: fullName, ref_code: refCode } },
        });
        if (signUpError) throw signUpError;
        if (data.session) {
          router.push(redirectTo);
          router.refresh();
        } else {
          setNotice("Account created. Check your email to confirm, then log in.");
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      {isSignup && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fullName" className="text-sm font-medium text-foreground">
            Full name
          </label>
          <input
            id="fullName"
            type="text"
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
            placeholder="Jane Heister"
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className="text-sm font-medium text-foreground">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
          placeholder="you@example.com"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className="text-sm font-medium text-foreground">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          autoComplete={isSignup ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
          placeholder="••••••••"
        />
        {!isSignup && (
          <Link
            href="/forgot-password"
            className="self-end text-xs font-medium text-muted transition-colors hover:text-accent-strong"
          >
            Forgot password?
          </Link>
        )}
      </div>

      {isSignup && (
        <label className="flex items-start gap-2.5 text-xs text-muted">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
          />
          <span>
            I&rsquo;m 18+ and agree to the{" "}
            <Link href="/terms" className="text-accent-strong hover:underline">
              Terms
            </Link>
            ,{" "}
            <Link href="/privacy" className="text-accent-strong hover:underline">
              Privacy Policy
            </Link>
            , and{" "}
            <Link href="/risk" className="text-accent-strong hover:underline">
              Risk Disclaimer
            </Link>
            . Signals are educational, not financial advice.
          </span>
        </label>
      )}

      {error && (
        <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 text-sm text-accent-strong">
          {notice}
        </p>
      )}

      <Button type="submit" size="lg" className="mt-1 w-full" disabled={loading}>
        {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        {isSignup ? "Create account" : "Log in"}
      </Button>

      {telegramBotUsername && (
        <div className="flex flex-col items-center gap-4">
          <div className="flex w-full items-center gap-3 text-xs uppercase tracking-wide text-muted">
            <span className="h-px flex-1 bg-border-subtle" />
            or
            <span className="h-px flex-1 bg-border-subtle" />
          </div>
          <TelegramLoginButton
            botUsername={telegramBotUsername}
            authUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/telegram`}
          />
          <p className="text-center text-xs text-muted">
            Only works if you&rsquo;ve already linked Telegram from your dashboard.
          </p>
        </div>
      )}

      <p className="text-center text-sm text-muted">
        {isSignup ? (
          <>
            Already a heister?{" "}
            <Link href="/login" className="font-medium text-accent-strong hover:underline">
              Log in
            </Link>
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="font-medium text-accent-strong hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
