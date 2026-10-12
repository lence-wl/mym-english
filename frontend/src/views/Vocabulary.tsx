import useStore from '../store'
import { getWordListByPagi } from '../api/word'
import { fetchUserBooks } from '../utils/userBooks'
import type { PaginationProps } from 'antd'
import { useEffect, useState } from 'react'
import { Pagination, Form, Select, Radio, Space, Button, Row, Col } from 'antd'
import PageWrapper from '../components/PageWrapper'
import VocabularyCard, {
  type VocabularyCardProps,
} from '../components/VocabularyCard'
import { SearchOutlined } from '@ant-design/icons'

// 假设书籍列表类型（实际项目中根据接口调整）
interface BookItem {
  id: number
  title: string
}

export default () => {
  const { userInfo } = useStore()
  const [list, setList] = useState<VocabularyCardProps[]>([])
  const [total, setTotal] = useState<number>(0)
  const [current, setCurrent] = useState<number>(1)
  const [limit, setLimit] = useState<number>(12) // 调整初始每页数量适配列数
  const [form] = Form.useForm()
  const [books, setBooks] = useState<BookItem[]>(userInfo.books || [])

  // 获取单词/句子列表
  const getWords = async () => {
    const values = await form.validateFields()
    const { data } = await getWordListByPagi({
      page: current,
      limit,
      isSentence: 0,
      userId: userInfo.id as number,
      bookId: values.bookId || undefined,
    })
    const { items = [], pagination } = data
    setTotal(pagination.total)
    setList(items)
  }

  // 分页变更
  const onShowSizeChange: PaginationProps['onShowSizeChange'] = (
    currentPage,
    pageSize
  ) => {
    setLimit(pageSize)
    setCurrent(currentPage)
    getWords()
  }

  // 页码变更
  const onChange: PaginationProps['onChange'] = (page) => {
    setCurrent(page)
    getWords()
  }

  // 发音功能
  const onPlay = (word: string) => {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.rate = word.split(' ').length >= 3 ? 1.0 : 0.8
    window.speechSynthesis.speak(utterance)
  }

  // 搜索按钮点击
  const handleSearch = () => {
    setCurrent(1)
    getWords()
  }

  // 初始加载和参数变更时重新获取数据
  useEffect(() => {
    if (userInfo.id && userInfo.books.length) {
      getWords()
    }
  }, [current, limit, userInfo.id])

  useEffect(() => {
    if (userInfo.books.length) {
      setBooks(userInfo.books)
      form.setFieldValue('bookId', userInfo.books[0].id)
      getWords()
    }
  }, [userInfo.books.length])

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

  // 组件卸载停止播放
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  return (
    <div>
      <PageWrapper>
        {/* 查询表单 */}
        <div className="mb-5">
          <Form
            form={form}
            layout="inline"
            initialValues={{ type: 'word', bookId: userInfo.books[0]?.id || 0 }}
          >
            <Form.Item name="bookId" label="书籍">
              <Select<number>
                style={{ width: 200 }}
                placeholder="选择书籍"
                allowClear
              >
                {books.map((book) => (
                  <Select.Option key={book.id} value={book.id}>
                    {book.title}
                  </Select.Option>
                ))}
              </Select>
            </Form.Item>
            <Form.Item className="flex-2! flex justify-end">
              <Space>
                <Button
                  type="primary"
                  icon={<SearchOutlined />}
                  onClick={handleSearch}
                >
                  查询
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </div>

        {/* 单词卡片列表 - 使用Row Col实现响应式布局 */}
        <div className="h-[calc(100vh-180px)] overflow-y-auto overflow-x-hidden">
          <Row gutter={[30, 30]}>
            {list.length > 0 ? (
              list.map((item) => (
                <Col
                  key={item.word} // 假设word唯一，更合理的key
                  xs={24} // 超小屏幕(手机)：屏幕宽度 < 576px 时，1列（24/24=1）
                  md={8} // 中等屏幕(平板)：屏幕宽度 ≥ 768px 时，3列（24/8=3）
                  lg={6} // 大屏幕(桌面)：屏幕宽度 ≥ 992px 时，4列（24/6=4）
                  xl={6} // 超大屏幕(宽屏桌面)：屏幕宽度 ≥ 1200px 时，4列（24/6=4）
                  xxl={3} // 极超大屏幕(超大宽屏)：屏幕宽度 ≥ 1600px 时，8列（24/3=8）
                >
                  <VocabularyCard onPlay={onPlay} {...item} />
                </Col>
              ))
            ) : (
              <Col
                span={24}
                className="h-[300px] flex items-center justify-center text-gray-500"
              >
                暂无数据
              </Col>
            )}
          </Row>
        </div>

        {/* 分页 */}
        <div className="mt-6">
          <Pagination
            align="end"
            onShowSizeChange={onShowSizeChange}
            onChange={onChange}
            current={current}
            pageSize={limit}
            total={total}
            showSizeChanger
            pageSizeOptions={['6', '12', '24', '36']} // 适配列数的分页选项
          />
        </div>
      </PageWrapper>
    </div>
  )
}
