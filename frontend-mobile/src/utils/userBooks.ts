import { me } from '../api/user'
import { getBooksDetailByIds } from '../api/book'

export interface UserBook {
  id: number
  title: string
}

/**
 * 拉取当前用户「在读 + 已读完」的书籍列表。
 *
 * 数据来源：/auth/me 的 currentBookId 与 completeBookIds，再批量取书籍详情。
 * 登录时由路由守卫构建一次；页面进入时再调用一次，即可让新读过的书
 * 立刻出现在筛选下拉里，无需等下次登录或整页刷新。
 */
export async function fetchUserBooks(): Promise<UserBook[]> {
  const { data } = await me()
  const ids = [
    data.currentBookId,
    ...String(data.completeBookIds || '').split(','),
  ].filter((id: any) => id)
  if (!ids.length) return []

  const { data: books } = await getBooksDetailByIds(ids)
  return (books || []).map((item: any) => ({
    id: item.id,
    title: item.title,
  }))
}