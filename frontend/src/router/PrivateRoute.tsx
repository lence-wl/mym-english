import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import Navigator from '../components/Navigator'
import { me } from '../api/user'
import { getBooksDetailByIds } from '../api/book'
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
      // 获取当前用户相关的书籍：在读 已读完
      const ids = [
        data.currentBookId,
        ...data.completeBookIds.split(','),
      ].filter((id) => id)
      if (ids.length) {
        getBooksDetailByIds(ids).then((res) => {
          state.updateUserInfo({
            books: res.data.map((item: any) => {
              return { id: item.id, title: item.title }
            }),
          })
        })
      } else {
        navigate('/bookshelf', { replace: true })
      }
    } catch (err: any) {
      localStorage.removeItem('token')
      setLoading(false)
      navigate('/login', { replace: true })
    }
  }

  useEffect(() => {
    if (location.pathname === '/login') {
      if (state.userInfo.username) {
        navigate('/', { replace: true })
      } else {
        if (token) {
          getCurrentUserInfo()
        } else {
          navigate('/login', { replace: true })
        }
      }
    } else {
      // 其他路由
      if (token) {
        if (!state.userInfo.username) {
          getCurrentUserInfo()
        }
      } else {
        navigate('/login', { replace: true })
      }
    }
  }, [location.pathname])

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
