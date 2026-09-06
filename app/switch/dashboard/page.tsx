import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { SwitchDashboard } from "@/components/switch-dashboard";
import { isDatabaseConfigured } from "@/db/drizzle";
import { getSwitchDashboard } from "@/lib/switch/data";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "dashboard · switch",
  robots: { index: false, follow: false },
};

export default async function SwitchDashboardPage() {
  if (!isDatabaseConfigured) redirect("/switch/login");
  const session = await auth();
  if (!session?.user) redirect("/switch/login");
  const data = await getSwitchDashboard();

  return (
    <section>
      <div className="flex items-baseline justify-between gap-4 mb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-2">private</p>
          <h1 className="font-semibold text-3xl tracking-tight text-neutral-100">switch.</h1>
        </div>
        <form action={async () => {
          "use server";
          await signOut({ redirectTo: "/switch" });
        }}>
          <button className="text-xs text-neutral-500 hover:text-neutral-200 transition-colors">sign out</button>
        </form>
      </div>
      <SwitchDashboard initialData={data} />
    </section>
  );
}
