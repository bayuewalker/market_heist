import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import AdminNav from "@/components/admin/AdminNav";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdmin();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <AdminNav email={user.email ?? ""} />
      <main className="flex-1 px-5 py-8 sm:px-8">{children}</main>
    </div>
  );
}
