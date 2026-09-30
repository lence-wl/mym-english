import React, { useState, useEffect } from 'react'
import { ReadOutlined } from '@ant-design/icons'
import {
  Space,
  Typography,
  Tag,
  Empty,
  Row,
  Col,
  Spin,
  Card as AntCard,
  notification,
} from 'antd'
import { getBookList } from '../api/book'
import staticData from '../staticData/index'
import { useNavigate } from 'react-router-dom'
import useStore from '../store'
import { updateReadingStatus } from '../api/user'
import { getBookDetail } from '../api/book'

// 书籍类型接口
interface BookItem {
  id: number
  title: string
  author: string
  description: string
}

// 分类标签组件
const CategoryTag = ({
  category,
  isActive,
  onClick,
}: {
  category: string
  isActive: boolean
  onClick: () => void
}) => (
  <Tag
    color={'#000'}
    className={`px-3 py-1 text-sm rounded-full cursor-pointer transition-opacity hover:opacity-90 ${
      isActive ? 'font-bold' : ''
    }`}
    onClick={onClick}
  >
    {category}
  </Tag>
)

// 书籍卡片组件 - 修复书脊跟随移动问题
const BookCard: React.FC<{ book: BookItem }> = ({ book }) => {
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

  // 点击跳转到阅读页面
  const goReader = async (id: number) => {
    if (
      state.userInfo.currentBookId === id ||
      state.userInfo.currentBookId === null
    ) {
      state.updateUserInfo({
        currentBookId: id,
      })

      await updateReadingStatus()
      navigate('/', { replace: true })
    } else {
      notification.open({
        message: '提示',
        type: 'error',
        description: '你已经有正在阅读的书籍了，不能贪多',
      })
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

            <Typography.Title
              level={5}
              className="m-0 text-center font-bold leading-tight z-10 px-3 text-white drop-shadow-md"
            >
              {book.title}
            </Typography.Title>
            <Typography.Text className="mt-2 opacity-90 z-10 text-white drop-shadow-sm">
              {book.author}
            </Typography.Text>
          </div>

          {/* 书籍信息 */}
          <div className="p-4 bg-white flex flex-col">
            <div className="flex-1">
              <Typography.Paragraph
                ellipsis={{ rows: 3, tooltip: true }}
                className="m-0 text-sm text-gray-700 leading-relaxed"
              >
                {book.description}
              </Typography.Paragraph>
            </div>

            <div
              onClick={() => {
                goReader(book.id)
              }}
              className="mt-3 pt-3 border-t border-gray-100"
            >
              <div className="flex justify-between items-center text-xs text-[#333] bolder">
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
  const [books, setBooks] = useState<BookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('全部')

  const getBookListByPagi = async () => {
    setLoading(true)
    const { data } = await getBookList({
      limit: 10,
      page: 1,
    })
    setBooks(data?.items || [])
    setLoading(false)
  }

  // 初始化加载数据
  useEffect(() => {
    getBookListByPagi()
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      {/* 主要内容区 */}
      <main className="flex-1 px-5 md:px-0 py-6 max-w-7xl mx-auto w-full">
        {/* 分类筛选栏 */}
        <div className="mb-6">
          <Space size="middle" wrap>
            {staticData.bookTypeList.map((category) => (
              <CategoryTag
                key={category}
                category={category}
                isActive={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              />
            ))}
          </Space>
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
                  <BookCard book={book} />
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
