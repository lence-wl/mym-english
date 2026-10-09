import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, notification, Spin } from 'antd'
import { RiAddLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import { getBookList } from '../api/book'
import { updateReadingStatus } from '../api/user'
import useStore from '../store'

interface BookItem {
  id: number
  title: string
  author: string
  description: string
}

const COVER_COLORS = [
  'linear-gradient(135deg, #e6e9f0 0%, #c8ceed 100%)',
  'linear-gradient(135deg, #fce4ec 0%, #f8ccd4 100%)',
  'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
  'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
  'linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%)',
  'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
]

/** 书架：双列卡片，点击进入阅读 */
const Bookshelf = () => {
  const navigate = useNavigate()
  const state = useStore()
  const [books, setBooks] = useState<BookItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getBookList({ limit: 50, page: 1 })
      .then(({ data }) => setBooks(data?.items || []))
      .finally(() => setLoading(false))
  }, [])

  const openBook = (book: BookItem) => {
    const currentBookId = state.userInfo.currentBookId
    if (currentBookId && currentBookId !== book.id) {
      notification.warning({
        message: '你已有正在阅读的书籍',
        description: '先读完当前这本，或从书架继续阅读',
      })
      return
    }
    // 同一本书是「继续阅读」，必须保留 currentBookLoc，否则阅读器会从第一页重新开始
    if (currentBookId !== book.id) {
      state.updateUserInfo({ currentBookId: book.id, currentBookLoc: null })
      updateReadingStatus(book.id, null).catch(() => {})
    }
    navigate('/reader')
  }

  return (
    <PageShell
      title="书架"
      extra={
        <button
          className="p-1 no-select"
          onClick={() => navigate('/addBook')}
          aria-label="上传书籍"
        >
          <RiAddLine size={22} />
        </button>
      }
    >
      <Spin spinning={loading}>
        {!loading && books.length === 0 ? (
          <Empty className="py-16" description="书架还是空的" />
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {books.map((book) => (
              <button
                key={book.id}
                className="text-left rounded-xl overflow-hidden no-select"
                style={{ background: 'var(--ant-color-bg-elevated, #fff)' }}
                onClick={() => openBook(book)}
              >
                <div
                  className="h-32 flex flex-col items-center justify-center px-3"
                  style={{ background: COVER_COLORS[book.id % COVER_COLORS.length] }}
                >
                  <div className="text-white font-bold text-center leading-snug line-clamp-3 drop-shadow">
                    {book.title}
                  </div>
                  <div className="text-white/90 text-xs mt-1">{book.author}</div>
                </div>
                <div className="p-3">
                  <div
                    className="text-[13px] leading-snug opacity-70"
                    style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {book.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </Spin>
    </PageShell>
  )
}

export default Bookshelf