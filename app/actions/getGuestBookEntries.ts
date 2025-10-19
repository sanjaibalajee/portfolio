
'use server'

import { db } from '@/db/drizzle';
import { guestbook } from '@/db/schema';
import { desc } from 'drizzle-orm';

export async function addGuestbookEntry(data: { name: string; message: string }) {
  
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