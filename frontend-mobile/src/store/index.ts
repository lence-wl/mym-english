import { create } from 'zustand'
import { type ThemeKey } from '../theme/themeConfig'

declare interface UserInfo {
  currentBookId: null | number // 当前阅读书籍的id
  currentBookLoc: null | string // 当前阅读的位置
  /** 各本书各自的阅读位置：[{ id: '书籍ID', location: '阅读位置' }] */
  myBookData: { id: string; location: string }[]
  username: null | string
  currentBookUrl: null | string
  id: number | string
  /** 用户角色：admin-管理员，common-普通，vip-会员（用于判断能否删除他人书籍） */
  role?: string
  books: { title: string; id: number }[]
  wordCount: number
  sentenceCount: number
  readingBook: { title: string; id: number }[]
  completedBooks: { title: string; id: number }[]
}

export interface State {
  userInfo: UserInfo
  themeConfig: {
    theme: ThemeKey
    fontSize: number
    opacity: number
    readerWidth: string
    /** 正文行高倍数 */
    lineHeight: number
    /** 正文左右页边距（px） */
    pageMargin: number
  }
  setUserInfo: (userInfo: any) => void
  updateUserInfo: (userInfo: any) => void
  /** 清空用户信息：退出登录/登录态失效时调用，避免切号后残留上个账号的数据 */
  resetUserInfo: () => void
  updateThemeConfig: (themeConfig: any) => void
}

/** 初始用户信息：登录前 / 登出后统一回到这个状态 */
const INITIAL_USER_INFO: UserInfo = {
  currentBookId: null,
  currentBookLoc: null,
  myBookData: [],
  currentBookUrl: null,
  username: null,
  books: [],
  id: '',
  wordCount: 0,
  sentenceCount: 0,
  readingBook: [],
  completedBooks: [],
}

const useStore = create<State>()((set, get) => ({
  userInfo: { ...INITIAL_USER_INFO },
  themeConfig: {
    theme: (localStorage.getItem('theme') as ThemeKey) || 'white',
    fontSize: Number(localStorage.getItem('fontSize') || 20),
    readerWidth: localStorage.getItem('readerWidth') || '100%',
    opacity: Number(localStorage.getItem('opacity') || 100),
    lineHeight: Number(localStorage.getItem('lineHeight') || 1.6),
    pageMargin: Number(localStorage.getItem('pageMargin') || 16),
  },
  setUserInfo: (userInfo: any) => {
    set({ userInfo: { ...userInfo, books: [] } })
  },
  updateUserInfo: (data: any) => {
    set({ userInfo: { ...get().userInfo, ...data } })
  },
  resetUserInfo: () => {
    set({ userInfo: { ...INITIAL_USER_INFO } })
  },
  updateThemeConfig: (data: any) => {
    Object.keys(data || {}).forEach((key) => {
      localStorage.setItem(key, data[key])
    })
    set({ themeConfig: { ...get().themeConfig, ...data } })
  },
}))

export default useStore