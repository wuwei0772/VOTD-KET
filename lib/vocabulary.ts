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

export function unitNumber(unitId: string): number {
  return parseInt(unitId.replace('unit', ''), 10)
}

export function lessonNumber(lessonId: string): number {
  return parseInt(lessonId.replace('lesson', ''), 10)
}
