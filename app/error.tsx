"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "@/components/ui/Button";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-500/10 text-rose-300">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted">
        An unexpected error occurred. Try again, or head back to the dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={() => unstable_retry()}>Try again</Button>
        <Button href="/dashboard" variant="secondary">
          Go to dashboard
        </Button>
      </div>
    </div>
  );
}
