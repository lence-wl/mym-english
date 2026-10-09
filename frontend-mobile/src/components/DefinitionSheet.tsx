import { useEffect, useRef, useState } from 'react'
import { Spin, Tabs } from 'antd'
import { RiCloseLine, RiStarFill, RiStarLine, RiVolumeUpLine } from '@remixicon/react'
import { getWordDataFormLLM, getGrammarStream } from '../api/llm'
import { addWord, deleteWordByText, getWordByText } from '../api/word'
import { readingColorConfig } from '../theme/themeConfig'
import useStore from '../store'

interface DefinitionSheetProps {
  /** 被查的文本：单个单词走单词卡片，多词/整句走句子卡片 */
  text: string
  open: boolean
  onClose: () => void
}

interface DefinitionData {
  /** 单词音标 */
  p?: string
  /** 单词释义 */
  d?: string
  /** 句子翻译 */
  t?: string
  /** 句子内单词逐条释义 */
  l?: { w: string; d: string }[]
}

/**
 * 选词释义底部抽屉：优先读取生词本已有释义，未收藏则请求大模型。
 * 多词选段额外提供「语法解析」Tab：老师口吻的纯文本讲解，流式边收边显示。
 */
const DefinitionSheet = ({ text, open, onClose }: DefinitionSheetProps) => {
  const themeConfig = useStore((s) => s.themeConfig)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<DefinitionData>({})
  const [favorite, setFavorite] = useState(false)
  const [tab, setTab] = useState('def')
  const [grammarLoading, setGrammarLoading] = useState(false)
  const [grammarText, setGrammarText] = useState('')
  const [grammarError, setGrammarError] = useState(false)
  /** 本次语法解析是否已经结束（结束后切 Tab 回来不再重复请求） */
  const grammarDoneRef = useRef(false)
  const reqIdRef = useRef(0)

  const isSentence = !!data.t
  const colorText = readingColorConfig[themeConfig.theme]?.colorText || '#374151'
  // 单个单词没有句子结构可分析，隐藏「语法解析」
  const canGrammar = /\s/.test(text.trim())

  useEffect(() => {
    // 换词/关闭时重置语法结果与当前 Tab
    setTab('def')
    setGrammarText('')
    setGrammarLoading(false)
    setGrammarError(false)
    grammarDoneRef.current = false

    if (!open || !text.trim()) return
    const reqId = ++reqIdRef.current
    setLoading(true)
    setData({})
    setFavorite(false)

    const load = async () => {
      try {
        const res = await getWordByText(text)
        if (reqId !== reqIdRef.current) return
        const saved = res.data?.[0]
        if (saved) {
          setFavorite(true)
          if (saved.isSentence && saved.phrases) {
            setData({ t: saved.definition, l: JSON.parse(saved.phrases || '[]') })
          } else {
            setData({ p: saved.phonetic, d: saved.definition })
          }
          setLoading(false)
          return
        }
        // 未收藏 -> 请求大模型
        const llmRes = (await getWordDataFormLLM(text)) as any
        if (reqId !== reqIdRef.current) return
        const parsed = JSON.parse(llmRes.data)
        setData(parsed)
      } catch (e) {
        console.error(e)
      } finally {
        if (reqId === reqIdRef.current) setLoading(false)
      }
    }
    load()
  }, [text, open])

  // 语法解析懒加载（流式）：切到「语法解析」Tab 才发起，边收边渲染
  useEffect(() => {
    if (!open || tab !== 'grammar' || !canGrammar) return
    if (grammarDoneRef.current) return

    const reqId = reqIdRef.current
    setGrammarText('')
    setGrammarLoading(true)
    setGrammarError(false)

    const abort = getGrammarStream(text, {
      onDelta: (chunk) => {
        if (reqId !== reqIdRef.current) return
        setGrammarText((prev) => prev + chunk)
      },
      onDone: () => {
        if (reqId !== reqIdRef.current) return
        grammarDoneRef.current = true
        setGrammarLoading(false)
      },
      onError: () => {
        if (reqId !== reqIdRef.current) return
        setGrammarError(true)
        setGrammarLoading(false)
      },
    })

    return () => {
      abort()
      // 中途离开（切 Tab / 换词）：丢掉半截结果，下次进来重新请求
      if (!grammarDoneRef.current) {
        setGrammarText('')
        setGrammarLoading(false)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, open, text, canGrammar])

  const speak = () => {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = 0.8
      window.speechSynthesis.speak(u)
    } catch {
      /* 浏览器不支持时忽略 */
    }
  }

  const toggleFavorite = async () => {
    try {
      if (favorite) {
        await deleteWordByText(text)
        setFavorite(false)
      } else {
        await addWord({
          word: text,
          phonetic: data.p || '',
          definition: data.t || data.d || '',
          bookId: useStore.getState().userInfo.currentBookId,
          isSentence: isSentence,
          phrases: JSON.stringify(data.l || []),
        })
        setFavorite(true)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const definitionPane = loading ? (
    <div className="py-6 flex justify-center">
      <Spin />
    </div>
  ) : isSentence ? (
    <div>
      <div className="py-1 font-medium">{data.t}</div>
      <div className="mt-2">
        {(data.l || []).map((item, i) => (
          <div
            key={i}
            className="py-1.5 border-t"
            style={{ borderColor: `color-mix(in srgb, ${colorText} 12%, transparent)` }}
          >
            <div className="font-semibold">
              {i + 1}. {item.w}
            </div>
            <div className="opacity-80 ml-4 mt-0.5">{item.d}</div>
          </div>
        ))}
      </div>
    </div>
  ) : (
    <div>
      {data.p ? <div className="text-[13px] italic opacity-70">{data.p}</div> : null}
      {data.d ? (
        <div className="mt-1 whitespace-pre-wrap leading-relaxed">{data.d}</div>
      ) : (
        <div className="opacity-60">未获取到释义，请重试</div>
      )}
    </div>
  )

  // 有内容就先把已到的文本渲染出来（流式边收边显示）；只有还没收到任何内容时才转圈
  const grammarPane = grammarText ? (
    <div className="leading-relaxed">
      {grammarText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          // 第一行是整句大意，加粗作引子；其余是讲解正文
          <p key={i} className={i === 0 ? 'mb-2 font-medium' : 'mb-2'}>
            {p}
          </p>
        ))}
      {grammarLoading ? <span className="opacity-40">▍</span> : null}
    </div>
  ) : grammarLoading ? (
    <div className="py-6 flex justify-center">
      <Spin />
    </div>
  ) : grammarError ? (
    <div className="py-4 opacity-60">语法解析失败，请重试</div>
  ) : (
    <div className="py-4 opacity-60">未获取到语法解析</div>
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100]">
      {/* 遮罩：点击关闭 */}
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="absolute left-0 right-0 bottom-0 rounded-t-2xl shadow-2xl flex flex-col"
        style={{
          // 固定为屏幕高度的一半，内容超出就在内容区滚动
          height: '50vh',
          background: 'var(--ant-color-bg-elevated, #fff)',
          paddingBottom: 'var(--safe-bottom)',
        }}
      >
        {/* 顶部：原文 + 操作 */}
        <div className="shrink-0 flex items-start gap-3 px-4 pt-4 pb-2">
          <div className="flex-1 min-w-0">
            <div className="text-[17px] font-bold break-words" style={{ color: colorText }}>
              {text}
            </div>
          </div>
          <button className="shrink-0 p-1 no-select" onClick={speak} aria-label="朗读">
            <RiVolumeUpLine size={22} color={colorText} />
          </button>
          <button
            className="shrink-0 p-1 no-select"
            onClick={toggleFavorite}
            aria-label={favorite ? '取消收藏' : '收藏'}
          >
            {favorite ? (
              <RiStarFill size={22} color="#eab308" />
            ) : (
              <RiStarLine size={22} color={colorText} />
            )}
          </button>
          <button className="shrink-0 p-1 no-select" onClick={onClose} aria-label="关闭">
            <RiCloseLine size={22} color={colorText} />
          </button>
        </div>

        {/* 内容区：释义 / 语法解析，超出高度时在这里滚动 */}
        <div
          className="flex-1 min-h-0 px-4 pb-4 overflow-y-auto scroll-y"
          style={{ color: colorText, fontSize: 15 }}
        >
          <Tabs
            size="small"
            activeKey={tab}
            onChange={setTab}
            items={[
              { key: 'def', label: '释义', children: definitionPane },
              ...(canGrammar
                ? [{ key: 'grammar', label: '语法解析', children: grammarPane }]
                : []),
            ]}
          />
        </div>
      </div>
    </div>
  )
}

export default DefinitionSheet