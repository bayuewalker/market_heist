"use client";

import { useEffect, useRef } from "react";

type TelegramLoginButtonProps = {
  botUsername: string;
  authUrl: string;
  size?: "large" | "medium" | "small";
};

/**
 * Renders Telegram's official Login Widget (https://core.telegram.org/widgets/login).
 * Uses `data-auth-url` (redirect mode) rather than the JS-callback mode, so
 * there's no client-side glue code — Telegram itself navigates the browser
 * to our callback route with a signed payload once the user authorizes.
 *
 * Requires the bot's domain to be registered via @BotFather's /setdomain —
 * the widget silently refuses to render otherwise (see SETUP.md).
 */
export default function TelegramLoginButton({ botUsername, authUrl, size = "large" }: TelegramLoginButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    // Fetch a one-time nonce (bound to this browser via an HttpOnly cookie)
    // and carry it as `state` in the redirect URL — the callback route
    // rejects anything that doesn't match, so a captured/leaked callback URL
    // can't be replayed on a different browser. If the nonce fetch fails,
    // deliberately fall back to no `state` param rather than skipping it —
    // the callback then rejects with `invalid_state` (fails closed).
    (async () => {
      let finalAuthUrl = authUrl;
      try {
        const res = await fetch("/api/auth/telegram/nonce");
        const data = await res.json();
        if (data?.nonce) {
          finalAuthUrl = `${authUrl}${authUrl.includes("?") ? "&" : "?"}state=${encodeURIComponent(data.nonce)}`;
        }
      } catch {
        // handled by the fail-closed fallback above
      }
      if (cancelled || !container) return;

      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", size);
      script.setAttribute("data-radius", "10");
      script.setAttribute("data-auth-url", finalAuthUrl);
      script.setAttribute("data-request-access", "write");
      container.appendChild(script);
    })();

    return () => {
      cancelled = true;
      container.replaceChildren();
    };
  }, [botUsername, authUrl, size]);

  return <div ref={containerRef} className="flex justify-center" />;
}
