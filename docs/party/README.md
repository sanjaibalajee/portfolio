# Party

The portfolio's `/party` tab supports one phone passed around a group, or a private WebSocket room with everyone's own phone. There are seven games: Imposter, Psych funny answers, factual bluff, Wrong Question, Who Said That, Same Brain, and Drawing Relay. Party Mix rotates between available games while retaining scores, seats, and content history. Setup offers game cards, available topic buttons, and an optional 18+ mix. Timers and difficulty have sensible defaults. Every game has a short description.

## Run locally

```sh
npm install
npm run dev:all
```

For local Cloudflare development, copy `workers/party/.dev.vars.example` to `workers/party/.dev.vars` so localhost is allowed. The production allowlist intentionally contains only the public site origins.

Open `http://localhost:3000/party`. The Next.js site and the WebSocket companion are separate processes; `npm run dev` alone starts only the portfolio. Alternatively run `npm run dev` and `npm run dev:party` in two terminals. The companion defaults to loopback port 8787 and stores private room snapshots in ignored `.party-data/` with restricted file permissions.

For phones on the same Wi-Fi, set `PARTY_HOST=0.0.0.0` and add the exact LAN site origin, including its port, to `PARTY_ALLOWED_ORIGINS`. Open the portfolio at the computer's LAN IP. For a different companion port, set `PARTY_PORT` and `PARTY_SERVER_URL`; otherwise the development client uses its current hostname on port 8787. Use HTTPS and WSS for public hosting.

Keep any local Groq key in ignored `.env.local` and rotate previously shared keys before public use. The Node companion reads it server-side; browser bundles receive only connection URLs. Curated packs work with no key. Never use a `NEXT_PUBLIC_` variable for the key.

## Public deployment

The production backend is a Cloudflare Worker with one SQLite Durable Object per room. The Next.js portfolio can remain on its current host. The local file adapter is intended for development and a single process; it is not a replacement for the Durable Object deployment.

Use [the deployment guide](../deployment.md) for the ordered staging, Vercel, database and production rollout.

1. Authenticate Wrangler to the intended Cloudflare account. Review `workers/party/wrangler.jsonc`, especially the allowed site origins and AI daily limit.
2. Run `npm run party:worker:check` for TypeScript and a deployment dry run.
3. Set the key with `npx wrangler secret put GROQ_API_KEY --config workers/party/wrangler.jsonc`. Supply the rotated key through the hidden prompt. Never put it in the tracked config.
4. Deploy with `npm run party:worker:deploy`. The `v1` migration creates `PartyRoom` and `PartyQuota`; retain migration history on future releases.
5. Set `PARTY_SERVER_URL=https://<worker-host>` and `PARTY_WS_URL=wss://<worker-host>` on the portfolio host and redeploy it. Deploy the updated Worker before the frontend, because the lobby now requires stock metadata. Without a production connection URL, room creation stays unavailable; one-phone play still works.
6. Verify create/join, a private role, a completed round, a mobile reconnect, a host handover, and a live Group Lore request from two independent devices against the deployed URLs.

Physical-device Safari/Chrome and a real group playtest remain required release checks after deployment.

## Rules and boundaries

- New players join ready to play, including the host. 3–12 connected players start a room round. Joining mid-round reserves a seat for the next round. One active socket is allowed per seat; reconnecting replaces its old socket.
- Room codes locate rooms; random 256-bit seat credentials authenticate players. Only their SHA-256 hashes are stored on the server. Credentials travel in the first socket frame, not URL query strings. WebSocket origins are checked.
- The host controls settings and phase advancement but has no privileged access to other roles or future cards. A disconnected host has a 60-second grace period before a connected player inherits hosting.
- Accepted transitions persist before broadcast and acknowledgement. Action IDs prevent duplicate scoring and writes. Stale round IDs cannot answer a new round. Server deadlines advance phases even when all phones are asleep. Expired rooms close after 12 hours; the production alarm removes their stored state.
- Private views omit other roles, answer authors, correct answers, hidden votes, future cards, and RNG. The optional display is read-only. Adult content stays hidden from unconsenting late seats and displays.
- Adult rounds require every participating player to confirm 18+ and opt in. Withdrawing consent or one adult-round veto cancels the round without revealing answers or changing scores. Confidence tokens from a cancelled round are refunded. General rounds require half the participants to request a skip.
- Imposter and Wrong Question award 2 for a correct individual vote; an outlier who avoids the unique top vote receives 3. A tie lets the outlier escape. Psych funny awards 1 to the author per vote. Factual bluff awards 2 for finding the truth and 1 per fooled voter; an exactly matching submitted truth earns 2. Identical options merge and share author credit. Same Brain awards 2 to each player whose normalised answer matches someone else. Drawing Relay is unscored. Confidence adds 2 for a correct guess or subtracts 1 for a wrong one, with 3 tokens per player for the party.
- Drawing Relay rotates each chain between players for 3 steps with 3–4 players and 5 steps with larger groups. Each chain starts with a different unseen prompt. A relay needs one fresh prompt per player. Empty topics and insufficient starting stock are distinguished from genuine exhaustion. Each player sees only their current task. Pointer coordinates, colours, strokes and payload sizes are bounded. Large snapshots are split into storage chunks and committed atomically.
- Content history stores stable family and concept IDs across rematches, settings changes, and room reloads. Exhaustion never silently resets history or widens filters. The host must change filters, generate more cards, or explicitly allow replay. A new room starts fresh history; there is no cross-room tracking or account profile.
- Ratings include lower-rated cards so the 18+ setting is a mix. Difficulty unlocks progressively more specific word banks and authored prompts. Topic buttons show only combinations with enough starting stock for the selected game, audience and group size. Real depletion still requires a deliberate topic change or replay choice.

