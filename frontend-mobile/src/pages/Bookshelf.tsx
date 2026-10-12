import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Empty, Modal, Segmented, Spin, notification } from 'antd'
import { RiAddLine, RiDeleteBinLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import { getBookList, deleteBook, updateBookVisibility } from '../api/book'
import { updateReadingStatus } from '../api/user'
import useStore from '../store'

interface BookItem {
  id: number
  title: string
  author: string
  userId?: number // 上传者ID
  readerCount?: number // 在读人数
  isPublic?: boolean // 是否公开（公开后所有登录用户可见）
}

/** 书架分类：公共书籍 / 我的上传 /（仅管理员）全部书籍 */
type TabKey = 'public' | 'mine' | 'all'

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
  /** 当前分类 */
  const [tab, setTab] = useState<TabKey>('public')
  /** 编辑模式：开启后卡片右上角出现删除角标 */
  const [editing, setEditing] = useState(false)
  /** 待确认删除的书籍 */
  const [pendingDelete, setPendingDelete] = useState<BookItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const isAdmin = state.userInfo.role === 'admin'

  // 管理员多一个「全部书籍」用于挑选公开；普通用户只有公共书籍与自己上传
  const tabs = [
    { key: 'public' as TabKey, label: '公共书籍' },
    { key: 'mine' as TabKey, label: '我的上传' },
    ...(isAdmin ? [{ key: 'all' as TabKey, label: '全部书籍' }] : []),
  ]

  /** 按分类拼查询条件：公共=仅公开书；我的上传=仅自己上传；全部=不加限制 */
  const queryFor = (key: TabKey) => {
    if (key === 'public') return { isPublic: true }
    if (key === 'mine') return { userId: state.userInfo.id }
    return {}
  }

  useEffect(() => {
    setLoading(true)
    getBookList({ limit: 50, page: 1, ...queryFor(tab) })
      .then(({ data }) => setBooks(data?.items || []))
      .finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

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

  /** 仅上传者本人或管理员可删除（服务端同样会校验） */
  const canDelete = (book: BookItem) =>
    isAdmin || String(book.userId) === String(state.userInfo.id)

  /** 管理员切换书籍公开状态（服务端同样会校验管理员身份） */
  const toggleVisibility = async (book: BookItem) => {
    const next = !book.isPublic
    try {
      await updateBookVisibility(book.id, next)
      setBooks((prev) =>
        prev.map((item) =>
          item.id === book.id ? { ...item, isPublic: next } : item,
        ),
      )
      notification.success({
        message: next ? '已公开' : '已下架',
        placement: 'top',
      })
    } catch {
      notification.error({ message: '操作失败，请稍后重试', placement: 'top' })
    }
  }

  const confirmDelete = async () => {
    if (!pendingDelete) return
    setDeleting(true)
    try {
      await deleteBook(pendingDelete.id)
      setBooks((prev) => prev.filter((item) => item.id !== pendingDelete.id))
      setPendingDelete(null)
      notification.success({ message: '已删除', placement: 'top' })
    } catch {
      notification.error({ message: '删除失败，请稍后重试', placement: 'top' })
    } finally {
      setDeleting(false)
    }
  }

  return (
    <PageShell
      title="书架"
      extra={
        <div className="flex items-center gap-1">
          {/* 「公共书籍」无可管理内容，不显示编辑 */}
          {books.length > 0 && tab !== 'public' && (
            <button
              className="px-2 py-1 text-sm no-select"
              onClick={() => setEditing((v) => !v)}
            >
              {editing ? '完成' : '编辑'}
            </button>
          )}
          <button
            className="p-1 no-select"
            onClick={() => navigate('/addBook')}
            aria-label="上传书籍"
          >
            <RiAddLine size={22} />
          </button>
        </div>
      }
    >
      <Segmented
        block
        className="mb-3"
        value={tab}
        options={tabs.map((item) => ({ label: item.label, value: item.key }))}
        onChange={(value) => {
          setEditing(false)
          setTab(value as TabKey)
        }}
      />
      <Spin spinning={loading}>
        {!loading && books.length === 0 ? (
          <Empty
            className="py-16"
            description={
              tab === 'public'
                ? '还没有公开的书籍'
                : tab === 'mine'
                  ? '你还没有上传书籍'
                  : '书架还是空的'
            }
          />
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {books.map((book) => (
              <div
                key={book.id}
                className="relative text-left rounded-xl overflow-hidden no-select"
                style={{ background: 'var(--global-bg-elevated, #fff)' }}
                onClick={() => {
                  if (!editing) openBook(book)
                }}
              >
                <div
                  className="h-32 flex flex-col items-center justify-center px-3"
                  style={{ background: COVER_COLORS[book.id % COVER_COLORS.length] }}
                >
                  {/* 可见性角标 */}
                  <div
                    className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded text-[10px] text-white"
                    style={{ background: 'rgba(0,0,0,0.45)' }}
                  >
                    {book.isPublic ? '公开' : '私有'}
                  </div>
                  <div className="text-white font-bold text-center leading-snug line-clamp-3 drop-shadow">
                    {book.title}
                  </div>
                  {/* 作者行保持纯白：/90 的半透明会把对比度拉到 4.1，低于 4.5 的可读线 */}
                  <div className="text-white text-xs mt-1">{book.author}</div>
                </div>
                {/* 底部：在读人数（仅公开书有意义）/ 私有提示 + 管理员公开切换 */}
                <div
                  className="px-2 py-1.5 text-xs flex items-center justify-between gap-1"
                  style={{ color: 'var(--global-text-secondary, #6b7280)' }}
                >
                  <span>
                    {book.isPublic
                      ? `${book.readerCount || 0} 人在读`
                      : '仅自己可见'}
                  </span>
                  {editing && isAdmin && (
                    <button
                      className="no-select underline shrink-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleVisibility(book)
                      }}
                    >
                      {book.isPublic ? '下架' : '公开'}
                    </button>
                  )}
                </div>
                {/* 编辑态：删除角标 */}
                {editing && canDelete(book) && (
                  <button
                    className="absolute top-1.5 right-1.5 p-1.5 rounded-full no-select"
                    style={{ background: 'rgba(0,0,0,0.45)', color: '#fff' }}
                    aria-label="删除书籍"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPendingDelete(book)
                    }}
                  >
                    <RiDeleteBinLine size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </Spin>

      <Modal
        open={!!pendingDelete}
        title="删除书籍"
        okText="删除"
        cancelText="取消"
        confirmLoading={deleting}
        okButtonProps={{ danger: true }}
        onOk={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      >
        确定删除《{pendingDelete?.title}》吗？删除后书架将不再显示。
      </Modal>
    </PageShell>
  )
}

export default Bookshelf