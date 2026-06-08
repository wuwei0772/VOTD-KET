import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const isSupabaseConfigured = Boolean(url && key)

const proxiedFetch: typeof fetch = (input, init) => {
  const requestUrl = typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.toString()
      : input.url

  if (typeof window === 'undefined' || !url || !requestUrl.startsWith(url)) {
    return fetch(input, init)
  }

  const target = new URL(requestUrl)
  const proxyUrl = `/api/supabase${target.pathname}${target.search}`
  return fetch(proxyUrl, init)
}

export const supabase = isSupabaseConfigured
  ? createClient(url!, key!, {
      global: { fetch: proxiedFetch },
    })
  : null
