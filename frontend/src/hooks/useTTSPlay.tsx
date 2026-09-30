import { useState, useRef, useEffect } from 'react'
import request from '../utils/request'

// 字级别时间戳类型（匹配火山引擎返回格式）
interface WordTimestamp {
  word: string // 单个字符
  start_time: number // 字符开始时间（毫秒）
  end_time: number // 字符结束时间（毫秒）
}

// 扩展接口返回的时间戳结构
interface FrontendTimestamp {
  words: WordTimestamp[] // 字级别时间戳数组
  phonemes?: any[] // 音素级时间戳（可选，暂不用）
}

// 请求参数类型（新增时间戳参数）
export interface TtsRequest {
  text: string // 文本
  voiceType: string // 音色
  speedRatio: number // 语速
  volumeRatio: number // 音量
  pitchRatio: number // 音调
  emotion?: string // 情感
  with_timestamp?: number // 新增
}

// 接口返回类型（扩展时间戳字段）
interface TtsResponse {
  code: number
  success: boolean
  message: string
  timestamp: number
  data: {
    code: number
    message: string
    reqid: string
    sequence: number
    data: string // Base64音频数据
    addition?: {
      duration: string
      frontend?: string // 时间戳JSON字符串（含words数组）
      description?: string
    }
  }
}

// IndexedDB缓存数据类型
interface TtsCacheData {
  key: string // 参数哈希值
  params: TtsRequest // 请求参数
  audioData: string // Base64音频数据
  duration: string // 音频时长
  frontend: string | null // 时间戳JSON字符串
  createTime: number // 创建时间戳
}

// Hook入参类型
interface UseTtsWithWordHighlightOptions {
  /** 是否开启语音合成完成后自动播放 */
  autoPlay?: boolean
}

// 默认请求参数
const DEFAULT_OPTIONS: TtsRequest = {
  text: 'Hello world',
  voiceType: 'BV511_streaming',
  speedRatio: 1.0, // 速度
  volumeRatio: 1.0, // 音量
  pitchRatio: 1.0, // 音调
  emotion: '', // 情感
  with_timestamp: 1, // 启用字级别时间戳
}

// ========== IndexedDB 工具类 ==========
class TtsIndexedDB {
  private dbName = 'TTSCacheDB'
  private storeName = 'ttsCache'
  private dbVersion = 1
  private db: IDBDatabase | null = null

