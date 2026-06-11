// Shared text-to-speech helper.
//
// speechSynthesis with only `lang = 'en-US'` lets the browser pick the voice;
// on systems whose UI language is Chinese this often falls back to a Chinese
// or low-quality compact voice reading English. We explicitly select the best
// available English voice instead.

let cachedVoice: SpeechSynthesisVoice | null = null

// Preferred voices, best first. Names cover Chrome (Google), macOS/iOS
// (Samantha/Karen/Daniel) and Windows (Microsoft natural voices).
const PREFERRED = [
  'Google US English',
  'Samantha',
  'Microsoft Aria Online (Natural) - English (United States)',
  'Microsoft Jenny Online (Natural) - English (United States)',
  'Karen',
  'Daniel',
]

function pickEnglishVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice) return cachedVoice
  const voices = window.speechSynthesis.getVoices()
  if (voices.length === 0) return null

  const byName = PREFERRED.map((name) => voices.find((v) => v.name === name)).find(Boolean)
  const voice =
    byName ??
    // Prefer non-"compact" (compact = low-quality robotic voices on Apple platforms)
    voices.find((v) => v.lang.startsWith('en-US') && !v.voiceURI.includes('compact')) ??
    voices.find((v) => v.lang.startsWith('en') && !v.voiceURI.includes('compact')) ??
    voices.find((v) => v.lang.startsWith('en')) ??
    null

  if (voice) cachedVoice = voice
  return voice
}

// Voice list loads asynchronously in Chrome; refresh the cache when ready.
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null
    pickEnglishVoice()
  }
}

// Chrome stops firing events on utterances that get garbage-collected;
// hold a reference to the active one until it finishes.
let currentUtterance: SpeechSynthesisUtterance | null = null

export function speakEnglish(
  text: string,
  opts: { rate?: number; onEnd?: () => void } = {},
): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return false
  const synth = window.speechSynthesis

  const doSpeak = () => {
    const u = new SpeechSynthesisUtterance(text)
    currentUtterance = u
    u.lang = 'en-US'
    u.rate = opts.rate ?? 0.85
    const voice = pickEnglishVoice()
    if (voice) u.voice = voice
    const done = () => {
      if (currentUtterance === u) currentUtterance = null
      opts.onEnd?.()
    }
    u.onend = done
    u.onerror = (e) => {
      if (e.error !== 'interrupted' && e.error !== 'canceled') {
        console.warn('[tts] speech error:', e.error)
      }
      done()
    }
    synth.speak(u)
    // Chrome can wedge into a paused state where utterances queue but never
    // start; resume() is a no-op when not paused and unsticks it when it is.
    synth.resume()
  }

  if (synth.speaking || synth.pending) {
    // Detach the old utterance's callbacks first: its cancel-induced end/error
    // events fire async and would otherwise clobber the new utterance's state.
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
      currentUtterance = null
    }
    synth.cancel()
    // Chrome intermittently drops an utterance queued synchronously after
    // cancel(); give the engine a tick to flush first.
    setTimeout(doSpeak, 60)
  } else {
    doSpeak()
  }
  return true
}

export function stopSpeaking() {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    if (currentUtterance) {
      currentUtterance.onend = null
      currentUtterance.onerror = null
      currentUtterance = null
    }
    window.speechSynthesis.cancel()
  }
}
