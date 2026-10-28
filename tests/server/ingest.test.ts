import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { PGlite, type PGliteInterface } from '@electric-sql/pglite';
import { neonConfig } from '@neondatabase/serverless';
import { ingestSchema, ingestSolutions } from '../../lib/switch/ingest';

test('a failed interleaved ingest rolls back the entire batch and retries without skipping or duplicating submissions', async () => {
  const pg = new PGlite();
  const originalFetch = neonConfig.fetchFunction;
  let failSecondProblem = true;
  let transactions = 0;
  // Exercise the real Neon HTTP driver against an isolated Postgres instance.
  // No request can reach a live database; the HTTP transport is replaced here.
  neonConfig.fetchFunction = async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { query: string; params: unknown[]; queries?: { query: string; params: unknown[] }[] };
    const execute = async (database: Pick<PGliteInterface, 'query'>, query: { query: string; params: unknown[] }) => {
      if (failSecondProblem && query.query.startsWith('insert into "switch_problems"') && query.params[0] === 'problem-b') throw new Error('Injected database failure');
      const result = await database.query<unknown[]>(query.query, query.params, { rowMode: 'array', parsers: { 1114: value => value, 1184: value => value, 3802: value => value } });
      return { ...result, rows: result.rows.map(row => row.map(value => value === null ? null : String(value))) };
    };
    try {
      if (body.queries) {
        transactions++;
        const results = await pg.transaction(async tx => {
          const results = [];
          for (const query of body.queries!) results.push(await execute(tx, query));
          return results;
        });
        return Response.json({ results });
      }
      return Response.json(await execute(pg, body));
    } catch (error) {
      return Response.json({ message: error instanceof Error ? error.message : 'Test database failure' }, { status: 400 });
    }
  };
  try {
    await pg.exec(await readFile(new URL('../../drizzle/0000_switch_rewrite.sql', import.meta.url), 'utf8'));
    for (const slug of ['problem-a', 'problem-b']) {
      await pg.query("insert into switch_problems (slug,title,difficulty,topics,url) values ($1,$1,'Easy','[]','https://example.test')", [slug]);
    }
    const payload = ingestSchema.parse({ solutions: [
      { path: 'a/one.py', slug: 'problem-a', language: 'python3', code: 'one', submittedAt: '2026-10-25T10:00:00Z' },
      { path: 'b/two.py', slug: 'problem-b', language: 'python3', code: 'two', submittedAt: '2026-10-25T11:00:00Z' },
      { path: 'a/three.py', slug: 'problem-a', language: 'python3', code: 'three', submittedAt: '2026-10-25T12:00:00Z' },
    ] });
    await assert.rejects(ingestSolutions(payload));
    assert.equal((await pg.query<{ count: number }>('select count(*)::int from switch_submissions')).rows[0].count, 0);
    assert.equal((await pg.query<{ last_solved_at: unknown }>('select last_solved_at from switch_problems where slug = $1', ['problem-a'])).rows[0].last_solved_at, null);
    assert.equal((await pg.query<{ status: string }>('select status from switch_ingest_runs')).rows[0].status, 'failed');
    failSecondProblem = false;
    assert.deepEqual(await ingestSolutions(payload), { problems: 2, submissions: 3, skipped: 0 });
    assert.deepEqual(await ingestSolutions(payload), { problems: 2, submissions: 0, skipped: 3 });
    assert.equal((await pg.query<{ count: number }>('select count(*)::int from switch_submissions')).rows[0].count, 3);
    assert.equal(transactions, 3);
  } finally {
    neonConfig.fetchFunction = originalFetch;
    await pg.close();
  }
});
