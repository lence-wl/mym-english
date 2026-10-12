import { me } from '../api/user'
import { getBooksDetailByIds } from '../api/book'

export interface UserBook {
  id: number
  title: string
}

/**
 * 从 /auth/me 的返回中提取「在读书籍」id 列表（去重）。
 *
 * - myBookData：在读书单（每本书各存一份阅读位置），支持一个用户多本同时在读
 * - currentBookId：最近打开的那本，兼容历史数据（当时还没登记进 myBookData）
 * - completeBookIds：已读完的书籍
 */
export function userBookIds(data: any): string[] {
  const raw = [
    data?.currentBookId,
    ...(data?.myBookData || []).map((item: any) => item.id),
    ...String(data?.completeBookIds || '').split(','),
  ].filter((id: any) => id !== null && id !== undefined && id !== '')
  return Array.from(new Set(raw.map((id: any) => String(id))))
}

/** 按 id 批量取书籍详情（服务端只返回当前用户可见的部分） */
export async function fetchBooksByIds(ids: string[]): Promise<UserBook[]> {
  if (!ids.length) return []
  const { data: books } = await getBooksDetailByIds(ids)
  return (books || []).map((item: any) => ({
    id: item.id,
    title: item.title,
  }))
}

/**
 * 拉取当前用户「在读 + 已读完」的书籍列表。
 *
 * 登录时由路由守卫构建一次；生词本/句子本等页面进入时再调用一次，
 * 即可让新读过的书立刻出现在筛选下拉里，无需等下次登录或整页刷新。
 */
export async function fetchUserBooks(): Promise<UserBook[]> {
  const { data } = await me()
  return fetchBooksByIds(userBookIds(data))
}