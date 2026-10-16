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

// 删除书籍（仅上传者本人或管理员）
export const deleteBook = (id: number) => request.delete<any>(`/books/${id}`)

// 设置书籍公开/私有（仅管理员）
export const updateBookVisibility = (id: number, isPublic: boolean) =>
  request.patch<any>(`/books/${id}/visibility`, { isPublic })
export const getBooksDetailByIds = (ids: string[]) =>
  request.post<any>(`/books/batch`, { ids })

// 公开书列表（游客可访问，无需登录）
export const getPublicBooks = (data: any) =>
  request.get<any>('/books/public', data)

// 公开书详情（游客可访问，无需登录，含 filePath）
export const getPublicBookDetail = (id: number) =>
  request.get<any>(`/books/public/${id}`)
