import { fetchEventSource } from '@microsoft/fetch-event-source'
import request from '../utils/request'

// 定义回调函数类型，用于实时传递流式数据
type StreamCallback = (content: string) => void
type CompleteCallback = () => void
type ErrorCallback = (error: Error) => void

/**
 * 获取翻译流式请求
 * @param user_id 用户ID
 * @param str 输入文本
 * @param onData 接收实时数据的回调
 * @param onComplete 流结束的回调
 * @param onError 错误回调
 */
export const grammarAnalyze = (
  str: string,
  onData: StreamCallback,
  onComplete: CompleteCallback,
  onError: ErrorCallback,
) => {
  const url = '/api/dbmd/superEnglishDict/stream'
  const body = JSON.stringify({ text: str })
  return fetchEventSource(url, {
    openWhenHidden: false,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`,
    },
    body,
    onmessage: (event) => {
      if (event.data === '[DONE]') {
        // 流结束标记
        onComplete()
        return
      }
      try {
        const content = JSON.parse(event.data)
        if (content) {
          onData(content)
        }
      } catch (e) {
        onError(new Error(`解析流式数据失败: ${(e as Error).message}`))
      }
    },
    // 处理错误
    onerror: (error) => {
      onError(error)
    },
    // 流关闭时触发
    onclose: () => {
      onComplete()
    },
  })
}

/**
 * 翻译-非流式请求
 * @param text
 * @returns
 */
export const getWordDataFormLLM = (text: string) =>
  request.post('/dbmd/superEnglishDict', { text })

/**
 * 文字转转语音
 */
export const getTTS = (
  text: string,
  speed: number = 0.9,
  voice_type: string = 'BV503_stream',
) => request.get('/tts', { text, speed, voice_type }, { responseType: 'blob' })
