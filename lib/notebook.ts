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

function getItems(): NotebookItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
  } catch {
    return []
  }
}

function setItems(items: NotebookItem[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

export async function saveWord(
  word: string,
  wordInfo: WordInfo,
  unitId?: string,
  lessonId?: string,
): Promise<void> {
  const items = getItems()
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
  setItems(items)
}

export async function removeWord(word: string): Promise<void> {
  setItems(getItems().filter((i) => i.word !== word))
}

export async function getSavedWords(): Promise<NotebookItem[]> {
  return getItems()
}

export async function isWordSaved(word: string): Promise<boolean> {
  return getItems().some((i) => i.word === word)
}
