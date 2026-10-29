import { PostLike } from '@/components/post-like'
import { ReadingProgress } from '@/components/reading-progress'

export function PostMeta({ date, dateTime }: { date: string; dateTime: string }) {
  return <><div className="not-prose -mt-2 mb-6 flex items-center justify-between gap-4 text-sm text-neutral-600 dark:text-neutral-400">
    <time dateTime={dateTime}>{date}</time>
    <PostLike compact />
  </div><ReadingProgress /></>
}
