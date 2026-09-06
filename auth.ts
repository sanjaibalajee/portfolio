import NextAuth from "next-auth";
import GitHub from "next-auth/providers/github";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db/drizzle";
import { accounts, sessions, users, verificationTokens } from "@/db/schema";

export const isGitHubAuthConfigured = Boolean(
  process.env.AUTH_SECRET &&
  process.env.AUTH_GITHUB_ID &&
  process.env.AUTH_GITHUB_SECRET,
);

/** Immutable numeric GitHub account id for the single account allowed to sign in. */
const ALLOWED_GITHUB_ID = process.env.ALLOWED_GITHUB_ID?.trim() || "87613424";

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Vercel and the local Next.js server both sit behind a trusted host header.
  // The GitHub account allowlist below remains the authorization boundary.
  trustHost: true,
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  providers: [
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: "/switch/login",
    error: "/switch/login",
  },
  callbacks: {
    signIn({ account }) {
      // The numeric id cannot be reassigned by renaming an account, so it is the
      // only field worth trusting here.
      return account?.provider === "github" && account.providerAccountId === ALLOWED_GITHUB_ID;
    },
  },
});
