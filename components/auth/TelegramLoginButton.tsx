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

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", size);
    script.setAttribute("data-radius", "10");
    script.setAttribute("data-auth-url", authUrl);
    script.setAttribute("data-request-access", "write");
    container.appendChild(script);

    return () => {
      container.replaceChildren();
    };
  }, [botUsername, authUrl, size]);

  return <div ref={containerRef} className="flex justify-center" />;
}
