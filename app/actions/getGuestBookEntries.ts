
'use server'

import { db, isDatabaseConfigured } from '@/db/drizzle';
import { guestbook } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function addGuestbookEntry(data: { name: string; message: string }) {
  if (!isDatabaseConfigured) {
    return { entry: null, error: 'Database is not configured' };
  }
  
  try {
    const [newEntry] = await db
      .insert(guestbook)
      .values({
        name: data.name,
        message: data.message,
      })
      .returning();
    
    return { entry: newEntry, error: null };
  } catch (error) {
    console.error('Error adding guestbook entry:', error);
    return { entry: null, error: 'Failed to add guestbook entry' };
  }
}

export async function getGuestbookEntries() {
  if (!isDatabaseConfigured) {
    return { entries: [], error: 'Database is not configured' };
  }

  try {
    const entries = await db
      .select()
      .from(guestbook)
      .orderBy(desc(guestbook.timestamp))
      .limit(100);
    
    return { entries, error: null };
  } catch (error) {
    console.error('Error fetching guestbook entries:', error);
    return { entries: [], error: 'Failed to load guestbook entries' };
  }
}
