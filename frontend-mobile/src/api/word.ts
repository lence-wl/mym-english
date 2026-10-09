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