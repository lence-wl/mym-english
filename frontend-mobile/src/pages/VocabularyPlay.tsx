import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button, Empty, Spin } from 'antd'
import { RiPauseLine, RiPlayLine, RiRestartLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import { getAllWords } from '../api/word'
import { speakAndWait, stopSpeaking, unlockAudio } from '../utils/speech'
import useStore from '../store'

interface WordItem {
  word: string
  phonetic?: string
  definition?: string
}

/** 进度记录在 localStorage：值为最后读完的那个单词 */
const progressKeyOf = (userId?: number | string, bookId?: number) =>
  `vocab_play_progress_${userId ?? 0}_${bookId ?? 'all'}`

/**
 * 生词自动循环播放：把「单词 + 中文释义」合并成一句朗读，读完最后一个回到第一个。
 * 进度存 localStorage，下次进入时可选择从记录继续或从头开始。
 */
const VocabularyPlay = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { userInfo } = useStore()

  const bookIdRaw = searchParams.get('bookId')
  const bookId = bookIdRaw ? Number(bookIdRaw) : undefined
  const progressKey = progressKeyOf(userInfo.id, bookId)

  const [list, setList] = useState<WordItem[]>([])
  const [loading, setLoading] = useState(true)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  /** 是否已做出「从哪开始」的选择；未选择时展示起始按钮，同时让首次播放落在用户手势内 */
  const [started, setStarted] = useState(false)

  const sessionRef = useRef(0)
  const runningRef = useRef(false)

  /** 上次读到的单词（本地记录） */
  const savedWord = useMemo(() => {
    try {
      return localStorage.getItem(progressKey)
    } catch {
      return null
    }
  }, [progressKey])

  /** 记录中的单词在列表中的位置，-1 表示列表中已不存在 */
  const savedIndex = useMemo(
    () => (savedWord ? list.findIndex((item) => item.word === savedWord) : -1),
    [savedWord, list],
  )

  useEffect(() => {
    let alive = true
    runningRef.current = false
    sessionRef.current++
    stopSpeaking()
    setStarted(false)
    setLoading(true)

    getAllWords({ isSentence: 0, userId: userInfo.id as number, bookId })
      .then((items) => {
        if (alive) setList(items)
      })
      .catch(() => {
        if (alive) setList([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })

    return () => {
      alive = false
      runningRef.current = false
      sessionRef.current++
      stopSpeaking()
    }
  }, [userInfo.id, bookId])

  /** 顺序播放：每条把「单词 + 中文释义」合并成一句，读完最后一个回到第一个 */
  const playFrom = async (startIndex: number) => {
    const session = ++sessionRef.current
    runningRef.current = true
    setStarted(true)
    setPlaying(true)

    let cursor = startIndex
    while (
      runningRef.current &&
      session === sessionRef.current &&
      list.length > 0
    ) {
      const item = list[cursor]
      setIndex(cursor)

      // 单词与中文释义合并成一句，用双语音色一次合成、一次播放，
      // 避免两次播放之间的衔接被自动播放策略拦截而丢句
      const meaning = (item.definition || '').trim()
      const text = meaning ? `${item.word}，${meaning}` : item.word

      const result = await speakAndWait(text, 'zh')
      if (result === 'interrupted' || session !== sessionRef.current) break
      if (result === 'failed') {
        // 没播出来：跳过本条，保持循环继续而不是整体停掉
        console.warn('[循环播放] 播放失败，跳过', item.word)
      }

      // 整条处理完后再记录进度
      try {
        localStorage.setItem(progressKey, item.word)
      } catch {
        /* 隐私模式下写入失败，忽略 */
      }

      cursor = (cursor + 1) % list.length
    }

    if (session === sessionRef.current) setPlaying(false)
  }

  /** 暂停：停在当前这条，继续时从当前这条的单词重新读起 */
  const pause = () => {
    runningRef.current = false
    sessionRef.current++
    stopSpeaking()
    setPlaying(false)
  }

  /** 从头/从记录重新开始 */
  const restart = (fromIndex: number) => {
    runningRef.current = false
    sessionRef.current++
    stopSpeaking()
    void playFrom(fromIndex)
  }

  const current = list[index]

  const startChoices = (
    <div className="h-full flex flex-col items-center justify-center gap-4">
      {savedIndex >= 0 ? (
        <>
          <p
            className="m-0 text-[15px] text-center"
            style={{ color: 'var(--global-text-secondary)' }}
          >
            上次读到第 {savedIndex + 1} 个：{savedWord}
          </p>
          <Button
            type="primary"
            size="large"
            onClick={() => {
              unlockAudio()
              void playFrom(savedIndex)
            }}
          >
            从记录继续
          </Button>
          <Button
            size="large"
            onClick={() => {
              unlockAudio()
              void playFrom(0)
            }}
          >
            从头开始
          </Button>
        </>
      ) : (
        <Button
          type="primary"
          size="large"
          disabled={list.length === 0}
          onClick={() => {
            unlockAudio()
            void playFrom(0)
          }}
        >
          开始播放
        </Button>
      )}
    </div>
  )

  const playingView = (
    <div className="h-full flex flex-col">
      <div
        className="shrink-0 text-center text-[13px] pt-2"
        style={{ color: 'var(--global-text-secondary)' }}
      >
        {index + 1} / {list.length}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-3 px-2">
        <div className="text-[32px] font-semibold text-center break-all">
          {current?.word}
        </div>
        {current?.phonetic ? (
          <div
            className="text-[14px]"
            style={{ color: 'var(--global-text-secondary)' }}
          >
            {current.phonetic}
          </div>
        ) : null}
        {current?.definition ? (
          <div
            className="text-[16px] text-center"
            style={{ color: 'var(--global-text-secondary)' }}
          >
            {current.definition}
          </div>
        ) : null}
      </div>

      <div className="shrink-0 flex items-center justify-center gap-3 pb-4">
        <Button
          shape="circle"
          size="large"
          aria-label={playing ? '暂停' : '继续'}
          icon={playing ? <RiPauseLine size={22} /> : <RiPlayLine size={22} />}
          onClick={() => {
            if (playing) {
              pause()
              return
            }
            unlockAudio()
            void playFrom(index)
          }}
        />
        <Button
          shape="circle"
          size="large"
          aria-label="从头开始"
          icon={<RiRestartLine size={22} />}
          onClick={() => {
            unlockAudio()
            restart(0)
          }}
        />
      </div>
    </div>
  )

  return (
    <PageShell title="循环播放" onBack={() => navigate(-1)}>
      {loading ? (
        <div className="h-full flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : list.length === 0 ? (
        <Empty className="py-16" description="生词本暂无单词" />
      ) : !started ? (
        startChoices
      ) : (
        playingView
      )}
    </PageShell>
  )
}

export default VocabularyPlay