import { NextRequest, NextResponse } from 'next/server';
import { addGuestbookEntry, getGuestbookEntries } from '@/app/actions/getGuestBookEntries';

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
  try {
    const body = await request.json();
    const { name, message } = body;

    if (!name || !message) {
      return NextResponse.json(
        { error: 'Name and message are required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: 'Name must be less than 100 characters' },
        { status: 400 }
      );
    }

    if (message.length > 500) {
      return NextResponse.json(
        { error: 'Message must be less than 500 characters' },
        { status: 400 }
      );
    }

    const { entry, error } = await addGuestbookEntry({ name, message });

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
