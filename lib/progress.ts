'use client'

import { getCurrentUser } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export interface LearningProgress {
  unit_id: string
  lesson_id: string
  current_word_index: number
  studied_words: string[]
  updated_at: string
}

export async function getLearningProgress(
  unitId: string,
  lessonId: string,
): Promise<LearningProgress | null> {
  const user = await getCurrentUser()
  if (!user || !supabase) return null

  const { data, error } = await supabase
    .from('learning_progress')
    .select('unit_id, lesson_id, current_word_index, studied_words, updated_at')
    .eq('user_id', user.id)
    .eq('unit_id', unitId)
    .eq('lesson_id', lessonId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function saveLearningProgress(
  unitId: string,
  lessonId: string,
  currentWordIndex: number,
  studiedWords: string[] = [],
): Promise<void> {
  const user = await getCurrentUser()
  if (!user || !supabase) return

  const { error } = await supabase.from('learning_progress').upsert({
    user_id: user.id,
    unit_id: unitId,
    lesson_id: lessonId,
    current_word_index: currentWordIndex,
    studied_words: studiedWords,
    updated_at: new Date().toISOString(),
  })

  if (error) throw error
}
