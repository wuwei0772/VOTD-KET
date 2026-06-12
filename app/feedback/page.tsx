'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { submitFeedback, type FeedbackMood } from '@/lib/feedback'
import { isSupabaseConfigured } from '@/lib/supabase'
import BottomTabBar from '@/components/BottomTabBar'
import {
  ConfettiIcon,
  MoodHardIcon,
  MoodLoveIcon,
  MoodOkayIcon,
  MoodSadIcon,
  PaperPlaneIcon,
} from '@/components/HandDrawnIcons'

const MOODS: { value: FeedbackMood; label: string; Icon: typeof MoodLoveIcon }[] = [
  { value: 'love', label: '超喜欢', Icon: MoodLoveIcon },
  { value: 'okay', label: '还行', Icon: MoodOkayIcon },
  { value: 'hard', label: '有点难', Icon: MoodHardIcon },
  { value: 'sad', label: '不开心', Icon: MoodSadIcon },
]

type Phase = 'idle' | 'sending' | 'sent' | 'error'

export default function FeedbackPage() {
  const [mood, setMood] = useState<FeedbackMood | null>(null)
  const [message, setMessage] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')

  const handleSend = async () => {
    if (!mood || phase === 'sending' || phase === 'sent') return
    setPhase('sending')
    const animation = new Promise((resolve) => setTimeout(resolve, 800))
    try {
      await Promise.all([submitFeedback(mood, message), animation])
      setPhase('sent')
    } catch {
      await animation
      setPhase('error')
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <header className="sticky top-0 z-10" style={{ background: 'rgba(248,246,241,0.92)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-md mx-auto px-4 h-12 flex items-center justify-between">
          <Link href="/account" className="text-sm" style={{ color: 'var(--muted)' }}>← 账户</Link>
          <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>给 Dino 写信</span>
          <span className="w-8" />
        </div>
      </header>

      <main className="flex-1 max-w-md mx-auto w-full px-4 py-5 flex flex-col gap-3">
        {phase === 'sent' ? (
          <section
            className="p-8 flex flex-col items-center text-center pop-in"
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          >
            <Image src="/dino-ip.png" alt="开心的 Dino" width={160} height={160} priority />
            <p className="mt-4 text-lg font-bold" style={{ color: 'var(--text)' }}>
              Dino 收到啦！<ConfettiIcon size={20} />
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--muted)' }}>
              谢谢你的来信，Dino 会认真读的。
            </p>
            <Link
              href="/account"
              className="mt-6 h-11 px-6 inline-flex items-center text-sm font-medium"
              style={{ borderRadius: '12px', background: 'var(--accent)', color: '#fff' }}
            >
              回到账户
            </Link>
          </section>
        ) : (
          <>
            <div className="flex items-center gap-3 px-1">
              <Image src="/dino-ip.png" alt="Dino" width={96} height={96} priority />
              <p
                className="flex-1 px-4 py-3 text-sm leading-relaxed"
                style={{ background: 'var(--dino-yellow-soft)', borderRadius: '12px', color: 'var(--text)' }}
              >
                嗨！我是 Dino，想听你说说话~
              </p>
            </div>

            <section className="p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>今天学单词的感觉是？</p>
              <div className="mt-4 grid grid-cols-4 gap-2">
                {MOODS.map(({ value, label, Icon }) => {
                  const selected = mood === value
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setMood(value)}
                      className="flex flex-col items-center gap-1.5 py-3"
                      style={{
                        border: selected ? '2px solid var(--accent)' : '1px solid var(--border)',
                        borderRadius: '12px',
                        background: selected ? 'var(--accent-soft)' : 'var(--bg)',
                        transform: selected ? 'scale(1.06)' : undefined,
                        cursor: 'pointer',
                      }}
                    >
                      <Icon size={40} />
                      <span className="text-xs font-medium" style={{ color: selected ? 'var(--accent)' : 'var(--muted)' }}>
                        {label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>

            <section className="p-5" style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={4}
                placeholder="想对 Dino 说点什么？（可以不写）"
                className="w-full p-3 text-sm resize-none"
                style={{ border: '1px solid var(--border)', borderRadius: '10px', background: 'var(--bg)', color: 'var(--text)' }}
              />
              <p className="mt-1 text-right text-xs" style={{ color: 'var(--muted)' }}>{message.length}/200</p>
            </section>

            {phase === 'error' && (
              <p className="px-4 py-3 text-sm" style={{ borderRadius: '10px', background: '#FFF1F2', color: '#BE123C' }}>
                信寄丢了，再试一次吧。
              </p>
            )}

            {isSupabaseConfigured ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!mood || phase === 'sending'}
                  className="w-full h-12 text-sm font-semibold"
                  style={{
                    borderRadius: '12px',
                    background: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: mood ? 1 : 0.6,
                  }}
                >
                  {phase === 'sending' ? '寄出中…' : '寄出 ✉️'}
                </button>
                {phase === 'sending' && (
                  <span className="fly-away absolute left-1/2 -translate-x-1/2" style={{ bottom: '52px', pointerEvents: 'none' }}>
                    <PaperPlaneIcon size={56} />
                  </span>
                )}
              </div>
            ) : (
              <p className="px-4 py-3 text-sm" style={{ borderRadius: '10px', background: '#FFF4EC', color: '#B45309' }}>
                Dino 的信箱还没装好，暂时收不到信哦。
              </p>
            )}
          </>
        )}
      </main>

      <div className="sticky bottom-0" style={{ background: 'rgba(248,246,241,0.96)' }}>
        <BottomTabBar />
      </div>
    </div>
  )
}
