import React, { useState, useEffect } from 'react'
import { ReadOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  Typography,
  Empty,
  Row,
  Col,
  Spin,
  Card as AntCard,
  Button,
  Popconfirm,
  Segmented,
  message,
} from 'antd'
import { getBookList, deleteBook, updateBookVisibility } from '../api/book'
import { getPublicBooks } from '../api/book'
import { useNavigate } from 'react-router-dom'
import useStore from '../store'
import { updateReadingStatus } from '../api/user'
import { getBookDetail } from '../api/book'
import { isGuest, readGuestProgress } from '../utils/guest'

// 书籍类型接口
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

// 书籍卡片组件 - 修复书脊跟随移动问题
const BookCard: React.FC<{
  book: BookItem
  editing: boolean
  onDeleted: (id: number) => void
  onVisibilityChanged: (id: number, isPublic: boolean) => void
}> = ({ book, editing, onDeleted, onVisibilityChanged }) => {
  const navigate = useNavigate()
  const state = useStore()
  // 生成基于书籍ID的随机颜色，确保一致性
  const getBookColor = (id: number) => {
    const colors = [
      'linear-gradient(135deg, #e6e9f0 0%, #c8ceed 100%)', // 淡紫蓝
      'linear-gradient(135deg, #fce4ec 0%, #f8ccd4 100%)', // 淡粉橙
      'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)', // 淡青蓝
      'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)', // 淡青绿
      'linear-gradient(135deg, #fff8e1 0%, #ffe0b2 100%)', // 淡暖黄
      'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)', // 淡薰衣草紫
    ]
    return colors[id % colors.length]
  }

  // 点击跳转到阅读页面（支持多本同时在读，随时可打开任意书）
  const goReader = async (id: number) => {
    const { userInfo } = state
    // 游客：进度只存本地，不上报服务端（无 token 也调不动能力接口）
    if (isGuest()) {
      state.updateUserInfo({
        currentBookId: id,
        currentBookLoc: readGuestProgress(id),
      })
      navigate('/', { replace: true })
      return
    }
    const saved = (userInfo.myBookData || []).find(
      (item) => String(item.id) === String(id),
    )
    state.updateUserInfo({
      currentBookId: id,
      // 当前这本沿用实时位置；切到别的书则用该书各自保存的位置，没有则从头开始
      currentBookLoc:
        userInfo.currentBookId === id
          ? userInfo.currentBookLoc
          : saved?.location || null,
    })

    await updateReadingStatus()
    navigate('/', { replace: true })
  }

  const isAdmin = state.userInfo.role === 'admin'

  /** 仅上传者本人或管理员可删除（服务端同样会校验） */
  const canDelete = isAdmin || String(book.userId) === String(state.userInfo.id)

  const handleDelete = async () => {
    try {
      await deleteBook(book.id)
      onDeleted(book.id)
      message.success('已删除')
    } catch {
      message.error('删除失败，请稍后重试')
    }
  }

  /** 管理员切换书籍公开状态（服务端同样会校验管理员身份） */
  const handleToggleVisibility = async () => {
    const next = !book.isPublic
    try {
      await updateBookVisibility(book.id, next)
      onVisibilityChanged(book.id, next)
      message.success(next ? '已公开' : '已下架')
    } catch {
      message.error('操作失败，请稍后重试')
    }
  }

  return (
    <div className="book-card-container relative h-full group cursor-pointer">
      {/* 整个卡片内容，包括书脊和主卡片 */}
      <div className="h-full transition-all duration-500 ease-in-out hover:translate-y-[-8px] hover:shadow-2xl">
        {/* 立体书脊 - 现在包含在同一个动画容器中 */}
        <div className="book-spine absolute left-0 top-0 w-4 h-full z-10 transition-all duration-500 ease-in-out">
          <div
            className="book-spine-inner w-full h-full rounded-l-lg"
            style={{
              background: getBookColor(book.id),
              borderRight: '2px solid rgba(255,255,255,0.3)',
              boxShadow: `
                inset -3px 0 6px rgba(0,0,0,0.4),
                2px 0 4px rgba(0,0,0,0.2)
              `,
              transform: 'translateX(-1px) skewY(-0.5deg)',
            }}
          >
            {/* 书脊文字 */}
            <div
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
                color: 'rgba(0,0,0,1)',
                fontSize: '10px',
                fontWeight: 'bold',
                textShadow: '1px 1px 2px  rgba(255,255,255,0.1)',
              }}
            >
              {book.author}
            </div>
          </div>
        </div>

        {/* 书籍卡片 */}
        <AntCard
          className="h-full rounded-xl shadow-md border-0 overflow-hidden ml-3"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          }}
          actions={[]}
        >
          {/* 书籍封面区域 */}
          <div
            className="h-48 flex flex-col justify-center items-center p-5 rounded-t-xl relative overflow-hidden"
            style={{
              background: getBookColor(book.id),
              color: '#fff',
            }}
          >
            {/* 书脊阴影过渡 */}
            <div
              className="absolute left-0 top-0 w-3 h-full"
              style={{
                background:
                  'linear-gradient(90deg, rgba(0,0,0,0.3), transparent)',
              }}
            ></div>

            {/* 光泽效果 */}
            <div
              className="absolute top-0 left-0 w-20 h-full transform skew-x-[-15deg]"
              style={{
                background:
                  'linear-gradient(90deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05), transparent)',
              }}
            ></div>

            {/* 可见性角标：仅管理员需要区分公开/私有，普通用户不显示 */}
            {isAdmin && (
              <div
                className="absolute top-2 left-3 z-20 px-2 py-0.5 rounded text-xs text-white"
                style={{ background: 'rgba(0,0,0,0.45)' }}
              >
                {book.isPublic ? '公开' : '私有'}
              </div>
            )}

            <Typography.Title
              level={5}
              className="m-0 text-center font-bold leading-tight z-10 px-3 text-white drop-shadow-md"
            >
              {book.title}
            </Typography.Title>
            <Typography.Text className="mt-2 opacity-90 z-10 text-white drop-shadow-sm">
              {book.author}
            </Typography.Text>

            {/* 编辑态：管理员公开/下架切换 */}
            {editing && isAdmin && (
              <Button
                size="small"
                className="absolute right-10 top-2 z-20"
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleVisibility()
                }}
              >
                {book.isPublic ? '下架' : '公开'}
              </Button>
            )}

            {/* 编辑态：删除角标（二次确认） */}
            {editing && canDelete && (
              <Popconfirm
                title="删除书籍"
                description={`确定删除《${book.title}》吗？`}
                okText="删除"
                cancelText="取消"
                okButtonProps={{ danger: true }}
                onConfirm={handleDelete}
              >
                <Button
                  danger
                  size="small"
                  shape="circle"
                  icon={<DeleteOutlined />}
                  className="absolute right-2 top-2 z-20"
                  onClick={(e) => e.stopPropagation()}
                />
              </Popconfirm>
            )}
          </div>

          {/* 书籍信息 */}
          <div className="p-4 bg-white flex flex-col">
            <div className="flex justify-between items-center text-xs text-[#666]">
              <span>
                {book.isPublic
                  ? `${book.readerCount || 0} 人在读`
                  : '仅自己可见'}
              </span>
              <div
                className="flex items-center gap-1 text-[#333] bolder cursor-pointer"
                onClick={() => {
                  if (editing) return
                  goReader(book.id)
                }}
              >
                <span>阅读</span>
                <ReadOutlined />
              </div>
            </div>
          </div>
        </AntCard>
      </div>
    </div>
  )
}

