import { getTTS, type SpeechLang } from '../api/llm'

/** 一次朗读的结局：done=正常播完；failed=请求或播放失败；interrupted=被打断（停止或新的朗读） */
export type SpeakResult = 'done' | 'failed' | 'interrupted'

/** 简易 deferred：重复 settle 会被 Promise 自动忽略 */
const deferred = <T,>() => {
  let settle!: (value: T) => void
  const promise = new Promise<T>((resolve) => {
    settle = resolve
  })
  return { promise, settle }
}

/**
 * 复用的音频元素。
 * iOS 与部分国产内核只允许「在用户手势内播放过的媒体元素」在后续脱离手势时继续播放，
 * 因此全程复用同一个元素，并在用户点击时先解锁它（见 unlockAudio）。
 */
let audioEl: HTMLAudioElement | null = null
/** 当前音频的 blob URL，停止/结束时释放 */
let currentUrl: string | null = null
/** 每次朗读递增，用于判断异步取回的音频是否已被新的朗读取代 */
let playSeq = 0
/** 当前这次播放的结束回调 */
let finish: ((result: SpeakResult) => void) | null = null
/** 兜底定时器：MP3 blob 的 duration 有时不可知，onended 可能不触发 */
let watchdog: ReturnType<typeof setTimeout> | null = null

const getAudioEl = () => {
  if (!audioEl) {
    audioEl = new Audio()
    audioEl.preload = 'auto'
  }
  return audioEl
}

/** 生成一段极短的静音 wav（8bit/8kHz），仅用于解锁音频元素 */
const buildSilentWavUrl = () => {
  const sampleRate = 8000
  const dataSize = 8
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i))
  }
  writeText(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeText(8, 'WAVE')
  writeText(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // 单声道
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate, true) // byteRate
  view.setUint16(32, 1, true) // blockAlign
  view.setUint16(34, 8, true) // 位深
  writeText(36, 'data')
  view.setUint32(40, dataSize, true)
  // 8bit PCM 的静音是 128，不是 0
  for (let i = 0; i < dataSize; i++) view.setUint8(44 + i, 128)
  return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }))
}

let unlocked = false

/**
 * 解锁音频元素：必须在用户手势的同步调用栈里调用。
 * 先用静音音频播一次，让内核把该元素标记为已获授权，
 * 之后脱离手势的连续自动播放才不会被拦截（否则会出现「读完英文就不读中文」这类偶现）。
 */
export const unlockAudio = () => {
  if (unlocked) return
  unlocked = true
  const el = getAudioEl()
  el.src = buildSilentWavUrl()
  el.play().catch(() => {
    /* 解锁失败也无法补救，后续播放失败会有日志 */
  })
}

/** 结束当前播放：清定时器、停音频、释放 URL，并把结局回调出去 */
const release = (result: SpeakResult) => {
  if (watchdog) {
    clearTimeout(watchdog)
    watchdog = null
  }
  if (audioEl) {
    audioEl.onended = null
    audioEl.onerror = null
    audioEl.pause()
  }
  if (currentUrl) {
    URL.revokeObjectURL(currentUrl)
    currentUrl = null
  }
  const done = finish
  finish = null
  if (done) done(result)
}

/** 停止当前朗读并释放资源（结局记为 interrupted） */
export const stopSpeaking = () => {
  playSeq++
  release('interrupted')
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/** 请求音频，失败重试一次；返回 null 表示彻底失败 */
const fetchAudio = async (text: string, lang: SpeechLang, seq: number) => {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res: any = await getTTS(text, lang)
      if (seq !== playSeq) return null
      const base64 = res?.data?.data
      if (typeof base64 === 'string' && base64) {
        return {
          base64,
          duration: Number(res?.data?.addition?.duration) || 0,
        }
      }
      console.warn(`[speech] TTS 未返回音频（第 ${attempt} 次）`, { lang, text })
    } catch (error) {
      console.warn(`[speech] TTS 请求失败（第 ${attempt} 次）`, { lang, text, error })
    }
    if (seq !== playSeq) return null
    await sleep(400)
  }
  return null
}

/**
 * 启动一次朗读（同一时刻只保留一条）。
 * started：音频开始播放或失败时兑现；ended：播放结束时兑现
 */
const startPlayback = async (text: string, lang: SpeechLang) => {
  stopSpeaking()
  const seq = playSeq
  const started = deferred<boolean>()
  const ended = deferred<SpeakResult>()

  finish = (result) => {
    started.settle(result === 'done')
    ended.settle(result)
  }

  const audio = await fetchAudio(text, lang, seq)
  if (!audio) {
    if (seq === playSeq) release('failed')
    return { started: started.promise, ended: ended.promise }
  }
  if (seq !== playSeq) {
    started.settle(false)
    ended.settle('interrupted')
    return { started: started.promise, ended: ended.promise }
  }

  const bytes = Uint8Array.from(atob(audio.base64), (c) => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'audio/mpeg' }))
  currentUrl = url

  const el = getAudioEl()
  el.src = url
  el.onended = () => release('done')
  el.onerror = () => release('failed')

  try {
    await el.play()
    started.settle(true)
  } catch (error) {
    // 多为浏览器自动播放策略拦截
    console.warn('[speech] 播放被拒绝', { lang, text, error })
    release('failed')
    return { started: started.promise, ended: ended.promise }
  }

  // 兜底：onended 未触发时按「服务端时长 + 余量」结束，避免循环卡死
  const fallback =
    audio.duration > 0 ? audio.duration + 2000 : text.length * 300 + 5000
  watchdog = setTimeout(() => release('done'), fallback)

  return { started: started.promise, ended: ended.promise }
}

/** 朗读（音频开始播放即返回），用于按钮点击 */
export const speak = async (text: string, lang: SpeechLang = 'en') => {
  const { started } = await startPlayback(text, lang)
  await started
}

/** 朗读并等待播放结束 */
export const speakAndWait = async (
  text: string,
  lang: SpeechLang = 'en',
): Promise<SpeakResult> => {
  const { ended } = await startPlayback(text, lang)
  return ended
}