import { useCallback, useEffect, useState } from 'react'
import { Button, Empty, Select, Spin, Tag } from 'antd'
import { RiDeleteBinLine, RiLoader2Line, RiVolumeUpLine } from '@remixicon/react'
import { deleteWordByText, getWordListByPagi } from '../api/word'
import { fetchUserBooks } from '../utils/userBooks'
import { speak, stopSpeaking } from '../utils/speech'
import useStore from '../store'

interface EntryListProps {
  /** 0 = 单词，1 = 句子 */
  isSentence: 0 | 1
  /** 选中的词书变化时通知上层（上层跳转循环播放页时需带上同一本书） */
  onBookChange?: (bookId?: number) => void
}

const PAGE_SIZE = 10

interface Entry {
  word: string
  phonetic?: string
  definition?: string
  phrases?: string | null
  isSentence?: boolean | number
}

/** 生词/句子列表（移动端）：按书籍筛选 + 滚动加载更多 */
const EntryList = ({ isSentence, onBookChange }: EntryListProps) => {
  const { userInfo } = useStore()
  const [bookId, setBookId] = useState<number | undefined>(undefined)
  const [items, setItems] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  /** 正在请求音频的条目，取到音频前显示 loading 并禁止重复点击 */
  const [speakLoading, setSpeakLoading] = useState<string | null>(null)

  const books = userInfo.books || []

  const fetchPage = useCallback(
    async (targetPage: number, targetBookId?: number, append = false) => {
      if (!userInfo.id) return
      setLoading(true)
      try {
        const { data } = await getWordListByPagi({
          page: targetPage,
          limit: PAGE_SIZE,
          isSentence,
          userId: userInfo.id as number,
          bookId: targetBookId as number,
        })
        const { items: list = [], pagination } = data
        setTotal(pagination?.total || 0)
        setItems((prev) => (append ? [...prev, ...list] : list))
      } catch {
        if (!append) setItems([])
      } finally {
        setLoading(false)
      }
    },
    [isSentence, userInfo.id],
  )

  useEffect(() => {
    if (!userInfo.id) return
    const first = books[0]?.id
    setBookId(first)
    onBookChange?.(first)
    setPage(1)
    fetchPage(1, first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo.id, books.length, isSentence])

  // 进入页面时重新拉取书籍列表：新读的书无需等下次登录即可出现在下拉中
  useEffect(() => {
    let alive = true
    fetchUserBooks()
      .then((next) => {
        if (alive) useStore.getState().updateUserInfo({ books: next })
      })
      .catch(() => {
        /* 刷新失败时沿用现有列表，不阻塞页面 */
      })
    return () => {
      alive = false
    }
  }, [])

  // 朗读：取到音频前显示 loading，期间禁止重复点击（参考桌面端 ActionIcons）
  const handleSpeak = async (word: string) => {
    if (speakLoading) return
    setSpeakLoading(word)
    try {
      await speak(word)
    } finally {
      setSpeakLoading(null)
    }
  }

  // 卸载（切页）时停止朗读，避免声音残留
  useEffect(() => () => stopSpeaking(), [])

  const remove = async (word: string) => {
    await deleteWordByText(word)
    setItems((prev) => prev.filter((i) => i.word !== word))
    setTotal((t) => Math.max(0, t - 1))
  }

  const parsePhrases = (raw?: string | null) => {
    if (!raw) return [] as { w: string; d: string }[]
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  const hasMore = items.length < total

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Select
          className="flex-1"
          value={bookId}
          placeholder="选择书籍"
          allowClear
          onChange={(v) => {
            setBookId(v)
            onBookChange?.(v)
            setPage(1)
            fetchPage(1, v)
          }}
          options={books.map((b) => ({ label: b.title, value: b.id }))}
        />
      </div>

      {items.length === 0 && !loading ? (
        <Empty className="py-16" description="暂无数据" />
      ) : null}

      {items.map((item) => {
        const phrases = parsePhrases(item.phrases)
        return (
          <div
            key={item.word}
            className="rounded-xl p-4"
            style={{ background: 'var(--global-bg-elevated, #fff)' }}
          >
            {isSentence ? (
              <>
                <div
                  className="text-[17px] font-bold break-words"
                  style={{ color: 'var(--global-primary)' }}
                >
                  {item.word}
                </div>
                <div className="mt-2 flex items-center justify-end gap-3">
                  <button
                    className="p-1 no-select"
                    onClick={() => handleSpeak(item.word)}
                    disabled={speakLoading === item.word}
                    aria-label="朗读"
                  >
                    {speakLoading === item.word ? (
                      <RiLoader2Line size={20} />
                    ) : (
                      <RiVolumeUpLine size={20} />
                    )}
                  </button>
                  <button className="p-1 no-select" onClick={() => remove(item.word)} aria-label="删除">
                    <RiDeleteBinLine size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <div
                    className="text-[17px] font-bold break-words"
                    style={{ color: 'var(--global-primary)' }}
                  >
                    {item.word}
                  </div>
                  {item.phonetic ? (
                    <div className="text-[13px] italic opacity-60 mt-0.5">{item.phonetic}</div>
                  ) : null}
                </div>
                <button
                  className="p-1 no-select"
                  onClick={() => handleSpeak(item.word)}
                  disabled={speakLoading === item.word}
                  aria-label="朗读"
                >
                  {speakLoading === item.word ? (
                    <RiLoader2Line size={20} />
                  ) : (
                    <RiVolumeUpLine size={20} />
                  )}
                </button>
                <button className="p-1 no-select" onClick={() => remove(item.word)} aria-label="删除">
                  <RiDeleteBinLine size={20} />
                </button>
              </div>
            )}

            {item.definition ? (
              <div className="mt-2 text-[15px] leading-relaxed whitespace-pre-wrap">
                {item.definition}
              </div>
            ) : null}

            {phrases.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {phrases.map((p, i) => (
                  <Tag key={i} className="!m-0 !py-1 !px-2 !whitespace-normal">
                    <span className="font-semibold mr-1">{p.w}</span>
                    <span className="text-[13px] opacity-70">{p.d}</span>
                  </Tag>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}

      {loading ? (
        <div className="py-4 flex justify-center">
          <Spin />
        </div>
      ) : null}

      {hasMore && !loading ? (
        <Button
          block
          onClick={() => {
            const next = page + 1
            setPage(next)
            fetchPage(next, bookId, true)
          }}
        >
          加载更多
        </Button>
      ) : null}
    </div>
  )
}

export default EntryList