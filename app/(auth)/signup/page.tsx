import { Suspense } from "react";
import type { Metadata } from "next";
import AuthForm from "@/components/auth/AuthForm";

export const metadata: Metadata = {
  title: "Create account",
};

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">Become a Market Heister</h1>
        <p className="text-sm text-muted">Create your free account to get started.</p>
      </div>
      <Suspense fallback={<div className="h-80" />}>
        <AuthForm mode="signup" />
      </Suspense>
    </div>
  );
}
