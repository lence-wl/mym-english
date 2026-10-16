import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navigator from '../components/Navigator'
import { me } from '../api/user'
import { fetchBooksByIds, userBookIds } from '../utils/userBooks'
import { useEffect, useState } from 'react'
import useStore from '../store'

const PrivateRoute = () => {
  const location = useLocation()
  const state = useStore()
  const navigate = useNavigate()
  const token = !!localStorage.getItem('token')
  const [loading, setLoading] = useState(false)
  const getCurrentUserInfo = async () => {
    try {
      setLoading(true)
      const { data } = await me()
      state.setUserInfo(data)
      setLoading(false)
      // 获取当前用户相关的书籍：在读（myBookData，可多本同时在读） + 已读完
      const ids = userBookIds(data)
      if (ids.length) {
        const books = await fetchBooksByIds(ids)
        state.updateUserInfo({ books })
      } else {
        navigate('/bookshelf', { replace: true })
      }
    } catch (err: any) {
      localStorage.removeItem('token')
      setLoading(false)
      navigate('/login', { replace: true })
    }
  }

  // 游客（未登录）仅放行公开阅读相关路由：阅读页 `/` 与书架 `/bookshelf`
  const GUEST_ALLOWED = ['/', '/bookshelf']
  const guestAllowed = GUEST_ALLOWED.includes(location.pathname)

  useEffect(() => {
    if (location.pathname === '/login') {
      if (state.userInfo.username) {
        navigate('/', { replace: true })
      } else if (token) {
        getCurrentUserInfo()
      }
      // 游客主动来到登录页：留在原页正常登录
      return
    }

    if (token) {
      if (!state.userInfo.username) {
        getCurrentUserInfo()
      }
      return
    }

    // 游客分支：不调用 me()，仅放行公开阅读路由；其余跳登录页
    if (!guestAllowed) {
      navigate('/login', { replace: true })
      return
    }
    // 游客直接访问阅读页但尚未选书 → 去公开书架挑一本
    if (location.pathname === '/' && !state.userInfo.currentBookId) {
      navigate('/bookshelf', { replace: true })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, token, state.userInfo.currentBookId])

  return loading ? (
    'loading'
  ) : (
    <>
      {location.pathname !== '/login' && <Navigator />}
      <Outlet />
    </>
  )
}

export default PrivateRoute
