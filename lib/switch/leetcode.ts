/**
 * Authenticated LeetCode client.
 *
 * `submissionDetails` returns the submitted code together with the problem's
 * title, slug, difficulty and display number, so one call per submission is
 * enough — no repo round-trip and no separate metadata lookup.
 *
 * Both credentials are session cookies copied from a logged-in browser.
 * LEETCODE_SESSION expires roughly monthly; when it does, every call here
 * starts returning a signed-out response and `assertSignedIn` throws.
 */

const ENDPOINT = "https://leetcode.com/graphql/";

export type LeetCodeCredentials = {
  session: string;
  csrfToken: string;
};

export type SubmissionSummary = {
  id: string;
  titleSlug: string;
  language: string;
  /** Unix seconds. */
  timestamp: number;
};

export type AcceptedSubmission = {
  id: string;
  titleSlug: string;
  title: string;
  frontendId: number | null;
  difficulty: string;
  language: string;
  code: string;
  submittedAt: Date;
};

/** Mirrors LANG_TO_EXTENSION in joshcai/leetcode-sync so paths stay comparable. */
const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  bash: "sh",
  c: "c",
  cpp: "cpp",
  csharp: "cs",
  dart: "dart",
  elixir: "ex",
  erlang: "erl",
  golang: "go",
  java: "java",
  javascript: "js",
  kotlin: "kt",
  mssql: "sql",
  mysql: "sql",
  oraclesql: "sql",
  php: "php",
  postgresql: "sql",
  python: "py",
  python3: "py",
  pythondata: "py",
  racket: "rkt",
  ruby: "rb",
  rust: "rs",
  scala: "scala",
  swift: "swift",
  typescript: "ts",
};

export function extensionFor(language: string) {
  return LANGUAGE_TO_EXTENSION[language.toLowerCase()] ?? "txt";
}

/**
 * The synthetic repo path a submission would have had under the GitHub Action,
 * e.g. "0860-lemonade-change/solution.py". The ingest endpoint deduplicates on
 * (path, sha256(code)), so keeping this format stable keeps history consistent.
 */
export function sourcePathFor(submission: {
  frontendId: number | null;
  titleSlug: string;
  language: string;
}) {
  const prefix = submission.frontendId
    ? `${String(submission.frontendId).padStart(4, "0")}-`
    : "";
  return `${prefix}${submission.titleSlug}/solution.${extensionFor(submission.language)}`;
}

class LeetCodeError extends Error {}

async function graphql<T>(
  credentials: LeetCodeCredentials,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Referer: "https://leetcode.com/",
      Origin: "https://leetcode.com",
      "User-Agent": "switch-tracker/2.0",
      "x-csrftoken": credentials.csrfToken,
      Cookie: `csrftoken=${credentials.csrfToken}; LEETCODE_SESSION=${credentials.session};`,
    },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });

  if (response.status === 403 || response.status === 401) {
    throw new LeetCodeError(
      "LeetCode rejected the session (403). LEETCODE_SESSION has most likely expired — copy a fresh cookie.",
    );
  }
  if (!response.ok) {
    throw new LeetCodeError(`LeetCode returned ${response.status}`);
  }

  const payload = (await response.json()) as { data?: T; errors?: { message?: string }[] };
  if (payload.errors?.length) {
    throw new LeetCodeError(payload.errors[0]?.message ?? "LeetCode GraphQL error");
  }
  if (!payload.data) throw new LeetCodeError("LeetCode returned no data");
  return payload.data;
}

/** Fails loudly rather than silently syncing nothing when the cookie has expired. */
export async function assertSignedIn(credentials: LeetCodeCredentials) {
  const data = await graphql<{ userStatus?: { isSignedIn?: boolean; username?: string } }>(
    credentials,
    `query { userStatus { isSignedIn username } }`,
  );
  if (!data.userStatus?.isSignedIn) {
    throw new LeetCodeError(
      "LeetCode session is not signed in — LEETCODE_SESSION has expired, copy a fresh cookie.",
    );
  }
  return data.userStatus.username ?? "unknown";
}

