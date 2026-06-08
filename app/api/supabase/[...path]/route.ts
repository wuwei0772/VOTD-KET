import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

const requestHeaders = [
  'accept',
  'accept-profile',
  'apikey',
  'authorization',
  'content-profile',
  'content-type',
  'prefer',
  'range',
  'x-client-info',
]

const responseHeaders = [
  'content-range',
  'content-type',
  'location',
  'range-unit',
  'retry-after',
  'sb-gateway-version',
  'x-supabase-api-version',
]

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  if (!supabaseUrl) {
    return NextResponse.json({ message: 'Supabase is not configured' }, { status: 503 })
  }

  const { path } = await context.params
  const target = new URL(path.join('/'), `${supabaseUrl}/`)
  target.search = request.nextUrl.search

  const headers = new Headers()
  for (const name of requestHeaders) {
    const value = request.headers.get(name)
    if (value) headers.set(name, value)
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === 'GET' || request.method === 'HEAD'
      ? undefined
      : await request.arrayBuffer(),
    redirect: 'manual',
  })

  const outgoingHeaders = new Headers()
  for (const name of responseHeaders) {
    const value = response.headers.get(name)
    if (value) outgoingHeaders.set(name, value)
  }

  return new NextResponse(response.body, {
    status: response.status,
    headers: outgoingHeaders,
  })
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
