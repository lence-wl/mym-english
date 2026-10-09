import request from '../utils/request'

/**
 * 释义查询（非流式）
 * 返回的 data 是 JSON 字符串，需要自行 JSON.parse
 */
export const getWordDataFormLLM = (text: string) =>
  request.post('/dbmd/superEnglishDict', { text })

/**
 * 语法解析（流式）：纯文本输出，边收边回调。
 *
 * 用 fetch + ReadableStream 手写 SSE 读取——EventSource 只支持 GET，
 * 而这里是带 JWT 的 POST。返回中断函数，换词/关抽屉时用它取消上一个请求。
 */
export const getGrammarStream = (
  text: string,
  handlers: {
    onDelta: (chunk: string) => void
    onDone: () => void
    onError: (message: string) => void
  },
): (() => void) => {
  const controller = new AbortController()
  const token = localStorage.getItem('token')

  fetch('/api/dbmd/grammar/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  })
    .then(async (res) => {
      if (!res.ok || !res.body) throw new Error(`请求失败：${res.status}`)

      const reader = res.body.getReader()
      const decoder = new TextDecoder('utf-8')
      let buffer = ''

      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() || '' // 保留未完成的行

        for (const line of lines) {
          const trimmed = line.trim()
          if (!trimmed || trimmed === '[DONE]' || trimmed === 'data: [DONE]') continue

          const jsonStr = trimmed.startsWith('data:') ? trimmed.replace(/^data: /, '') : trimmed
          if (!jsonStr || jsonStr === '[DONE]') continue

          try {
            const msg = JSON.parse(jsonStr)
            if (msg.success === false) {
              handlers.onError(msg.message || '语法解析失败')
              return
            }
            if (typeof msg.data === 'string' && msg.data) handlers.onDelta(msg.data)
          } catch {
            /* 单行解析失败就跳过，不影响后续内容 */
          }
        }
      }
      handlers.onDone()
    })
    .catch((e) => {
      // 主动中断不算失败
      if (controller.signal.aborted) return
      handlers.onError(e?.message || '语法解析失败')
    })

  return () => controller.abort()
}

/**
 * 文字转语音：返回音频 blob
 */
export const getTTS = (
  text: string,
  speed: number = 0.9,
  voice_type: string = 'BV503_stream',
) => request.get('/tts', { text, speed, voice_type }, { responseType: 'blob' })