'use client'

import type { User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export async function getCurrentUser(): Promise<User | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getUser()
  return data.user
}

export async function sendEmailCode(email: string): Promise<void> {
  if (!supabase) throw new Error('Supabase 尚未配置')

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  })
  if (error) throw error
}

export async function verifyEmailCode(email: string, token: string): Promise<void> {
  if (!supabase) throw new Error('Supabase 尚未配置')

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
