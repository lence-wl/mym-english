import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useStore from '../store'
import { me } from '../api/user'
import { fetchBooksByIds, userBookIds } from '../utils/userBooks'
import TabBar from '../layout/TabBar'
import { Spin } from 'antd'

/** 登录态守卫：校验 token、拉取用户信息，并渲染底部 Tab 导航 */
const PrivateRoute = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const state = useStore()
  const [loading, setLoading] = useState(false)
  const hasToken = !!localStorage.getItem('token')

  const loadUser = async () => {
    try {
      setLoading(true)
      const { data } = await me()
      console.log('[reading-progress] me() returned', {
        currentBookId: data.currentBookId,
        currentBookLoc: data.currentBookLoc,
        myBookData: data.myBookData,
      })
      state.setUserInfo(data)
      // 在读书籍来自 myBookData（可多本同时在读）+ 已读完
      const ids = userBookIds(data)
      if (ids.length) {
        state.updateUserInfo({ books: await fetchBooksByIds(ids) })
      }
    } catch {
      localStorage.removeItem('token')
      // 登录态失效同样要清空用户信息，避免下次以别的账号登录后仍显示旧数据
      state.resetUserInfo()
      navigate('/login', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!hasToken) {
      navigate('/login', { replace: true })
      return
    }
    if (!state.userInfo.username) loadUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasToken, location.pathname])

  if (!hasToken) return <Navigate to="/login" replace />

  // 阅读页与循环播放页为沉浸全屏，不展示底部导航
  const hideTabBar =
    location.pathname === '/reader' || location.pathname === '/vocabulary/play'

  if (loading && !state.userInfo.username) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <Spin size="large" />
      </div>
    )
  }

  // 注意 1：底部导航必须是 flex 子项（而非 position: fixed），
  // 否则在 iOS 已安装 PWA 下会停在 Home 指示条之上，无法贴到屏幕最底部。
  // 注意 2：高度链条一律用 height:100%（h-full），不要用 100dvh ——
  // iOS standalone 下 dvh 会少算底部条带（实测比屏幕矮约 62px），
  // 而 height:100% 取初始包含块，等于真实屏幕高度。
  return (
    <div className="h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <Outlet />
      </div>
      {!hideTabBar && <TabBar />}
    </div>
  )
}

export default PrivateRoute