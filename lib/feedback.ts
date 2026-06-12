'use client'

import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export type FeedbackMood = 'love' | 'okay' | 'hard' | 'sad'

// Insert only — the feedback table has no select policy, so do not chain
// .select() here: the insert would succeed but the read-back would error.
export async function submitFeedback(mood: FeedbackMood, message: string): Promise<void> {
  if (!supabase) throw new Error('Supabase 尚未配置')
  const user = await getCurrentUser()
  const { error } = await supabase.from('feedback').insert({
    user_id: user?.id ?? null,
    mood,
    message: message.trim().slice(0, 200) || null,
  })
  if (error) throw error
}
