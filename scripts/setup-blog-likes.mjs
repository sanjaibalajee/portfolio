import nextEnv from '@next/env'
import { neon } from '@neondatabase/serverless'
import { readFile } from 'node:fs/promises'

nextEnv.loadEnvConfig(process.cwd())
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required')
const sql = neon(process.env.DATABASE_URL)
// Apply only this additive table. The historical Switch migration is destructive.
const migration = await readFile(new URL('../drizzle/0001_blog_likes.sql', import.meta.url), 'utf8')
await sql.query(migration)
const columns = await sql`select column_name from information_schema.columns where table_schema = 'public' and table_name = 'blog_likes' order by ordinal_position`
if (columns.map(column => column.column_name).join(',') !== 'post_slug,visitor_hash,created_at') throw new Error('Unexpected blog_likes schema')
console.log('blog_likes is ready; no existing application tables were changed.')
