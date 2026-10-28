import assert from 'node:assert/strict';
import test from 'node:test';
import { guestbookBody, guestbookEntrySchema } from '../../lib/guestbook-input';

test('guestbook trims valid input and rejects empty, oversized and non-string values', () => {
  assert.deepEqual(guestbookEntrySchema.parse({ name: '  Visitor  ', message: '  Hello  ' }), { name: 'Visitor', message: 'Hello' });
  for (const value of [null, [], { name: ' ', message: 'Hello' }, { name: 'Visitor', message: '\n ' }, { name: 123, message: 'Hello' }, { name: 'Visitor', message: {} }, { name: 'x'.repeat(101), message: 'Hello' }, { name: 'Visitor', message: 'x'.repeat(501) }]) {
    assert.equal(guestbookEntrySchema.safeParse(value).success, false);
  }
});

test('guestbook limits bytes even without Content-Length and decodes split Unicode correctly', async () => {
  const encoded = new TextEncoder().encode(JSON.stringify({ name: 'Visitor', message: 'hello 🌱' }));
  const stream = new ReadableStream({ start(controller) {
    controller.enqueue(encoded.slice(0, encoded.length - 3));
    controller.enqueue(encoded.slice(encoded.length - 3));
    controller.close();
  } });
  const request = new Request('https://example.test/api/guestbook', { method: 'POST', body: stream, duplex: 'half' } as RequestInit);
  assert.equal(request.headers.get('content-length'), null);
  assert.equal(await guestbookBody(request), new TextDecoder().decode(encoded));
  const oversized = new Request(request.url, { method: 'POST', body: 'x'.repeat(8193) });
  assert.equal(await guestbookBody(oversized), null);
});
