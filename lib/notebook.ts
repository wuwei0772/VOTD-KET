import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export interface WordInfo {
  meaning: string
  usageNote: string
  examples: Array<{ en: string; zh: string }>
  imagePrompt: string
}

export interface NotebookItem {
  id: string
  word: string
  word_info: WordInfo
  unit_id: string | null
  lesson_id: string | null
  saved_at: string
}

const STORAGE_KEY = 'lingua_notebook'
const MIGRATED_USER_KEY = 'lingua_notebook_migrated_user'

function getLocalItems(): NotebookItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function setLocalItems(items: NotebookItem[]): void {
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
    const { error } = await context.client.from('saved_words').upsert(
      items.map((item) => ({
        user_id: context.user.id,
        word: item.word,
        word_info: item.word_info,
        unit_id: item.unit_id,
        lesson_id: item.lesson_id,
        saved_at: item.saved_at,
      })),
    )
    if (error) throw error
  }

  localStorage.setItem(MIGRATED_USER_KEY, context.user.id)
}

export async function saveWord(
  word: string,
  wordInfo: WordInfo,
  unitId?: string,
  lessonId?: string,
): Promise<void> {
  const context = await getCloudContext()
  if (context) {
    const { error } = await context.client.from('saved_words').upsert({
      user_id: context.user.id,
      word,
      word_info: wordInfo,
      unit_id: unitId ?? null,
      lesson_id: lessonId ?? null,
      saved_at: new Date().toISOString(),
    })
    if (error) throw error
    return
  }

  const items = getLocalItems()
  const existing = items.findIndex((i) => i.word === word)
  if (existing >= 0) {
    items[existing] = { ...items[existing], word_info: wordInfo }
  } else {
    items.unshift({
      id: crypto.randomUUID(),
      word,
      word_info: wordInfo,
      unit_id: unitId ?? null,
      lesson_id: lessonId ?? null,
      saved_at: new Date().toISOString(),
    })
  }
  setLocalItems(items)
}

export async function removeWord(word: string): Promise<void> {
  const context = await getCloudContext()
  if (context) {
    const { error } = await context.client
      .from('saved_words')
      .delete()
      .eq('user_id', context.user.id)
      .eq('word', word)
    if (error) throw error
    return
  }

  setLocalItems(getLocalItems().filter((i) => i.word !== word))
}

export async function getSavedWords(): Promise<NotebookItem[]> {
  const context = await getCloudContext()
  if (!context) return getLocalItems()

  await migrateLocalItems()
  const { data, error } = await context.client
    .from('saved_words')
    .select('word, word_info, unit_id, lesson_id, saved_at')
    .eq('user_id', context.user.id)
    .order('saved_at', { ascending: false })

  if (error) throw error
  return data.map((item) => ({ ...item, id: item.word }))
}

export async function isWordSaved(word: string): Promise<boolean> {
  const context = await getCloudContext()
  if (!context) return getLocalItems().some((i) => i.word === word)

  const { data, error } = await context.client
    .from('saved_words')
    .select('word')
    .eq('user_id', context.user.id)
    .eq('word', word)
    .maybeSingle()

  if (error) throw error
  return Boolean(data)
}