  // 初始化数据库
  private async initDB(): Promise<IDBDatabase> {
    if (this.db) return this.db

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      // 数据库升级/创建
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        // 创建对象仓库，以key为主键
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName, { keyPath: 'key' })
        }
      }

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result
        resolve(this.db)
      }

      request.onerror = (event) => {
        reject(
          new Error(
            `IndexedDB初始化失败: ${(event.target as IDBOpenDBRequest).error?.message}`,
          ),
        )
      }
    })
  }

  // 生成参数哈希值（简单哈希算法，也可使用crypto API）
  generateParamsKey(params: TtsRequest): string {
    // 只对核心参数进行哈希，排除timestamp等动态参数
    const coreParams = {
      text: params.text,
      voiceType: params.voiceType,
      speedRatio: params.speedRatio,
      volumeRatio: params.volumeRatio,
      pitchRatio: params.pitchRatio,
      emotion: params.emotion || '',
      with_timestamp: params.with_timestamp || 1,
    }

    // 简单哈希算法（生产环境可替换为crypto.createHash('sha1')）
    const str = JSON.stringify(coreParams)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // 转换为32位整数
    }
    return `tts_${Math.abs(hash).toString(16)}`
  }

  // 从缓存获取数据
  async getCache(params: TtsRequest): Promise<TtsCacheData | null> {
    try {
      const db = await this.initDB()
      const key = this.generateParamsKey(params)

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readonly')
        const store = transaction.objectStore(this.storeName)
        const request = store.get(key)

        request.onsuccess = () => {
          resolve((request.result as TtsCacheData) || null)
        }

        request.onerror = () => {
          resolve(null)
        }
      })
    } catch (error) {
      console.error(error)
      return null
    }
  }

  // 存入缓存
  async setCache(
    params: TtsRequest,
    audioData: string,
    duration: string,
    frontend: string | null,
  ): Promise<boolean> {
    try {
      const db = await this.initDB()
      const key = this.generateParamsKey(params)
      const cacheData: TtsCacheData = {
        key,
        params,
        audioData,
        duration,
        frontend,
        createTime: Date.now(),
      }

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.put(cacheData) // put：存在则更新，不存在则新增

        request.onsuccess = () => {
          resolve(true)
        }

        request.onerror = () => {
          resolve(false)
        }
      })
    } catch (error) {
      console.error(error)
      return false
    }
  }

  // 清理过期缓存（可选）
  async clearExpiredCache(expireTime = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    try {
      const db = await this.initDB()
      const now = Date.now()

      return new Promise((resolve) => {
        const transaction = db.transaction(this.storeName, 'readwrite')
        const store = transaction.objectStore(this.storeName)
        const request = store.openCursor()

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result
          if (cursor) {
            const cacheData = cursor.value as TtsCacheData
            // 删除超过7天的缓存
            if (now - cacheData.createTime > expireTime) {
              cursor.delete()
            }
            cursor.continue()
          } else {
            resolve()
          }
        }

        request.onerror = () => {
          resolve()
        }
      })
    } catch (error) {
      console.error(error)
    }
  }
}

// 创建IndexedDB实例
const ttsDB = new TtsIndexedDB()

