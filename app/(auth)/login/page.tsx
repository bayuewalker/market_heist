import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Log in",
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
        <p className="text-sm text-muted">Log in to your Market Heist dashboard.</p>
      </div>
      <Suspense fallback={<div className="h-72" />}>
        <AuthForm mode="login" />
      </Suspense>
    </div>
  );
}