const EbookShelf: React.FC = () => {
  // 状态管理
  const state = useStore()
  const navigate = useNavigate()
  const guest = isGuest()
  const [books, setBooks] = useState<BookItem[]>([])
  const [loading, setLoading] = useState(true)
  /** 当前分类 */
  const [tab, setTab] = useState<TabKey>('public')
  /** 编辑模式：开启后卡片右上角出现删除角标 */
  const [editing, setEditing] = useState(false)

  const isAdmin = state.userInfo.role === 'admin'

  // 游客只能浏览公开书，故仅保留「公共书籍」；登录用户按角色展示分类
  const tabs = guest
    ? [{ key: 'public' as TabKey, label: '公共书籍' }]
    : [
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

  const getBookListByPagi = async () => {
    setLoading(true)
    // 游客走无鉴权的公开书接口，避免触发 401
    const res = guest
      ? await getPublicBooks({ limit: 10, page: 1 })
      : await getBookList({ limit: 10, page: 1, ...queryFor(tab) })
    setBooks(res.data?.items || [])
    setLoading(false)
  }

  // 切换分类时重新加载
  useEffect(() => {
    getBookListByPagi()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 主要内容区 */}
      <main className="flex-1 px-5 md:px-0 py-6 max-w-7xl mx-auto w-full">
        {/* 游客态：顶部提供显式登录入口，引导解锁查词/收藏/云同步等能力 */}
        {guest && (
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text type="secondary">
              未登录，当前仅可阅读公开书籍
            </Typography.Text>
            <Button type="primary" onClick={() => navigate('/login')}>
              登录
            </Button>
          </div>
        )}

        {/* 分类 tab：公共书籍 / 我的上传 /（管理员）全部书籍 */}
        <Segmented
          className="mb-4"
          value={tab}
          options={tabs.map((item) => ({ label: item.label, value: item.key }))}
          onChange={(value) => {
            setEditing(false)
            setTab(value as TabKey)
          }}
        />

        {/* 编辑开关 */}
        <div className="mb-6 flex justify-end">
          {/* 「公共书籍」无可管理内容，不显示编辑 */}
          {books.length > 0 && tab !== 'public' && (
            <Button onClick={() => setEditing((v) => !v)}>
              {editing ? '完成' : '编辑'}
            </Button>
          )}
        </div>

        {/* 书架内容区 */}
        <Spin spinning={loading} tip="加载书架中...">
          {books.length > 0 ? (
            <Row gutter={[24, 24]}>
              {books.map((book) => (
                <Col
                  xs={24}
                  sm={12}
                  md={8}
                  lg={6}
                  key={book.id}
                  className="flex"
                >
                  <BookCard
                    book={book}
                    editing={editing}
                    onDeleted={(id) =>
                      setBooks((prev) => prev.filter((item) => item.id !== id))
                    }
                    onVisibilityChanged={(id, isPublic) =>
                      setBooks((prev) =>
                        prev.map((item) =>
                          item.id === id ? { ...item, isPublic } : item,
                        ),
                      )
                    }
                  />
                </Col>
              ))}
            </Row>
          ) : (
            <div className="text-center p-15 bg-white rounded-xl shadow-sm">
              <Empty
                description={
                  <Typography.Text>
                    {loading ? '正在加载...' : '未找到匹配的书籍'}
                  </Typography.Text>
                }
              />
            </div>
          )}
        </Spin>
      </main>
    </div>
  )
}

export default EbookShelf