// ========== Hook 核心逻辑 ==========
export const useTtsWithWordHighlight = ({
  autoPlay = false,
}: UseTtsWithWordHighlightOptions = {}) => {
  // 交互状态
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [audioDuration, setAudioDuration] = useState<number>(0)
  const [options, setOptions] = useState<TtsRequest>({ ...DEFAULT_OPTIONS })

  // 逐字高亮核心状态
  const [wordTimestamps, setWordTimestamps] = useState<WordTimestamp[]>([]) // 字级别时间戳
  const [currentPlayTime, setCurrentPlayTime] = useState<number>(0) // 当前播放时间（毫秒）
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number>(-1) // 当前高亮字的索引
  const [isPlaying, setIsPlaying] = useState<boolean>(false)

  // 新增：同步Ref，解决异步状态问题
  const wordTimestampsRef = useRef<WordTimestamp[]>([])
  // 监听状态变化，同步更新Ref（关键）
  useEffect(() => {
    wordTimestampsRef.current = wordTimestamps
  }, [wordTimestamps])

  // 创建Audio实例引用
  const audioInstanceRef = useRef<HTMLAudioElement | null>(null)
  const playProgressRef = useRef<number | null>(null) // 进度监听计时器
  // 音频总时长（毫秒）：用Ref同步读取，避免定时器/播放回调里的闭包取到旧值
  const audioDurationRef = useRef<number>(0)

  // 根据当前播放时间，找到应高亮的字索引
  const getHighlightedWordIndex = (currentTimeMs: number): number => {
    // 优先使用Ref中的时间戳（实时更新）
    const timestamps = wordTimestampsRef.current
    if (timestamps.length === 0) return -1

    // 播放已结束（或已超过音频总时长）时，保持高亮最后一个字
    const totalDuration = audioDurationRef.current
    if (totalDuration > 0 && currentTimeMs >= totalDuration) {
      return timestamps.length - 1
    }

    // 刚开始播放、还没进入第一个字的时间区间时，先高亮第一个字
    // （豆包返回的首字 startTime 往往有 0.2s 左右的前导静音）
    if (currentTimeMs < timestamps[0].start_time - 50) {
      return 0
    }

    // 遍历所有字的时间戳，匹配当前播放时间所在的字
    for (let i = 0; i < timestamps.length; i++) {
      const { start_time, end_time } = timestamps[i]
      // 允许±50ms误差（避免网络延迟导致的高亮不匹配）
      if (currentTimeMs >= start_time - 50 && currentTimeMs <= end_time + 50) {
        return i
      }
    }

    return -1
  }

  // 监听音频播放进度:逐字高亮
  const handleAudioTimeUpdate = () => {
    if (!audioInstanceRef.current) return
    const currentTimeMs = Math.round(
      audioInstanceRef.current.currentTime * 1000,
    )
    setCurrentPlayTime(currentTimeMs)

    // 更新当前高亮的字索引
    const newIndex = getHighlightedWordIndex(currentTimeMs)
    if (newIndex !== highlightedWordIndex) {
      setHighlightedWordIndex(newIndex)
    }
  }

  // 处理音频播放
  const handleAudioPlay = () => {
    if (!audioInstanceRef.current || !audioUrl) return

    // 播放音频
    audioInstanceRef.current
      .play()
      .then(() => {
        setIsPlaying(true)
        // 立即触发一次高亮计算（解决首次播放无高亮）
        const initialTimeMs = Math.round(
          audioInstanceRef.current!.currentTime * 1000,
        )
        const initialIndex = getHighlightedWordIndex(initialTimeMs)
        setHighlightedWordIndex(initialIndex)

        // 启动进度监听计时器
        playProgressRef.current = window.setInterval(() => {
          handleAudioTimeUpdate()
        }, 50)
      })
      .catch((err) => {
        setError(err.message)
      })
  }

  // 处理音频暂停
  const handleAudioPause = () => {
    if (audioInstanceRef.current) {
      audioInstanceRef.current.pause()
    }
    setIsPlaying(false)
    // 清除进度监听计时器
    if (playProgressRef.current) {
      clearInterval(playProgressRef.current)
      playProgressRef.current = null
    }
  }

  // 初始化Audio实例
  useEffect(() => {
    // 创建新的Audio实例
    audioInstanceRef.current = new Audio()
    // 绑定音频事件
    const audio = audioInstanceRef.current
    if (audio) {
      // 播放结束事件
      audio.onended = () => {
        handleAudioPause()
        // 高亮最后一个字（使用Ref避免空数组）
        setHighlightedWordIndex(-1)
      }
      // 音频加载完成事件（获取准确时长）
      audio.onloadedmetadata = () => {
        if (Number.isFinite(audio.duration) && audio.duration > 0) {
          const totalMs = Math.round(audio.duration * 1000)
          setAudioDuration(totalMs)
          audioDurationRef.current = totalMs
        }
      }
      // 错误事件监听
      audio.onerror = (e) => {
        // console.error(e)
      }
    }

    // 清理函数
    return () => {
      if (audioInstanceRef.current) {
        audioInstanceRef.current.pause()
        audioInstanceRef.current.src = ''
        audioInstanceRef.current = null
      }
      if (playProgressRef.current) {
        clearInterval(playProgressRef.current)
      }
    }
  }, [])

  // 处理缓存数据（复用原有逻辑）
  const handleCacheData = (cacheData: TtsCacheData) => {
    try {
      // 1. 解析音频数据
      const audioBuffer = Uint8Array.from(atob(cacheData.audioData), (c) =>
        c.charCodeAt(0),
      )
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      // 2. 解析音频时长
      if (cacheData.duration) {
        const totalMs = parseInt(cacheData.duration)
        setAudioDuration(totalMs)
        audioDurationRef.current = totalMs
      }

      // 3. 解析字级别时间戳
      if (cacheData.frontend) {
        try {
          const frontendData = JSON.parse(
            cacheData.frontend,
          ) as FrontendTimestamp
          setWordTimestamps(frontendData.words)
          // 同步更新Ref（关键）
          wordTimestampsRef.current = frontendData.words
        } catch (parseErr) {
          console.error(parseErr)
        }
      } else {
        setError('当前音色不支持字级别时间戳，逐字高亮功能不可用')
      }

      // 使用Audio实例实现自动播放
      if (audioInstanceRef.current) {
        audioInstanceRef.current.src = url

        if (autoPlay) {
          audioInstanceRef.current
            .play()
            .then(() => {
              setIsPlaying(true)
              // 立即触发一次高亮计算
              const initialTimeMs = Math.round(
                audioInstanceRef.current!.currentTime * 1000,
              )
              const initialIndex = getHighlightedWordIndex(initialTimeMs)
              setHighlightedWordIndex(initialIndex)

              playProgressRef.current = window.setInterval(() => {
                handleAudioTimeUpdate()
              }, 50)
            })
            .catch((err) => {
              setError('自动播放失败，请手动点击播放按钮（浏览器安全限制）')
              console.warn(err)
            })
        }
      }
    } catch (err: any) {
      const errMsg = err.message || `缓存解析失败: ${err.code || '未知错误'}`
      setError(errMsg)
      console.error(err)
    }
  }

  // 更新请求参数
  const setParams = (data: any) => {
    setOptions((prev) => ({
      ...prev,
      ...data,
    }))
  }

  // handleSubmit接收自定义参数，覆盖默认参数
  const handleSubmit = async (customParams: Partial<TtsRequest> = {}) => {
    const queryOptions = {
      ...DEFAULT_OPTIONS,
      ...options,
      ...customParams,
    }

    // 校验文本是否为空
    if (!queryOptions.text.trim()) {
      setError('请输入需要合成的文本内容')
      return
    }

    // 重置状态
    setLoading(true)
    setError('')
    setAudioUrl('')
    setAudioDuration(0)
    audioDurationRef.current = 0
    // setWordTimestamps([])
    // wordTimestampsRef.current = [] // 同步重置Ref
    setHighlightedWordIndex(-1)

    // 暂停当前播放的音频
    handleAudioPause()

    try {
      // ========== 新增：先查询缓存 ==========
      const cacheData = await ttsDB.getCache(queryOptions)
      if (cacheData) {
        handleCacheData(cacheData)
        setLoading(false)
        return
      }

      // ========== 缓存未命中，发起网络请求 ==========
      // 调用接口（传递合并后的参数）
      const response = await request.post<TtsResponse>(
        '/tts/synth',
        queryOptions,
        {
          timeout: 30000,
        },
      )
      const resData = response as any
      const ttsData = response.data as any
      // 校验接口返回
      if (!resData.success || resData.code !== 200) {
        throw new Error(`请求失败: ${resData.message || '未知错误'}`)
      }
      if (ttsData.code !== 3000 || ttsData.message !== 'Success') {
        throw new Error(
          `TTS合成失败: ${ttsData.message || '错误码=' + ttsData.code}`,
        )
      }
      if (!ttsData.data) {
        throw new Error('合成成功，但未返回音频数据')
      }

      // 1. 解析音频数据
      const audioBuffer = Uint8Array.from(atob(ttsData.data), (c) =>
        c.charCodeAt(0),
      )
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)

      // 2. 解析音频时长（接口返回的时长）
      const duration = ttsData.addition?.duration || ''
      if (duration) {
        const totalMs = parseInt(duration)
        setAudioDuration(totalMs)
        audioDurationRef.current = totalMs
      }

      // 3. 关键：解析字级别时间戳（frontend字段是JSON字符串）
      const frontend = ttsData.addition?.frontend || null
      if (frontend) {
        try {
          const frontendData = JSON.parse(frontend) as FrontendTimestamp
          // 验证时间戳与文本长度一致（避免匹配错误）
          setWordTimestamps(frontendData.words)
          // 同步更新Ref（关键）
          wordTimestampsRef.current = frontendData.words
        } catch (parseErr) {
          console.error(parseErr)
          setError('逐字高亮功能不可用（时间戳格式错误）')
        }
      } else {
        setError('当前音色不支持字级别时间戳，逐字高亮功能不可用')
      }

      // ========== 新增：存入缓存 ==========
      await ttsDB.setCache(queryOptions, ttsData.data, duration, frontend)

      // 使用Audio实例实现自动播放
      if (audioInstanceRef.current) {
        // 设置音频源
        audioInstanceRef.current.src = url

        // 根据autoPlay参数控制是否自动播放
        if (autoPlay) {
          audioInstanceRef.current
            .play()
            .then(() => {
              setIsPlaying(true)
              // 立即触发一次高亮计算
              const initialTimeMs = Math.round(
                audioInstanceRef.current!.currentTime * 1000,
              )
              const initialIndex = getHighlightedWordIndex(initialTimeMs)
              setHighlightedWordIndex(initialIndex)

              // 启动进度监听
              playProgressRef.current = window.setInterval(() => {
                handleAudioTimeUpdate()
              }, 50)
            })
            .catch((err) => {
              setError('自动播放失败，请手动点击播放按钮（浏览器安全限制）')
              console.warn(err)
            })
        }
      }
    } catch (err: any) {
      const errMsg = err.message || `合成失败: ${err.code || '未知错误'}`
      setError(errMsg)
      console.error('TTS合成失败:', err)
    } finally {
      setLoading(false)
    }
  }

  // 下载音频
  const handleDownload = () => {
    if (!audioUrl) return
    const link = document.createElement('a')
    link.href = audioUrl
    link.download = `tts_${Date.now()}.mp3`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // 重置状态（不再重置表单，仅重置播放相关状态）
  const handleReset = () => {
    setError('')
    setAudioUrl('')
    setAudioDuration(0)
    audioDurationRef.current = 0
    setWordTimestamps([])
    wordTimestampsRef.current = [] // 同步重置Ref
    setHighlightedWordIndex(-1)

    // 暂停并清空音频
    handleAudioPause()
    if (audioInstanceRef.current) {
      audioInstanceRef.current.src = ''
    }
  }

  // 清理资源（避免内存泄漏）
  useEffect(() => {
    // 组件挂载时清理过期缓存（可选）
    ttsDB.clearExpiredCache().catch((err) => console.error(err))

    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl)
      if (playProgressRef.current) clearInterval(playProgressRef.current)
    }
  }, [audioUrl])

  // 渲染逐字文本的方法（抽离到Hook中）
  const renderHighlightedText = () => {
    // 优先使用Ref中的时间戳（避免异步状态导致空数组）
    const timestamps = wordTimestampsRef.current
    if (timestamps.length === 0) {
      // 无时间戳时，显示默认文本或空
      return <span>{options.text}</span>
    }
    // 有时间戳时，逐字渲染并高亮当前字
    return (
      <span style={{ lineHeight: '1.8', fontSize: '16px' }}>
        {timestamps.map(({ word }, index) => (
          <span
            key={index}
            style={{
              padding: '0 4px',
              position: 'relative',
              backgroundColor:
                highlightedWordIndex === index ? '#FFD700' : 'transparent',
              transition: 'background-color 0.1s ease',
              borderRadius: '2px',
            }}
          >
            {word}
          </span>
        ))}
      </span>
    )
  }

  // 返回所有需要在组件中使用的状态和方法
  return {
    // 状态
    loading,
    error,
    audioUrl,
    audioDuration,
    highlightedWordIndex,
    wordTimestampsRef,
    isPlaying,
    // 默认参数（供组件参考使用）
    defaultOptions: DEFAULT_OPTIONS,
    // 方法
    setParams,
    handleSubmit,
    handleDownload,
    handleReset,
    handleAudioPlay,
    handleAudioPause,
    handleAudioTimeUpdate,
    RenderHighlightedText: renderHighlightedText,
  }
}
