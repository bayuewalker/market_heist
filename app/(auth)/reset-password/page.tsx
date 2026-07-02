import { Suspense } from "react";
import type { Metadata } from "next";
import ResetPasswordForm from "@/components/auth/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Set a new password",
};

export default function ResetPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">Set a new password</h1>
        <p className="text-sm text-muted">Choose a strong password for your account.</p>
      </div>
      <Suspense fallback={<div className="h-40" />}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
