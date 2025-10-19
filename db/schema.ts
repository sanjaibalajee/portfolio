import { pgTable, serial, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const guestbook = pgTable('guestbook', {
    id: serial('id').primaryKey(),
    name: varchar('name', { length: 100 }).notNull(),
    message: text('message').notNull(),
    timestamp: timestamp('timestamp').defaultNow().notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  });

