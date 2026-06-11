'use client'

import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

// Leitner review book. A word enters box 1 when answered wrong in a quiz;
// each correct review promotes it one box, a wrong review sends it back to
// box 1. Passing box 3 graduates the word to 'mastered'. Words answered
// correctly on first encounter become 'mastered' immediately.

export type WordStatus = 'learning' | 'mastered'

export interface ReviewItem {
  word: string
  status: WordStatus
  box: number
  next_due: string | null // YYYY-MM-DD (local)
  wrong_count: number
  unit_id: string | null
  lesson_id: string | null
  first_seen_at: string
  mastered_at: string | null
}

export const MAX_BOX = 3

// Days until the next review after entering each box.
const BOX_INTERVAL_DAYS: Record<number, number> = { 1: 1, 2: 3, 3: 7 }

const STORAGE_KEY = 'votd_review'
const MIGRATED_USER_KEY = 'votd_review_migrated_user'
const STREAK_KEY = 'votd_streak'

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Local calendar date of an ISO timestamp (mastered_at is stored in UTC).
export function localDateStr(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function dateStrAfterDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function getLocalItems(): ReviewItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function setLocalItems(items: ReviewItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

async function getCloudContext() {
  const user = await getCurrentUser()
  return user && supabase ? { user, client: supabase } : null
}

async function migrateLocalItems(): Promise<void> {
  const context = await getCloudContext()
  if (!context || localStorage.getItem(MIGRATED_USER_KEY) === context.user.id) return

  const items = getLocalItems()
  if (items.length > 0) {
    const { error } = await context.client.from('word_progress').upsert(
      items.map((item) => ({
        user_id: context.user.id,
        word: item.word,
        status: item.status,
        box: item.box,
        next_due: item.next_due,
        wrong_count: item.wrong_count,
        unit_id: item.unit_id,
        lesson_id: item.lesson_id,
        first_seen_at: item.first_seen_at,
        mastered_at: item.mastered_at,
      })),
      { onConflict: 'user_id,word', ignoreDuplicates: true },
    )
    if (error) { console.error('migrateLocalItems:', error); return }
  }

  localStorage.setItem(MIGRATED_USER_KEY, context.user.id)
}

async function upsertItem(item: ReviewItem): Promise<void> {
  const context = await getCloudContext()
  if (context) {
    const { error } = await context.client.from('word_progress').upsert({
      user_id: context.user.id,
      word: item.word,
      status: item.status,
      box: item.box,
      next_due: item.next_due,
      wrong_count: item.wrong_count,
      unit_id: item.unit_id,
      lesson_id: item.lesson_id,
      first_seen_at: item.first_seen_at,
      mastered_at: item.mastered_at,
      updated_at: new Date().toISOString(),
    })
    if (error) console.error('upsertItem:', error)
    return
  }

  const items = getLocalItems()
  const idx = items.findIndex((i) => i.word === item.word)
  if (idx >= 0) items[idx] = item
  else items.unshift(item)
  setLocalItems(items)
}

export async function getAllProgress(): Promise<ReviewItem[]> {
  const context = await getCloudContext()
  if (!context) return getLocalItems()

  await migrateLocalItems()
  const { data, error } = await context.client
    .from('word_progress')
    .select('word, status, box, next_due, wrong_count, unit_id, lesson_id, first_seen_at, mastered_at')
    .eq('user_id', context.user.id)

  if (error) { console.error('getAllProgress:', error); return [] }
  return data ?? []
}

export async function getItem(word: string): Promise<ReviewItem | null> {
  const items = await getAllProgress()
  return items.find((i) => i.word === word) ?? null
}

export async function getDueItems(): Promise<ReviewItem[]> {
  const items = await getAllProgress()
  const today = todayStr()
  return items
    .filter((i) => i.status === 'learning' && i.next_due !== null && i.next_due <= today)
    .sort((a, b) => (a.next_due! < b.next_due! ? -1 : 1))
}

// A quiz answer was wrong: enter the review book at box 1 (or fall back to
// box 1 if already tracked — including previously mastered words).
export async function recordWrong(
  word: string,
  unitId?: string,
  lessonId?: string,
): Promise<void> {
  const existing = await getItem(word)
  await upsertItem({
    word,
    status: 'learning',
    box: 1,
    next_due: dateStrAfterDays(BOX_INTERVAL_DAYS[1]),
    wrong_count: (existing?.wrong_count ?? 0) + 1,
    unit_id: existing?.unit_id ?? unitId ?? null,
    lesson_id: existing?.lesson_id ?? lessonId ?? null,
    first_seen_at: existing?.first_seen_at ?? new Date().toISOString(),
    mastered_at: null,
  })
  recordActivity()
}

// A quiz answer was correct: first-encounter words count as mastered right
// away; words already in the review book are left to the review flow.
export async function recordFirstCorrect(
  word: string,
  unitId?: string,
  lessonId?: string,
): Promise<void> {
  const existing = await getItem(word)
  if (existing) return
  await upsertItem({
    word,
    status: 'mastered',
    box: 1,
    next_due: null,
    wrong_count: 0,
    unit_id: unitId ?? null,
    lesson_id: lessonId ?? null,
    first_seen_at: new Date().toISOString(),
    mastered_at: new Date().toISOString(),
  })
  recordActivity()
}

// A review answer was correct: move up one box, or graduate from the top box.
// Returns the updated item (so the UI can celebrate graduations).
export async function promote(word: string): Promise<ReviewItem | null> {
  const existing = await getItem(word)
  if (!existing || existing.status !== 'learning') return existing
  const updated: ReviewItem =
    existing.box >= MAX_BOX
      ? { ...existing, status: 'mastered', next_due: null, mastered_at: new Date().toISOString() }
      : {
          ...existing,
          box: existing.box + 1,
          next_due: dateStrAfterDays(BOX_INTERVAL_DAYS[existing.box + 1]),
        }
  await upsertItem(updated)
  recordActivity()
  return updated
}

// A review answer was wrong: back to box 1, due again tomorrow.
export async function demote(word: string): Promise<ReviewItem | null> {
  const existing = await getItem(word)
  if (!existing) return null
  const updated: ReviewItem = {
    ...existing,
    status: 'learning',
    box: 1,
    next_due: dateStrAfterDays(BOX_INTERVAL_DAYS[1]),
    wrong_count: existing.wrong_count + 1,
    mastered_at: null,
  }
  await upsertItem(updated)
  recordActivity()
  return updated
}

export interface ReviewStats {
  mastered: number
  learning: number
  dueToday: number
  masteredToday: number
  streak: number
}

export async function getStats(): Promise<ReviewStats> {
  const items = await getAllProgress()
  const today = todayStr()
  let mastered = 0
  let learning = 0
  let dueToday = 0
  let masteredToday = 0
  for (const i of items) {
    if (i.status === 'mastered') {
      mastered++
      if (i.mastered_at && localDateStr(i.mastered_at) === today) masteredToday++
    } else {
      learning++
      if (i.next_due !== null && i.next_due <= today) dueToday++
    }
  }
  return { mastered, learning, dueToday, masteredToday, streak: await getStreak() }
}

// Streak: consecutive days with any quiz/review activity. Stored per user in
// daily_activity (one row per active day) so it follows the account across
// devices; falls back to localStorage when not signed in.

function dateStrDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function readLocalStreak(): { date: string; count: number } {
  try {
    const raw = JSON.parse(localStorage.getItem(STREAK_KEY) ?? 'null')
    if (raw && typeof raw.date === 'string' && typeof raw.count === 'number') return raw
  } catch {}
  return { date: '', count: 0 }
}

export function recordActivity(): void {
  if (typeof window === 'undefined') return
  const today = todayStr()

  // Always keep the local record (covers logged-out use, harmless otherwise).
  const s = readLocalStreak()
  if (s.date !== today) {
    localStorage.setItem(
      STREAK_KEY,
      JSON.stringify({ date: today, count: s.date === dateStrDaysAgo(1) ? s.count + 1 : 1 }),
    )
  }

  // Fire-and-forget cloud record; the primary key makes repeats a no-op.
  void getCloudContext().then((context) => {
    if (!context) return
    return context.client
      .from('daily_activity')
      .upsert({ user_id: context.user.id, day: today }, { onConflict: 'user_id,day', ignoreDuplicates: true })
      .then(({ error }) => { if (error) console.error('recordActivity:', error) })
  })
}

export async function getStreak(): Promise<number> {
  if (typeof window === 'undefined') return 0

  const context = await getCloudContext()
  if (context) {
    const { data, error } = await context.client
      .from('daily_activity')
      .select('day')
      .eq('user_id', context.user.id)
      .order('day', { ascending: false })
      .limit(366)
    if (error) { console.error('getStreak:', error); return 0 }
    const days = new Set((data ?? []).map((r) => r.day as string))
    // Count back from today (or yesterday, if today has no activity yet).
    let start = 0
    if (!days.has(todayStr())) {
      if (!days.has(dateStrDaysAgo(1))) return 0
      start = 1
    }
    let streak = 0
    while (days.has(dateStrDaysAgo(start + streak))) streak++
    return streak
  }

  const s = readLocalStreak()
  if (s.date === todayStr()) return s.count
  // Yesterday's streak is still alive (today just hasn't had activity yet).
  return s.date === dateStrDaysAgo(1) ? s.count : 0
}
