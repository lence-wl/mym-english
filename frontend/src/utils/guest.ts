import { Modal } from 'antd'
import { me, updateReadingStatusById } from '../api/user'

/** 游客本地进度存储键：{ [bookId]: cfi } */
const GUEST_PROGRESS_KEY = 'guestReadingProgress'

/** 是否游客态（未登录）。登录态以 localStorage.token 为准，与路由守卫一致 */
export const isGuest = () => !localStorage.getItem('token')

/** 读取本地游客进度表（容错：损坏时退回空表） */
export function readGuestProgressMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GUEST_PROGRESS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

/** 读某本书的本地游客进度；无则返回 null */
export function readGuestProgress(
  bookId: number | string | null,
): string | null {
  if (bookId === null || bookId === undefined || bookId === '') return null
  return readGuestProgressMap()[String(bookId)] ?? null
}

/** 写某本书的本地游客进度 */
export function writeGuestProgress(
  bookId: number | string | null,
  cfi: string,
) {
  if (bookId === null || bookId === undefined || bookId === '') return
  const map = readGuestProgressMap()
  map[String(bookId)] = cfi
  localStorage.setItem(GUEST_PROGRESS_KEY, JSON.stringify(map))
}

/**
 * 登录成功后把游客期间积累的本地进度合并到账号。
 * 规则：仅当服务端该书「无进度」时才上传本地；服务端已有则保留服务端，不覆盖。
 */
export async function mergeGuestProgress() {
  const local = readGuestProgressMap()
  const bookIds = Object.keys(local)
  if (!bookIds.length) return
  try {
    const { data } = await me()
    // 服务端已有位置的书 id 集合（myBookData 各书位置 + currentBookId 的当前位置）
    const serverHas = new Set<string>(
      (data?.myBookData || []).map((b: any) => String(b.id)),
    )
    if (data?.currentBookId != null && data?.currentBookLoc) {
      serverHas.add(String(data.currentBookId))
    }
    for (const id of bookIds) {
      if (serverHas.has(String(id))) continue
      await updateReadingStatusById(id, local[id])
    }
    localStorage.removeItem(GUEST_PROGRESS_KEY)
  } catch {
    /* 合并失败静默忽略：本地进度保留，下次登录再试 */
  }
}

let prompting = false

/** 提示游客登录：确认后执行跳转动作；prompting 用于避免重复点击弹出多个框 */
export function promptGuestLogin(onConfirm: () => void) {
  if (prompting) return
  prompting = true
  Modal.confirm({
    title: '登录后可用',
    content: '登录后可使用查词 / 翻译 / 朗读 / 收藏能力',
    okText: '去登录',
    cancelText: '取消',
    onOk: () => onConfirm(),
    afterClose: () => {
      prompting = false
    },
  })
}
