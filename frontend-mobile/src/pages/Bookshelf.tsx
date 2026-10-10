import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, Spin } from 'antd'
import { RiAddLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import { getBookList } from '../api/book'
import { updateReadingStatus } from '../api/user'
import useStore from '../store'

interface BookItem {
  id: number
  title: string
  author: string
}

// 封面底色统一压到中深调：白字在这些底色上对比度 >= 4.5:1。
// 之前的浅色马卡龙渐变配白字只有 1.4:1 左右，标题靠 drop-shadow 勉强能看、作者行直接糊掉
const COVER_COLORS = [
  'linear-gradient(135deg, #5b6b8c 0%, #414e6d 100%)', // 黛蓝
  'linear-gradient(135deg, #a85f70 0%, #83485a 100%)', // 绛红
  'linear-gradient(135deg, #3a7480 0%, #2b5761 100%)', // 青碧
  'linear-gradient(135deg, #4f7a5c 0%, #3a5d48 100%)', // 苔绿
  'linear-gradient(135deg, #8f6a35 0%, #6d4f26 100%)', // 沉稳棕
  'linear-gradient(135deg, #6f5f9c 0%, #54467a 100%)', // 紫檀
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
    // 允许随时切换到任意一本：每本书各自记录阅读位置（后端 myBookData），
    // 换回来时接着上次的位置继续读，不会因为换书而丢掉进度
    if (state.userInfo.currentBookId !== book.id) {
      const saved = (state.userInfo.myBookData || []).find(
        (item) => String(item.id) === String(book.id),
      )
      const loc = saved?.location || null
      state.updateUserInfo({ currentBookId: book.id, currentBookLoc: loc })
      updateReadingStatus(book.id, loc).catch(() => {})
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
                style={{ background: 'var(--global-bg-elevated, #fff)' }}
                onClick={() => openBook(book)}
              >
                <div
                  className="h-32 flex flex-col items-center justify-center px-3"
                  style={{ background: COVER_COLORS[book.id % COVER_COLORS.length] }}
                >
                  <div className="text-white font-bold text-center leading-snug line-clamp-3 drop-shadow">
                    {book.title}
                  </div>
                  {/* 作者行保持纯白：/90 的半透明会把对比度拉到 4.1，低于 4.5 的可读线 */}
                  <div className="text-white text-xs mt-1">{book.author}</div>
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