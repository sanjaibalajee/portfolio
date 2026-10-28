import { z } from 'zod';

export const guestbookEntrySchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  message: z.string().trim().min(1, 'Message is required').max(500),
});

// Bound streamed input too: Content-Length may be absent or dishonest.
export async function guestbookBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let size = 0;
  let body = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) return body + decoder.decode();
    size += value.byteLength;
    if (size > 8192) {
      await reader.cancel();
      return null;
    }
    body += decoder.decode(value, { stream: true });
  }
}