Imposter offers Easy, Tricky and Devious word settings across 1,867 words and phrases. The full 1,509-entry baseline bank is retained alongside 334 new entries and the existing 24 adult words. The new pack contains 214 general and 120 explicit adult entries and receives a selection preference so it appears regularly alongside the larger bank. When both ratings are available, the 18+ setting selects adult rounds 55% of the time and lighter rounds 45%, independently of pack sizes. After hours selects the adult pack. Adult words require group agreement or per-seat consent. Word-family and concept history prevents repeats across settings.

## One phone

Add 3–12 names, including the host, and choose a topic. The curated game engine loads on demand and does not need the room server. Each turn starts with a named cover. Imposter cards require a deliberate hold, hide on release, and require explicit confirmation before the next handoff. There are no imposter hints. Blur, hidden-page events, pagehide and Escape remove private UI immediately. A confirmed card cannot be reopened through the normal flow. New group explicitly clears saved names and used-content history for a fresh party.

Psych, Bluff, Who Said That, Same Brain and Drawing Relay use private entries and covered voting/relay turns. Who Said That gives the author a covered turn as well, so an absent voting turn cannot identify them; their confirmation never creates a scored vote. Imposter and Wrong Question use an unscored shared accusation on one phone rather than fabricated individual ballots.

Only names, settings, SHA-256 used-content IDs and a round-in-progress marker are saved. Roles, words, answers, votes and drawings stay in memory. Reload discards the active round, returns to setup, and requires an explicit new deal; used content remains used. Storage-blocked browsers retain history only for the current in-memory session. Adult play requires group agreement and any person can end a round without revealing private content. The cover protects against accidental peeking, not deliberate access to browser internals or screenshots.

Group Lore is available in WebSocket rooms. It remains optional and server-side; one-phone play uses the curated catalogue. No service worker is installed, so offline first-load/reload is not promised.

## Group Lore

The host requests a small reserve pack from a theme or anonymous inside joke. Only that context and content settings go to Groq; participant identities, submitted answers, votes and roles are not sent. Context is treated as untrusted data, and links/email addresses are stripped. Context may still contain identifying information the host typed, so the UI explicitly asks them to omit it.

Generation uses strict JSON with `openai/gpt-oss-120b`, individual Zod card checks, rating and game checks, family/concept and near-duplicate checks, then a separate `openai/gpt-oss-20b` editorial pass. A malformed card is discarded without wasting the valid cards in its batch. An attempted JSON response that fails provider validation can retry once; refusals are not retried. These checks reduce bad content; they do not guarantee humour, perfect semantic novelty or perfect classification.

Limits: 10 requests per room, 1 minute between requests, 100 stored generated cards per room, and a default 40 pack requests per UTC day across the production Worker. Each pack ordinarily uses two model calls, with at most one formatting retry per call. Room counters and the production daily budget are durable. The local adapter's daily counter resets with its process. Keys are never returned by APIs. Failed, refused, timed-out, rate-limited, malformed or fully rejected batches leave curated play usable; a depleted custom-only filter requires changing the filter or requesting another pack. Factual bluff uses sourced, authored answers and never AI-invented facts.

Group Lore generation is host-triggered. There is no uncontrolled background refill, external sharing, account-wide history, or public matchmaking.

## Verification

```sh
npm run test:party
npm run test:markdown
# With the development servers running (and Chromium installed):
npm run test:party:ui
npx tsc --noEmit
npx eslint lib/party components/party app/party scripts/party workers/party/index.ts tests/party
npm run party:worker:check
npm run build
```

`test:party` includes actual WebSocket clients and a temporary local companion process, all seven game flows, an independent room, credential forgery, reconnects and a process restart. It requires permission to bind a loopback port. The test deletes its own temporary room files.

The browser specification covers three isolated phone sessions for a draw/caption/draw relay, refresh recovery, game descriptions, setup without dropdowns, and 320px/390px/desktop layouts. Start `npm run dev:all` first; use `PARTY_UI_URL=http://localhost:3001` when the preview is on port 3001. If needed install Chromium with `npx playwright install chromium`. The tests use no AI calls.

To run the same transport suite against Wrangler, start `npx wrangler dev --config workers/party/wrangler.jsonc --port 8788 --local`, then run `PARTY_TEST_URL=http://127.0.0.1:8788 node --import tsx --test tests/party/websocket.test.ts`. External mode reconnects to that runtime; it does not restart Wrangler or certify hosted hibernation.

`node --import tsx scripts/party/check-groq.ts` is an optional paid API smoke test, separate from ordinary tests. It prints aggregate counts and stores sample test cards only in the operating system's temporary directory. Never use those test cards as a preview of a live party's future secrets.

See [the word-bank license](../../lib/party/data/NOTICE.md) for source attribution and license terms. Current factual bluff is a deliberately small 12-card pack with source links; expand it through editorial verification, not unchecked generation. Current dependency and deployment checks are documented in [the deployment guide](../deployment.md).
