import { loadEnvConfig } from '@next/env';
import { writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRoom } from '../../lib/party/engine';
import { generateLore } from '../../lib/party/groq';
loadEnvConfig(process.cwd());
async function main() {
  const results = [];
  for (const rating of process.argv.includes('--adult')
    ? (['adult'] as const)
    : (['general', 'adult'] as const)) {
    const room = createRoom('EVAL23');
    room.settings.rating = rating;
    const start = Date.now();
    try {
      const cards = await generateLore(
        room,
        'This group loves programming, disastrous train trips, karaoke, and defending terrible food opinions.',
        process.env.GROQ_API_KEY,
      );
      results.push({
        rating,
        passed: true,
        count: cards.length,
        games: [...new Set(cards.map((c) => c.game))],
        durationMs: Date.now() - start,
      });
      await writeFile(join(tmpdir(), `party-groq-${rating}.json`), JSON.stringify(cards, null, 2), {
        mode: 0o600,
      });
    } catch (e) {
      results.push({
        rating,
        passed: false,
        error: e instanceof Error ? e.message : 'Generation failed',
        cause: e instanceof Error ? e.cause : undefined,
      });
      process.exitCode = 1;
    }
  }
  console.log(JSON.stringify(results, null, 2));
}
void main();
