import request from '../utils/request'

// 上传
export const addBook = (data: any) =>
  request.post<any>('/books/upload', data, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

// 获取列表
export const getBookList = (data: any) => request.get<any>('/books', data)

// 获取详情
export const getBookDetail = (id: number) => request.get<any>(`/books/${id}`)
export const getBooksDetailByIds = (ids: string[]) =>
  request.post<any>(`/books/batch`, { ids })
