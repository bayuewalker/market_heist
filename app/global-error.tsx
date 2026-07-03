"use client";

// global-error replaces the root layout when it renders, so it must define
// its own <html>/<body> and can't rely on the app's Tailwind build having
// been applied to this boundary — hence inline styles here.
export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.5rem",
          textAlign: "center",
          background: "#040806",
          color: "#f4f7f5",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>Something went wrong</h2>
        <p style={{ maxWidth: 360, fontSize: "0.875rem", color: "#9fb0a8" }}>
          A critical error occurred. Please try again.
        </p>
        <button
          onClick={() => unstable_retry()}
          style={{
            borderRadius: 9999,
            padding: "0.625rem 1.5rem",
            fontWeight: 600,
            background: "#2fe28a",
            color: "#06120d",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