/**
 * Accepted submissions newer than `sinceSeconds`, newest first. Pages backwards
 * and stops as soon as it reaches the watermark, so routine runs read one page.
 *
 * `truncated` means the page budget ran out before reaching either the watermark
 * or the end of history. That matters: the caller advances the watermark from the
 * oldest submission it processes, so acting on a truncated list would step over
 * everything older and never come back for it.
 */
export async function listAcceptedSince(
  credentials: LeetCodeCredentials,
  sinceSeconds: number,
  { pageSize = 20, maxPages = 200 } = {},
) {
  const query = `
    query submissions($offset: Int!, $limit: Int!) {
      submissionList(offset: $offset, limit: $limit) {
        hasNext
        submissions { id titleSlug lang statusDisplay timestamp }
      }
    }
  `;

  const accepted: SubmissionSummary[] = [];
  let complete = false;

  for (let page = 0; page < maxPages; page += 1) {
    const data = await graphql<{
      submissionList?: {
        hasNext: boolean;
        submissions: {
          id: string;
          titleSlug: string;
          lang: string;
          statusDisplay: string;
          timestamp: string;
        }[];
      };
    }>(credentials, query, { offset: page * pageSize, limit: pageSize });

    const list = data.submissionList;
    if (!list?.submissions.length) {
      complete = true;
      break;
    }

    let reachedWatermark = false;
    for (const submission of list.submissions) {
      const timestamp = Number(submission.timestamp);
      if (timestamp <= sinceSeconds) {
        reachedWatermark = true;
        break;
      }
      if (submission.statusDisplay !== "Accepted") continue;
      accepted.push({
        id: submission.id,
        titleSlug: submission.titleSlug,
        language: submission.lang,
        timestamp,
      });
    }

    if (reachedWatermark || !list.hasNext) {
      complete = true;
      break;
    }
  }

  return { submissions: accepted, truncated: !complete };
}

/**
 * Drops repeat solves of the same problem in the same language within
 * `windowSeconds` of one another, keeping the latest. Matches the GitHub
 * Action's filter-duplicate-secs default so a day of retries is one entry.
 */
export function collapseRepeats(
  submissions: SubmissionSummary[],
  windowSeconds = 86_400,
) {
  const newestFirst = [...submissions].sort((a, b) => b.timestamp - a.timestamp);
  const kept: SubmissionSummary[] = [];
  const lastKept = new Map<string, number>();

  for (const submission of newestFirst) {
    const key = `${submission.titleSlug}:${submission.language}`;
    const previous = lastKept.get(key);
    if (previous !== undefined && previous - submission.timestamp < windowSeconds) continue;
    lastKept.set(key, submission.timestamp);
    kept.push(submission);
  }
  return kept;
}

export async function fetchSubmission(
  credentials: LeetCodeCredentials,
  submissionId: string,
): Promise<AcceptedSubmission | null> {
  const data = await graphql<{
    submissionDetails?: {
      code?: string;
      lang?: { name?: string };
      timestamp?: number;
      question?: {
        questionFrontendId?: string;
        titleSlug?: string;
        title?: string;
        difficulty?: string;
      };
    } | null;
  }>(
    credentials,
    `query submissionDetails($submissionId: Int!) {
      submissionDetails(submissionId: $submissionId) {
        code
        lang { name }
        timestamp
        question { questionFrontendId titleSlug title difficulty }
      }
    }`,
    { submissionId: Number(submissionId) },
  );

  const details = data.submissionDetails;
  // A submission can be unreadable (deleted problem, premium lock); skip it
  // rather than failing the whole run.
  if (!details?.code || !details.question?.titleSlug) return null;

  return {
    id: submissionId,
    titleSlug: details.question.titleSlug,
    title: details.question.title ?? details.question.titleSlug,
    frontendId: details.question.questionFrontendId
      ? Number(details.question.questionFrontendId)
      : null,
    difficulty: details.question.difficulty ?? "Unknown",
    language: details.lang?.name ?? "unknown",
    code: details.code,
    submittedAt: new Date((details.timestamp ?? 0) * 1000),
  };
}
