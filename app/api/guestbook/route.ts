import { NextRequest, NextResponse } from 'next/server';
import { addGuestbookEntry, getGuestbookEntries } from '@/app/actions/getGuestBookEntries';
import { guestbookBody, guestbookEntrySchema } from '@/lib/guestbook-input';
import { sameOrigin } from '@/lib/blog-like-identity';

export async function GET() {
  try {
    const { entries, error } = await getGuestbookEntries();

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({ entries });
  } catch (error) {
    console.error('GET /api/guestbook error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guestbook entries' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  if (!sameOrigin(request.headers.get('origin'), url.protocol, request.headers.get('host') || url.host)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await guestbookBody(request);
    if (body === null) return NextResponse.json({ error: 'Request too large' }, { status: 413 });
    let input: unknown;
    try { input = JSON.parse(body); }
    catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }
    const parsed = guestbookEntrySchema.safeParse(input);
    if (!parsed.success) return NextResponse.json({ error: 'Enter a name (1–100 characters) and message (1–500 characters)' }, { status: 400 });

    const { entry, error } = await addGuestbookEntry(parsed.data);

    if (error) {
      return NextResponse.json(
        { error },
        { status: 500 }
      );
    }

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error('POST /api/guestbook error:', error);
    return NextResponse.json(
      { error: 'Failed to create guestbook entry' },
      { status: 500 }
    );
  }
}
