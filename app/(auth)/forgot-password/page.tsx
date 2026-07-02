import type { Metadata } from "next";
import ForgotPasswordForm from "@/components/auth/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
};

export default function ForgotPasswordPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-bold text-foreground">Reset your password</h1>
        <p className="text-sm text-muted">We&rsquo;ll email you a link to set a new one.</p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
