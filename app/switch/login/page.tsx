import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, isGitHubAuthConfigured, signIn } from "@/auth";
import { isDatabaseConfigured } from "@/db/drizzle";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "sign in · switch",
  robots: { index: false, follow: false },
};

/** Auth.js reports failures by redirecting back here with ?error=<code>. */
const ERRORS: Record<string, string> = {
  AccessDenied: "that github account is not allowed to sign in here.",
  Configuration: "github login is misconfigured — check AUTH_GITHUB_ID, AUTH_GITHUB_SECRET and the callback url.",
  OAuthAccountNotLinked: "that email is already linked to a different sign-in method.",
  OAuthCallbackError: "github rejected the callback. the callback url probably does not match the oauth app.",
  Verification: "that sign-in link has expired.",
};

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-h-[55vh] flex flex-col justify-center">
      <p className="text-xs uppercase tracking-[0.2em] text-neutral-500 mb-3">private</p>
      <h1 className="font-semibold text-3xl tracking-tight text-neutral-100 mb-4">switch.</h1>
      <p className="text-neutral-400 leading-relaxed max-w-md mb-6">{title}</p>
      {children}
    </section>
  );
}

export default async function SwitchLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isDatabaseConfigured) {
    return (
      <Shell title="database setup is required before you can sign in.">
        <p className="text-sm text-neutral-600 max-w-lg">
          add <code className="text-neutral-400">DATABASE_URL</code> to{" "}
          <code className="text-neutral-400">.env.local</code>, apply the migration, and restart the app.
        </p>
      </Shell>
    );
  }

  if (!isGitHubAuthConfigured) {
    return (
      <Shell title="github login is not configured yet.">
        <p className="text-sm text-neutral-600 max-w-lg">
          create a github oauth app, then set{" "}
          <code className="text-neutral-400">AUTH_GITHUB_ID</code>,{" "}
          <code className="text-neutral-400">AUTH_GITHUB_SECRET</code> and{" "}
          <code className="text-neutral-400">AUTH_SECRET</code>. the callback url must be{" "}
          <code className="text-neutral-400">/api/auth/callback/github</code> on this origin.
        </p>
      </Shell>
    );
  }

  const session = await auth();
  if (session?.user) redirect("/switch/dashboard");

  const { error } = await searchParams;

  return (
    <Shell title="your solved problems, the code, and your private notes.">
      {error && (
        <p className="text-sm text-red-400 mb-6 max-w-lg">
          {ERRORS[error] ?? `sign-in failed (${error}).`}
        </p>
      )}
      <form action={async () => {
        "use server";
        await signIn("github", { redirectTo: "/switch/dashboard" });
      }}>
        <button className="px-4 py-2 border border-neutral-700 text-sm text-neutral-200 hover:border-neutral-400 hover:text-white transition-colors">
          continue with github →
        </button>
      </form>
    </Shell>
  );
}
