import request from '../utils/request'

// 添加单词/句子
export const addWord = (data: any) => request.post<any>('/words', data)

// 按文本查找（用于判断是否已收藏）
export const getWordByText = (word: string) =>
  request.get<any>(`/words/search?word=${encodeURIComponent(word)}`)

// 删除
export const deleteWordByText = (word: string) =>
  request.delete<any>(`/words/by-word?word=${encodeURIComponent(word)}`)

// 分页获取单词/句子列表
export const getWordListByPagi = (data: {
  page: number
  limit: number
  isSentence: 0 | 1
  userId: number
  bookId: number
}) =>
  request.get<any>('/words', {
    ...data,
    sortBy: 'createdAt',
    order: 'DESC',
  })

/** 单页最大条数，与后端 QueryWordDto 的 @Max(100) 保持一致 */
const PAGE_LIMIT = 100

/**
 * 拉取某个词书下的全部单词/句子（自动翻页），用于自动循环播放。
 * 不传 bookId 表示全部词书
 */
export const getAllWords = async (data: {
  isSentence: 0 | 1
  userId: number
  bookId?: number
}) => {
  const { isSentence, userId, bookId } = data
  const query = () =>
    ({
      limit: PAGE_LIMIT,
      isSentence,
      userId,
      bookId: bookId as number,
    }) as const

  const first = await getWordListByPagi({ ...query(), page: 1 })
  const items: any[] = [...(first?.data?.items || [])]
  const total = first?.data?.pagination?.total ?? items.length

  const pageCount = Math.ceil(total / PAGE_LIMIT)
  for (let page = 2; page <= pageCount; page++) {
    const res = await getWordListByPagi({ ...query(), page })
    items.push(...(res?.data?.items || []))
  }
  return items
}