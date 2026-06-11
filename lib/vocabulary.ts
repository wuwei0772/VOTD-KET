import vocabularyData from '@/data/vocabulary.json'

type Vocabulary = Record<string, Record<string, string[]>>

const raw = vocabularyData as unknown
const vocab: Vocabulary = Array.isArray(raw) ? (raw[0] as Vocabulary) : (raw as Vocabulary)

export function getUnits(): string[] {
  return Object.keys(vocab)
}

export function getLessons(unitId: string): string[] {
  return Object.keys(vocab[unitId] ?? {})
}

export function getWords(unitId: string, lessonId: string): string[] {
  return vocab[unitId]?.[lessonId] ?? []
}

export function getAllUniqueWords(): string[] {
  const set = new Set<string>()
  for (const unit of Object.values(vocab)) {
    for (const words of Object.values(unit)) {
      for (const w of words) set.add(w)
    }
  }
  return [...set]
}

export function getTotalUniqueWordCount(): number {
  return getAllUniqueWords().length
}

// Random distinct words from the whole book, excluding the given ones.
// Used to build distractor options in review questions.
export function getRandomWords(count: number, exclude: string[]): string[] {
  const pool = getAllUniqueWords().filter((w) => !exclude.includes(w))
  const picked: string[] = []
  while (picked.length < count && pool.length > 0) {
    const i = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(i, 1)[0])
  }
  return picked
}

export function unitNumber(unitId: string): number {
  return parseInt(unitId.replace('unit', ''), 10)
}

export function lessonNumber(lessonId: string): number {
  return parseInt(lessonId.replace('lesson', ''), 10)
}
