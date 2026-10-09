import { useCallback, useEffect, useState } from 'react'
import { Button, Empty, Select, Spin, Tag } from 'antd'
import { RiDeleteBinLine, RiVolumeUpLine } from '@remixicon/react'
import { deleteWordByText, getWordListByPagi } from '../api/word'
import useStore from '../store'

interface EntryListProps {
  /** 0 = 单词，1 = 句子 */
  isSentence: 0 | 1
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
const EntryList = ({ isSentence }: EntryListProps) => {
  const { userInfo } = useStore()
  const [bookId, setBookId] = useState<number | undefined>(undefined)
  const [items, setItems] = useState<Entry[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

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
    setPage(1)
    fetchPage(1, first)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInfo.id, books.length, isSentence])

  const speak = (text: string) => {
    try {
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance(text)
      u.lang = 'en-US'
      u.rate = text.split(/\s+/).length >= 3 ? 1 : 0.8
      window.speechSynthesis.speak(u)
    } catch {
      /* 忽略 */
    }
  }

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
            style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}
          >
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-[17px] font-bold break-words" style={{ color: '#6d8b74' }}>
                  {item.word}
                </div>
                {item.phonetic ? (
                  <div className="text-[13px] italic opacity-60 mt-0.5">{item.phonetic}</div>
                ) : null}
              </div>
              <button className="p-1 no-select" onClick={() => speak(item.word)} aria-label="朗读">
                <RiVolumeUpLine size={20} />
              </button>
              <button className="p-1 no-select" onClick={() => remove(item.word)} aria-label="删除">
                <RiDeleteBinLine size={20} />
              </button>
            </div>

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