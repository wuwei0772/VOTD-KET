'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomTabBar() {
  const pathname = usePathname()
  const isNotebook = pathname === '/notebook'
  const isStudy = pathname.startsWith('/notebook/study')
  const isAccount = pathname === '/account' || pathname === '/login'

  return (
    <div style={{ display: 'flex', borderTop: '1px solid var(--border)' }}>
      <Link
        href="/notebook"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '8px 0 12px',
          textDecoration: 'none',
          color: isNotebook ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isNotebook ? '2.5' : '1.8'}>
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        <span style={{ fontSize: '10px', fontWeight: isNotebook ? 600 : 400 }}>笔记本</span>
      </Link>
      <Link
        href="/notebook/study"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '3px',
          padding: '8px 0 12px',
          textDecoration: 'none',
          color: isStudy ? 'var(--accent)' : 'var(--muted)',
          transition: 'color 0.15s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={isStudy ? '2.5' : '1.8'}>
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
        <span style={{ fontSize: '10px', fontWeight: isStudy ? 600 : 400 }}>学习</span>
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
