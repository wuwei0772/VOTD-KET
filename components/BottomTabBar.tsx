'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomTabBar() {
  const pathname = usePathname()
  const isHome = pathname === '/' || pathname.startsWith('/unit')
  const isReview = pathname.startsWith('/review')
  const isAccount = pathname === '/account' || pathname === '/login'

  return (
    <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
      <Link
        href="/"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '8px 0 12px',
          textDecoration: 'none',
          color: isHome ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isHome ? '2.5' : '1.8'}>
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <path d="M9 22V12h6v10" />
        </svg>
        <span style={{ fontSize: '10px', fontWeight: isHome ? 600 : 400 }}>首页</span>
      </Link>
      <Link
        href="/review"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '8px 0 12px',
          textDecoration: 'none',
          color: isReview ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isReview ? '2.5' : '1.8'}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span style={{ fontSize: '10px', fontWeight: isReview ? 600 : 400 }}>复习本</span>
      </Link>
      <Link
        href="/account"
        style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: '3px', padding: '8px 0 12px', textDecoration: 'none',
          color: isAccount ? 'var(--accent)' : 'var(--muted)', transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isAccount ? '2.5' : '1.8'}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
        <span style={{ fontSize: '10px', fontWeight: isAccount ? 600 : 400 }}>账户</span>
      </Link>
    </div>
  )
}
