export type ReadingPosition = {
  version: 1
  anchor: string | null
  sectionProgress: number
  progress: number
  savedAt: number
}

export const readingStorageKey = (pathname: string) => `portfolio:reading:${pathname}`
const maxAge = 90 * 24 * 60 * 60 * 1000

export function parseReadingPosition(raw: string | null, now = Date.now()): ReadingPosition | null {
  if (!raw || raw.length > 2048) return null
  try {
    const value = JSON.parse(raw) as ReadingPosition
    if (!value || value.version !== 1) return null
    if (value.anchor !== null && (typeof value.anchor !== 'string' || value.anchor.length > 200)) return null
    if (!Number.isFinite(value.sectionProgress) || value.sectionProgress < 0 || value.sectionProgress > 1) return null
    if (!Number.isFinite(value.progress) || value.progress < 0.05 || value.progress >= 0.98) return null
    if (!Number.isFinite(value.savedAt) || value.savedAt > now + 60_000 || now - value.savedAt > maxAge) return null
    return value
  } catch { return null }
}

// Section-relative offsets survive changing screen widths and image heights.
export function readingTarget(position: ReadingPosition, articleTop: number, scrollable: number, section?: { top: number; bottom: number }) {
  const point = section
    ? section.top + (section.bottom - section.top) * position.sectionProgress
    : articleTop + scrollable * position.progress
  return Math.max(0, point - 32)
}
