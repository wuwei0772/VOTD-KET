'use client'

import { useEffect, useState } from 'react'
import { type WordInfo, getWordInfo, wordImageUrl } from '@/lib/word-data'
import { speakEnglish } from '@/lib/tts'

// Deep-encoding card shown when a word enters the review book (or is answered
// wrong during review): image, pronunciation, meaning, usage note, examples,
// and optionally the student's wrong answer next to the correct one.

export interface WrongChoice {
  chosen: string
  chosenNote?: string
  correct: string
  correctNote?: string
}

interface Props {
  word: string
  wrongChoice?: WrongChoice | null
  autoSpeak?: boolean
}

// Mounted with key={word} by callers, so all state naturally resets per word.
export default function WordLearnCard({ word, wrongChoice, autoSpeak = false }: Props) {
  const [info, setInfo] = useState<WordInfo | null>(null)
  const [infoLoading, setInfoLoading] = useState(true)
  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading')
  const [speaking, setSpeaking] = useState(autoSpeak)
  const [speakingEx, setSpeakingEx] = useState<number | null>(null)

  useEffect(() => {
    let active = true
    getWordInfo(word).then((data) => {
      if (!active) return
      setInfo(data)
      setInfoLoading(false)
    })
    if (autoSpeak) {
      speakEnglish(word, { onEnd: () => active && setSpeaking(false) })
    }
    return () => { active = false }
  }, [word, autoSpeak])

  const speak = () => {
    setSpeakingEx(null)
    if (!speakEnglish(word, { onEnd: () => setSpeaking(false) })) return
    setSpeaking(true)
  }

  const speakExample = (text: string, i: number) => {
    setSpeaking(false)
    setSpeakingEx(i)
    speakEnglish(text, { onEnd: () => setSpeakingEx(null) })
  }

  return (
    <div className="flex flex-col gap-3">

      {/* Word + pronunciation */}
      <div
        style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
        className="px-5 py-4 flex items-center justify-between gap-3"
      >
        <h2 className="flex-1 break-words leading-tight" style={{ fontSize: '28px', fontWeight: 700, color: 'var(--text)' }}>
          {word}
        </h2>
        <button
          onClick={speak}
          style={{
            width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0,
            background: speaking ? 'var(--accent)' : 'var(--label-bg)',
            color: speaking ? '#fff' : 'var(--muted)',
            border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
          title="朗读"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
          </svg>
        </button>
      </div>

      {/* Wrong-answer contrast */}
      {wrongChoice && (
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          className="px-5 py-4 flex flex-col gap-2"
        >
          <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px' }} className="px-3 py-2">
            <p className="text-xs font-medium" style={{ color: '#A32D2D' }}>你刚才的答案</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#501313' }}>{wrongChoice.chosen}</p>
            {wrongChoice.chosenNote && (
              <p className="text-xs mt-0.5" style={{ color: '#A32D2D', opacity: 0.85 }}>{wrongChoice.chosenNote}</p>
            )}
          </div>
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '8px' }} className="px-3 py-2">
            <p className="text-xs font-medium" style={{ color: '#639922' }}>正确答案</p>
            <p className="text-sm font-medium mt-0.5" style={{ color: '#27500A' }}>{wrongChoice.correct}</p>
            {wrongChoice.correctNote && (
              <p className="text-xs mt-0.5" style={{ color: '#639922', opacity: 0.9 }}>{wrongChoice.correctNote}</p>
            )}
          </div>
        </div>
      )}

      {/* Image */}
      <div
        style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px',
          overflow: 'hidden', height: '160px', position: 'relative',
        }}
      >
        {imgState === 'loading' && (
          <div className="absolute inset-0 animate-pulse" style={{ background: 'var(--label-bg)' }} />
        )}
        {imgState !== 'error' && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={word}
            src={wordImageUrl(word)}
            alt={word}
            onLoad={() => setImgState('loaded')}
            onError={() => setImgState('error')}
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              opacity: imgState === 'loaded' ? 1 : 0, transition: 'opacity 0.4s ease',
            }}
          />
        )}
        {imgState === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--label-bg)' }}>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>暂无配图</p>
          </div>
        )}
      </div>

      {/* Meaning + usage + examples */}
      {infoLoading ? (
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          className="px-5 py-4"
        >
          <div className="animate-pulse rounded h-5 w-3/5" style={{ background: 'var(--label-bg)' }} />
          <div className="animate-pulse rounded mt-3 h-4 w-full" style={{ background: 'var(--label-bg)' }} />
          <div className="animate-pulse rounded mt-2 h-4 w-4/5" style={{ background: 'var(--label-bg)' }} />
        </div>
      ) : info ? (
        <>
          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
            className="px-5 py-4"
          >
            <p className="font-semibold" style={{ fontSize: '18px', color: 'var(--text)', lineHeight: 1.4 }}>
              {info.meaning}
            </p>
            {info.usageNote && (
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>
                {info.usageNote}
              </p>
            )}
          </div>

          <div
            style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
            className="px-5 py-4"
          >
            <div className="space-y-3">
              {info.examples.map((ex, i) => (
                <div
                  key={i}
                  className={i > 0 ? 'pt-3' : ''}
                  style={i > 0 ? { borderTop: '1px solid var(--border)' } : undefined}
                >
                  <div className="flex items-start gap-2">
                    <p className="flex-1 text-sm font-medium leading-relaxed" style={{ color: 'var(--text)' }}>
                      {ex.en}
                    </p>
                    <button
                      onClick={() => speakExample(ex.en, i)}
                      style={{
                        flexShrink: 0, width: '28px', height: '28px', borderRadius: '6px',
                        background: speakingEx === i ? 'var(--accent)' : 'var(--label-bg)',
                        color: speakingEx === i ? '#fff' : 'var(--muted)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.15s', marginTop: '1px',
                      }}
                      title="朗读例句"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      </svg>
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed mt-0.5" style={{ color: 'var(--muted)' }}>
                    {ex.zh}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div
          style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px' }}
          className="px-5 py-6 text-center"
        >
          <p className="text-sm" style={{ color: 'var(--muted)' }}>词卡内容加载失败</p>
        </div>
      )}
    </div>
  )
}
