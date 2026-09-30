import request from '../utils/request'

// 添加单词
export const addWord = (data: any) => request.post<any>('/words', data)
// 查找单词
export const getWordByText = (word: string) =>
  request.get<any>(`/words/search?word=${word}`)
// 删除单词
export const deleteWordByText = (word: string) =>
  request.delete<any>(`/words/by-word?word=${word}`)
// 分页获取单词
export const getWordListByPagi = (data: {
  page: number
  limit: number
  isSentence: 0 | 1
  userId: number
  bookId: number
}) =>
  request.get<any>(`/words`, {
    ...data,
    sortBy: 'createdAt',
    order: 'DESC',
  })
