export const buildLog: [string, string, string][] = [
    [
      '2025.05',
      'idea',
      'an events platform to replace the forms, payment links and guest lists we were stitching together',
    ],
    [
      '2025.06',
      'first rupee',
      'an organizer could create an event; an attendee could pay, receive a ticket and get scanned at the door',
    ],
    [
      '2025.09',
      'event operations',
      'seat maps, cohosts, waitlists, outreach and analytics turned the first booking flow into something communities could run on',
    ],
    [
      '2025.12',
      'auth',
      'email verification and google oauth joined password login, with phone completion for federated accounts',
    ],
    [
      '2026.03',
      'rebuild',
      'check-in and manage-event pages were split into smaller workflows with shared data handling and explicit permissions',
    ],
    [
      '2026.04',
      'storage and payouts',
      'media left gridfs for direct s3 uploads, while razorpayx added payouts, settlements and webhook handling',
    ],
    [
      '2026.04',
      'bolt',
      'an assistant was added across the organizer dashboard to help set up events and operate them with fewer steps',
    ],
    [
      '2026.06',
      'passkeys',
      'webauthn added passwordless login, enrollment and passkey management alongside the existing auth flows',
    ],
    [
      '2026.07',
      'runtime',
      'the api and hand-managed ec2 workers moved to separate ecs services, sharing one image with explicit health checks and ownership',
    ],
    [
      '2026.07',
      'delivery',
      'email, whatsapp and invoices moved off the request path into queues and workers, with private files and signed qr links',
    ],
    [
      '2026.08',
      'operability',
      'signed client ips fixed rate limits, correlation ids traced bookings end to end, and redis moved inside the vpc',
    ],
    [
      '2026.09',
      'correctness under load',
      'orders became a recoverable state machine, while analytics moved from raw event scans to an incremental read model',
    ],
    [
      '2026.10',
      'ticket transfers',
      'unused admissions could move between verified accounts, including seats from group bookings, with new qr credentials and a holder history while the purchase stayed with the buyer',
    ],
    [
      '2026.10',
      'native ios',
      'the expo app became native swiftui: rewrite started october 4, reached the app store october 17, and was iphone duo ready by october 25',
    ],
  ]

export const ORDER_STEPS: [string, string][] = [
  ['request', 'idempotency key + one active checkout'],
  ['reserve', 'inventory and order change in one transaction'],
  ['pay', 'provider state is persisted around the network call'],
  ['decide', 'verified, deduplicated webhook advances state'],
  ['commit', 'hold becomes a sale, or is released safely'],
  ['deliver', 'outbox worker creates tickets, invoices and messages'],
]

export const ANALYTICS_STEPS: [string, string][] = [
  ['raw export', 'posthog events remain the source of truth'],
  ['project', '15 min job, durable cursor, 2 h overlap'],
  ['deduplicate', 'event uuid upsert inside a serialized run'],
  ['read model', 'only dashboard fields, indexed for its queries'],
  ['aggregate', 'postgres returns totals and time buckets'],
  ['serve', 'stale-while-revalidate cache absorbs repeat reads'],
]
