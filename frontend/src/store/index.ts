import { create } from 'zustand'
import _ from 'lodash'
import { type ThemeKey } from '../theme/themeConfig'

declare interface UserInfo {
  currentBookId: null | number // 当前阅读书籍的id
  currentBookLoc: null | string // 当前阅读的位置
  username: null | string //用户名
  currentBookUrl: null | string //当前阅读书籍的地址
  id: number | string
  books: { title: string; id: number }[] // 在读+已读书籍
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
  }
  setUserInfo: (userInfo: any) => void
  updateUserInfo: (userInfo: any) => void
  updateThemeConfig: (themeConfig: any) => void
}

const useStore = create<State>()((set, get) => ({
  userInfo: {
    currentBookId: null,
    currentBookLoc: null,
    currentBookUrl: null,
    username: null,
    books: [],
    id: '',
    wordCount: 0,
    sentenceCount: 0,
    readingBook: [],
    completedBooks: [],
  },
  themeConfig: {
    theme: localStorage.getItem('theme') || 'white',
    fontSize: Number(localStorage.getItem('fontSize') || 16),
    readerWidth: localStorage.getItem('readerWidth') || '100%',
    opacity: Number(localStorage.getItem('opacity') || 100),
  },
  setUserInfo: (userInfo: any) => {
    set({ userInfo: { ...userInfo, books: [] } })
  },
  updateUserInfo: (data: any) => {
    set({ userInfo: { ...get().userInfo, ...data } })
  },
  updateThemeConfig: (data: any) => {
    Object.keys(data || {}).map((key) => {
      localStorage.setItem(key, data[key])
    })
    localStorage
    set({ themeConfig: { ...get().themeConfig, ...data } })
  },
}))

export default useStore
