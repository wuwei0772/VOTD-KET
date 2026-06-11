'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { getCurrentUser, signOut } from '@/lib/auth'
import { getStats } from '@/lib/review'
import { isSupabaseConfigured } from '@/lib/supabase'
import BottomTabBar from '@/components/BottomTabBar'

export default function AccountPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [masteredCount, setMasteredCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([getCurrentUser(), getStats()])
      .then(([currentUser, stats]) => {
        setUser(currentUser)
        setMasteredCount(stats.mastered)
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSignOut = async () => {
    await signOut()
    router.replace('/')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'rgba(248,246,241,0.92)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/" className="text-sm" style={{ color: 'var(--muted)' }}>← 首页</Link>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>账户与同步</span>
          <span className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5 flex flex-col gap-3">
        <section className="p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
          {loading ? (
            <p className="text-sm animate-pulse" style={{ color: 'var(--muted)' }}>读取账户中…</p>
          ) : user ? (
            <>
              <p className="text-xs font-medium" style={{ color: 'var(--accent)' }}>已开启云同步</p>
              <p className="mt-1 font-semibold break-all" style={{ color: 'var(--text)' }}>{user.email}</p>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
                云端已记录你掌握了 {masteredCount} 个单词。
              </p>
              <button
                onClick={handleSignOut}
                className="mt-5 h-10 px-4 text-sm font-medium"
                style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)', color: 'var(--text)', cursor: 'pointer' }}
              >
                退出登录
              </button>
            </>
          ) : (
            <>
              <p className="font-semibold" style={{ color: 'var(--text)' }}>当前使用本地模式</p>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                现有 {masteredCount} 个已掌握单词的记录保存在此浏览器。登录后会自动合并到云端。
              </p>
              <Link
                href="/login"
                className="mt-5 h-10 px-4 inline-flex items-center text-sm font-medium"
                style={{ borderRadius: '8px', background: 'var(--accent)', color: '#fff' }}
              >
                邮箱验证码登录
              </Link>
            </>
          )}
        </section>

        {!isSupabaseConfigured && (
          <p className="px-4 py-3 text-sm" style={{ borderRadius: '10px', background: '#FFF4EC', color: '#B45309' }}>
            当前环境尚未配置 Supabase，云同步功能暂不可用。
          </p>
        )}
      </main>

      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.96)' }}>
        <BottomTabBar />
      </div>
    </div>
  )
}
