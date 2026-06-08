'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { sendEmailCode, verifyEmailCode } from '@/lib/auth'
import { isSupabaseConfigured } from '@/lib/supabase'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [resendSeconds, setResendSeconds] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (resendSeconds <= 0) return
    const timer = window.setInterval(() => {
      setResendSeconds((seconds) => Math.max(0, seconds - 1))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [resendSeconds])

  const sendCode = async () => {
    await sendEmailCode(email.trim())
    setCodeSent(true)
    setResendSeconds(60)
    setMessage('验证码已发送，请检查邮箱。')
  }

  const handleSendCode = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await sendCode()
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败')
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendSeconds > 0 || loading) return
    setLoading(true)
    setError('')
    setMessage('')
    try {
      await sendCode()
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码发送失败')
    } finally {
      setLoading(false)
    }
  }

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await verifyEmailCode(email.trim(), code.trim())
      router.replace('/account')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '验证码验证失败')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <main className="max-w-md mx-auto px-4 py-10">
        <Link href="/" className="text-sm" style={{ color: 'var(--muted)' }}>← 返回首页</Link>

        <div className="mt-8 mb-6">
          <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>VOTD 云同步</p>
          <h1 className="mt-1 text-2xl font-semibold" style={{ color: 'var(--text)' }}>邮箱验证码登录</h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
            登录后，笔记本和课程学习位置会同步到你的所有设备。
          </p>
        </div>

        {!isSupabaseConfigured && (
          <Notice type="error">Supabase 尚未配置，请先设置环境变量。</Notice>
        )}

        <form
          onSubmit={codeSent ? handleVerify : handleSendCode}
          className="p-5 flex flex-col gap-4"
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '14px' }}
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>邮箱</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={codeSent || loading}
              required
              placeholder="name@example.com"
              className="h-11 px-3 text-sm outline-none"
              style={{ border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--bg)', color: 'var(--text)' }}
            />
          </label>

          {codeSent && (
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>邮箱验证码</span>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                placeholder="输入验证码"
                className="h-11 px-3 text-sm outline-none"
                style={{ border: '1px solid var(--border)', borderRadius: '9px', background: 'var(--bg)', color: 'var(--text)' }}
              />
            </label>
          )}

          {message && <Notice type="success">{message}</Notice>}
          {error && <Notice type="error">{error}</Notice>}

          <button
            type="submit"
            disabled={loading || !isSupabaseConfigured}
            className="h-11 text-sm font-medium disabled:opacity-40"
            style={{ border: 'none', borderRadius: '9px', background: 'var(--accent)', color: '#fff', cursor: 'pointer' }}
          >
            {loading ? '请稍候…' : codeSent ? '登录并同步' : '发送验证码'}
          </button>

          {codeSent && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                disabled={loading}
                onClick={() => { setCodeSent(false); setCode(''); setMessage(''); setError(''); setResendSeconds(0) }}
                className="text-sm"
                style={{ border: 'none', background: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                更换邮箱
              </button>
              <button
                type="button"
                disabled={loading || resendSeconds > 0}
                onClick={handleResend}
                className="text-sm font-medium disabled:opacity-50"
                style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer' }}
              >
                {resendSeconds > 0 ? `${resendSeconds} 秒后重新发送` : '重新发送验证码'}
              </button>
            </div>
          )}
        </form>
      </main>
    </div>
  )
}

function Notice({ children, type }: { children: React.ReactNode; type: 'error' | 'success' }) {
  return (
    <p
      className="px-3 py-2.5 text-sm"
      style={{
        borderRadius: '8px',
        background: type === 'error' ? '#FFF1F2' : '#F0FDF4',
        color: type === 'error' ? '#BE123C' : '#15803D',
      }}
    >
      {children}
    </p>
  )
}
