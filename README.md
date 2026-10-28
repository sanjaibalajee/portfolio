# sanjai balajee

Portfolio built with Next.js 16.4, React 19 and Tailwind CSS 4.

## setup

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Database-backed pages use `DATABASE_URL` in `.env.local`.

## commands

```bash
npm run dev            # development server
npm run build          # production build
npm run start          # serve the production build
npm run lint
npm run check         # lint, types, tests, Worker dry run and production build
npm run test:markdown  # content negotiation and Markdown output
npm run db:likes       # add only the blog likes table; safe to rerun
```

## agent view

The homepage and blog have a human/agent switch that displays the actual response to `Accept: text/markdown`. The homepage uses `lib/portfolio-data.ts` in both formats. Blog Markdown is generated from each post's MDX, with text or links for its visual components.

- `/index.md` serves the homepage as Markdown.
- `/blog/index.md` serves the blog index. Posts use `/blog/<slug>.md`.
- `/llms.txt` links to the homepage, published blog Markdown and public pages.
- `proxy.ts` negotiates the homepage and blog formats, respects Accept quality values and excludes RSC requests at the matcher.
- Homepage and blog HTML is prerendered. Proxy rewrites Markdown requests before the cache and sends `Vary: Accept`; Markdown responses are not shared-cached.
- The canonical domain is defined in `lib/site.ts`. The sitemap excludes private pages.

## themes

The header's theme button switches between light and dark mode. The initial theme follows the system, and an explicit choice persists in the browser. Tailwind's `dark` variant follows the root class. Architecture sketches use the same theme choice, including when it differs from the system.

Use [the deployment guide](docs/deployment.md) for release checks and hosting configuration.

## writing and homepage content

The homepage's selected work and dated currently note live in `lib/portfolio-data.ts`. Recent writing, blog descriptions, publication dates and related posts use `app/blog/blogposts.json`. Reading times come from the article prose. Both human and agent views include the new content.

`/feed.xml` serves an RSS feed of published posts. MDX headings receive stable, unique IDs during compilation; their links can be copied, and the Outworld timeline links into its sections. Each published article has related reading and matching Open Graph/Twitter metadata. `/og/home` and `/og/<published-slug>` generate 1200 × 630 sharing images on this site's own domain.

Published posts remember unfinished reading positions in this browser's local storage. On return, a small prompt offers **continue reading** or **start over**. Positions are scoped to each post, use a section-relative offset for different screen sizes, and clear when the reader reaches the end. Section links and native scroll restoration keep priority; agent-mode scrolling is excluded. No account, server-side reading history or new service is involved.

## anonymous blog likes

Published articles have shared likes without sign-in. A signed, HTTP-only browser cookie identifies a reader. The database stores a hash and post slug, with a composite primary key preventing duplicate likes on retries. Readers can undo their like. No IP addresses or account details are stored. Clearing cookies or using another browser creates another anonymous identity.

Likes require `DATABASE_URL` and `AUTH_SECRET`. Run `npm run db:likes` to prepare just the additive `blog_likes` table. Do not replay the historical Switch migration as part of setting up likes: it contains destructive statements. Database failures leave the article readable and show a retry state instead of a made-up count.

## domain migration

The canonical host is `https://www.sanjaibalajee.com`. Application redirects cover `sanjaibalajee.me`, `www.sanjaibalajee.me`, and the `.com` apex, preserving paths and queries with HTTP 308. Metadata, sharing images, Markdown, RSS and sitemap links use the canonical `.com` host.

Redirect code runs only after DNS and TLS reach the deployment. Attach the old `.me` hosts to the same hosting project, configure their DNS using the host's instructions, and ensure certificates are issued before testing redirects. The GitHub OAuth App's homepage should be `https://www.sanjaibalajee.com` and its callback `https://www.sanjaibalajee.com/api/auth/callback/github`. If deployment environment variables such as `AUTH_URL` or `NEXTAUTH_URL` still name `.me`, update them there.

Trigger.dev's production `INGEST_URL` must also be `https://www.sanjaibalajee.com/api/switch/ingest`, with `INGEST_TOKEN` matching Vercel's `SWITCH_INGEST_TOKEN`. Update the hosted environment separately from any local `.env.trigger` file. Remaining `.me` references are intentional legacy redirects, negative test assertions.

See [the deployment guide](docs/deployment.md) for the remaining hosting steps.

## Party games

Run `npm run dev:all` to start the portfolio and local multiplayer server, then open `/party`. Engineering notes, rules, validation, and Cloudflare deployment steps are in [docs/party/README.md](docs/party/README.md).

## Deploy

Use Node.js 22 (`nvm use`). The production build uses Webpack so the checked local build and Vercel use the same command. [docs/deployment.md](docs/deployment.md) covers the Cloudflare Worker, an isolated staging environment, Vercel variables, the additive database setup, domain/OAuth checks, and rollback. Deploy the Worker before the Vercel frontend.
