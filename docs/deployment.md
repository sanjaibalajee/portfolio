# Deploy to Cloudflare and Vercel

The Next.js portfolio runs on Vercel; the Party WebSocket backend runs on Cloudflare Workers with SQLite Durable Objects. The local Node companion is for development. Deploying the Next.js project does not start that companion.

## 1. Validate and select the release

Use Node.js 22, matching `.nvmrc` and `package.json`:

```sh
nvm use
npm ci
npm run check
npm audit
npx --no-install drizzle-kit check
npm run party:worker:check:staging
git diff --check
git status --short
```

`check` includes lint, application types, Markdown tests, server regressions, Party tests, Worker types/bundling and the Webpack production build. It does not start browsers or contact a live database. The WebSocket test binds an isolated local port. The server regression uses an in-memory Postgres instance with the Neon transport replaced.

Deploy a reviewed commit and record its SHA before publishing. Keep `.env*` secrets, `.party-data`, `.wrangler`, `node_modules`, build output, design proposals and local review notes out of commits. Preserve `AGENTS.md` and source licenses. Local drafts and review history belong in ignored `drafts/`.

## 2. Deploy an isolated staging Worker

```sh
npx --no-install wrangler login
npx --no-install wrangler whoami
```

Confirm the intended Cloudflare account and Workers subdomain. The staging `ALLOWED_ORIGINS` in `workers/party/wrangler.jsonc` is `https://staging.sanjaibalajee.com`. Connect that hostname to the intended Vercel staging deployment and ensure DNS/TLS work before testing. Allow other preview hosts explicitly when needed, including `https://` and without a trailing slash. Do not allow every `*.vercel.app` site.

The staging Worker is named `sanjai-party-staging`. Its room and quota bindings belong to that Worker, keeping them separate from production. Environment bindings/variables are repeated explicitly because Wrangler does not inherit those fields. Preserve the top-level `v1` migration and both exported classes (`PartyRoom`, `PartyQuota`) in every future release. Do not mix a new Durable Object lifecycle format into this rollout. See [Cloudflare environments](https://developers.cloudflare.com/workers/wrangler/environments/) and [migration guidance](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/).

```sh
npm run party:worker:check:staging
npm run party:worker:deploy:staging
```

Copy the HTTPS Worker URL returned by deployment. Curated games work immediately without an AI key. If Group Lore is required, rotate the Groq key before enabling public AI, then enter the new key at the hidden prompt:

```sh
npx --no-install wrangler secret put GROQ_API_KEY --config workers/party/wrangler.jsonc --env staging
```

Secrets are scoped to each Worker environment; repeat the secret command separately for production when ready. Keep `GROQ_API_KEY` off Vercel and out of tracked files. AI limits are 5 requests/day in staging and 40/day in production, enforced by separate quota objects. Review provider limits and actual cost before changing those values. [Cloudflare secret management](https://developers.cloudflare.com/workers/configuration/secrets/).

## 3. Configure Vercel Preview

Use the existing portfolio project, with repository root `./`, framework Next.js, Node.js 22.x and automatic `.next` output. `vercel.json` supplies `npm ci` and `npm run build`; the build uses Webpack. Do not set an `out`/static-export output directory. [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

Add these variables in the project's **Preview** environment, using an isolated Neon branch/database and a separate preview OAuth App when testing private sign-in:

| Variable | Value / purpose |
| --- | --- |
| `DATABASE_URL` | Preview Neon connection string, with the existing guestbook/auth/Switch schema |
| `AUTH_SECRET` | Strong random secret; shared with anonymous blog likes |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | Preview GitHub OAuth App credentials |
| `ALLOWED_GITHUB_ID` | `87613424`, the owner account's immutable GitHub ID |
| `AUTH_TRUST_HOST` | `true` (the app also sets this explicitly) |
| `SWITCH_INGEST_TOKEN` | Shared with the private sync job; use preview credentials for preview testing |
| `PARTY_SERVER_URL` | `https://<staging-worker-host>` |
| `PARTY_WS_URL` | `wss://<staging-worker-host>` |

The two Party URLs are public connection information passed by the server to the browser. No `NEXT_PUBLIC_` prefix is needed. Do not put `GROQ_API_KEY`, `PARTY_PORT`, `PARTY_HOST`, `PARTY_ALLOWED_ORIGINS` or `PARTY_DATA_DIR` on Vercel. Local room files are not production storage.

The Trigger.dev task remains a separate deployment. Its LeetCode cookies, `INGEST_URL` and `INGEST_TOKEN` belong in Trigger.dev. Set production `INGEST_URL=https://www.sanjaibalajee.com/api/switch/ingest`; retain the existing token so it matches Vercel's `SWITCH_INGEST_TOKEN`. Update the dashboard value even if local `.env.trigger` is already corrected. Use the canonical endpoint directly: cross-host redirects can strip the bearer authorization header. Preview uses its own deployed ingest URL and token. `TRIGGER_PROJECT_REF` is not a Vercel runtime requirement.

Environment changes apply to a new deployment, so redeploy after changing them. Use the Git-connected branch's preview deployment; keep a record of its commit and URL. Preview protection may require signing in before testing. [Vercel environment variables](https://vercel.com/docs/environment-variables).

## 4. Prepare only the additive likes table

Verify the selected database target in a trusted shell. Supply its `DATABASE_URL` through your secret manager or a hidden prompt; do not paste credentials into command history. An exported value takes precedence over `.env.local` in this script.

```sh
npm run db:likes
```

Run this separately for preview and production if their table is absent. It is safe to rerun and checks the expected columns. **Do not run `npm run db:migrate` against an existing portfolio database as part of this release:** `drizzle/0000_switch_rewrite.sql` contains DROP statements. A genuinely new database needs a separately reviewed baseline, not a blind replay. Existing guestbook records must remain intact. The ingest fix changes transaction behavior without requiring a new schema.

## 5. Verify the hosted preview

First verify CORS without creating a room. Substitute the actual Worker and preview origins:

```sh
curl -i -X OPTIONS 'https://<staging-worker-host>/rooms' -H 'Origin: https://<preview-host>' -H 'Access-Control-Request-Method: POST'
curl -i -X OPTIONS 'https://<staging-worker-host>/rooms' -H 'Origin: https://untrusted.example' -H 'Access-Control-Request-Method: POST'
```

Expect 204 with the exact allowed origin, and 403 for the untrusted origin. The Worker intentionally rejects requests with no Origin; a bare `curl /` is not a health check.

- With at least three connected browser seats, complete create/join → private role → answers/votes → reveal → rematch. Verify a second room cannot see the first room's data.
- Reopen a seat in another tab, then background/foreground the displaced tab. It must remain closed until explicit reload. Test a connection drop and a mobile sleep/wake; pending votes/answers must not score twice.
- Check host handover after its 60-second disconnect grace, deadlines while clients sleep, consent withdrawal, an unconsenting display, and one-phone play without the backend.
- Confirm homepage/blog HTML and Markdown, `/index.md`, `/llms.txt`, `/feed.xml`, `/robots.txt`, `/sitemap.xml`, sharing images and unknown-route 404s.
- Confirm likes persist with a second browser, private Switch sign-in is owner-only, and a sync retry preserves submissions. Make guestbook/likes test writes only in the preview database and remove them afterward.
- Before enabling public guestbook writes, configure a Vercel Firewall rule for `POST /api/guestbook`, starting with a per-IP threshold such as 5/minute and a 429/block response. Verify the rule on the current plan. Origin checks, an 8 KiB input cap and shared validation are in code; they are not a distributed spam throttle. [WAF rate limiting](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting).

Use two independent physical devices, including mobile Safari if supported. Automated Chromium tests and local Wrangler tests do not certify hosted hibernation, real mobile networks or provider account configuration.

## 6. Production: Worker first, then frontend

1. Recheck the release SHA and staging evidence. Record the previous Vercel deployment and Worker version for rollback.
2. Production `ALLOWED_ORIGINS` contains only `https://www.sanjaibalajee.com` and `https://sanjaibalajee.com`. Localhost access belongs in ignored `.dev.vars`; a no-secret example is supplied beside the Worker.
3. Run `npm run party:worker:check`, then `npm run party:worker:deploy`. These commands explicitly target the top-level production environment (`--env ""`). Copy its returned URL. Add the optional rotated Groq key with `npx --no-install wrangler secret put GROQ_API_KEY --config workers/party/wrangler.jsonc --env ""` only when ready for AI use.
4. Set Vercel **Production** variables using production credentials and `https://<production-worker-host>` / `wss://<production-worker-host>`. Ensure the additive likes table exists, the guestbook Firewall rule is active, and OAuth callback is `https://www.sanjaibalajee.com/api/auth/callback/github`.
5. Review any existing `AUTH_URL`/`NEXTAUTH_URL` override; remove stale `.me` values or set the intended canonical production URL. Use preview-specific callbacks when testing previews.
   In Trigger.dev, set `INGEST_URL=https://www.sanjaibalajee.com/api/switch/ingest` in Production and verify it can read the watermark with the matching token. Changing ignored `.env.trigger` does not update the hosted task's environment.
6. Deploy the reviewed SHA through the production branch configured in Vercel, or create a staged **Production-target** deployment using Vercel's documented flow before assigning production domains. Do not blindly promote a Preview deployment carrying preview database/Worker credentials; verify the target environment first. [Deployment promotion](https://vercel.com/docs/deployments/promoting-a-deployment).
7. Repeat the CORS and gameplay smoke checks on the public URLs. Inspect Vercel errors, Worker exceptions, quota usage and reconnects. Stop if authorization, private-state exposure, duplicate scoring, database errors or missing content metadata appears.
8. In Vercel Domains, attach the canonical www `.com`, `.com` apex and both legacy `.me` hosts. Use the dashboard's exact DNS records, wait for TLS, then verify a deep path and query redirect with 308 to www `.com`. DNS/TLS must work before the app's redirects can run. Do not guess DNS records from older notes.

Keep API/negotiated Markdown/WebSocket traffic out of any Cloudflare “cache everything” rule if Cloudflare also manages your DNS or proxy. Do not enable caching of private or negotiated responses.

## Rollback

Roll the frontend back to its recorded prior Vercel deployment if the release fails. If only multiplayer is affected, clear both Party URLs and redeploy to leave one-phone games available. Restore a prior Worker version only when it is compatible with current stored rooms; do not delete Durable Object namespaces, remove migration history, or replay the destructive database migration. The additive likes table can remain. AI can be disabled independently by removing the Worker secret.

## GitHub Actions updates

The repository has two independent workflows:

| Workflow | Validates on relevant pull requests | Deploys after relevant pushes to `main` |
| --- | --- | --- |
| [Cloudflare Party](../.github/workflows/cloudflare.yml) | Party lint, all Party tests, production and staging Worker dry runs | Production `sanjai-party` Worker |
| [Trigger.dev sync](../.github/workflows/trigger.yml) | Sync lint, generated Next.js types, application types and isolated server regressions | Production tasks in the project from `trigger.config.ts` |

Source, shared code, dependencies, Node version and each workflow's own file are included in its path filters. Blog-only edits do not redeploy either service. Pull requests run validation without deployment credentials. Validation does not execute the scheduled LeetCode task or make live database writes.

Both workflows also offer **Run workflow** with a `staging` or `production` choice. The default is staging. Production requires the latest `main` commit; a feature branch cannot deploy production. Deployments for each service/environment run one at a time without cancelling an active deployment. Jobs use the existing GitHub `Preview` and `Production` environments and respect their protection rules.

### Configure GitHub credentials once

In [repository Actions secrets](https://github.com/sanjaibalajee/portfolio/settings/secrets/actions), add:

| Secret | Purpose |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | The account containing the Party Workers |
| `CLOUDFLARE_API_TOKEN` | An API token scoped to that account, with the permissions needed to edit the Workers and their Durable Object bindings |
| `TRIGGER_ACCESS_TOKEN` | A production deployment key for the project in `trigger.config.ts` |
| `TRIGGER_STAGING_ACCESS_TOKEN` | A separate staging deployment key; needed only for manual Trigger.dev staging deployments |

Use Cloudflare's [CI authentication instructions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/) to scope the token. Use a Trigger.dev environment API key with **Deploy only** access, following its [GitHub Actions instructions](https://trigger.dev/docs/github-actions). Each Trigger.dev key must match the selected environment. Keys can instead be stored in the matching GitHub environment with the same names; environment secrets take precedence over repository secrets.

The GitHub CLI can prompt for each secret without placing its value in command history:

```sh
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
gh secret set TRIGGER_ACCESS_TOKEN
# Only if using Trigger.dev staging:
gh secret set TRIGGER_STAGING_ACCESS_TOKEN
```

For Cloudflare staging, set the repository Actions **variable** `PARTY_STAGING_ALLOWED_ORIGINS` to `https://staging.sanjaibalajee.com`, matching the staging Worker config. Multiple exact origins may be comma-separated, without spaces or trailing slashes. The workflow checks this value and overrides the tracked staging allowlist only for that deployment. It rejects missing values, wildcards and the placeholder. Keep production origins in `workers/party/wrangler.jsonc`.

The staging origin variable is configured for `https://staging.sanjaibalajee.com`. No deployment credentials were configured as part of adding these workflows. A deployment fails with the missing secret's name until its credentials are supplied. After merging the workflows to `main`, use [Actions](https://github.com/sanjaibalajee/portfolio/actions) to run staging validation/deployment, then follow the hosted checks above before production rollout.

### Runtime configuration remains with each provider

- `GROQ_API_KEY` remains a Cloudflare Worker secret, set separately for staging and production. Ordinary code deployments do not rotate it.
- `LEETCODE_SESSION`, `LEETCODE_CSRF_TOKEN`, `INGEST_URL` and `INGEST_TOKEN` remain in the selected Trigger.dev environment. They are not copied from local `.env.trigger` or stored in Actions. Production ingest must use `https://www.sanjaibalajee.com/api/switch/ingest` directly and match Vercel's ingest token.
- Trigger.dev deploys the task definition, including its existing 02:00 India-time schedule; the workflow does not invoke a sync. The CLI version is read from the SDK installed by `npm ci`, so it matches the lockfile instead of floating to `latest`. PR validation checks types and server regressions; bundling and provider registration occur in the authenticated deployment job.
- Vercel continues to deploy through its existing Git integration. Neither workflow changes frontend connection URLs, deploys the frontend, applies database migrations or orders Vercel's deployment relative to the Worker. Coordinate the first rollout as described above, and keep future Worker/client changes compatible while both deploy.
- If Cloudflare Builds or Trigger.dev's native GitHub integration is enabled for this repository, choose one deployment mechanism for each service to avoid duplicate deployments.
