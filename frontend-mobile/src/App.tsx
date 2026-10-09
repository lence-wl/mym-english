import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, Spin } from 'antd'
import { useState, useEffect, Suspense, lazy } from 'react'
import useStore from './store'
import { themes } from './theme/themeConfig'
import PrivateRoute from './router/PrivateRoute'

const Login = lazy(() => import('./pages/Login'))
const Reader = lazy(() => import('./pages/Reader'))
const Bookshelf = lazy(() => import('./pages/Bookshelf'))
const Vocabulary = lazy(() => import('./pages/Vocabulary'))
const Sentence = lazy(() => import('./pages/Sentence'))
const Me = lazy(() => import('./pages/Me'))
const AddBook = lazy(() => import('./pages/AddBook'))

const Loading = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Spin size="large" />
  </div>
)

const App = () => {
  const state = useStore()
  const currentTheme = state.themeConfig.theme

  // 同步全局背景色到 CSS 变量
  useEffect(() => {
    const bg = themes[currentTheme]?.token?.colorBgContainer
    if (bg) document.documentElement.style.setProperty('--global-bg-color', bg)
  }, [currentTheme])

  return (
    <ConfigProvider theme={{ ...themes[currentTheme], cssVar: true }}>
      <BrowserRouter basename="/m">
        {/* 外壳用 fixed inset-0 铺满视口：
            iOS 已安装 PWA 下文档需要保持可滚动（见 index.html 的 letterbox 解锁），
            固定外壳可保证文档滚动不会带动界面，同时让内部 height:100% 链条有确定高度。 */}
        <div
          className="fixed inset-0"
          style={{
            backgroundColor: 'var(--global-bg-color)',
            transition: 'background-color 0.3s ease',
          }}
        >
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<PrivateRoute />}>
                <Route index element={<Navigate to="/reader" replace />} />
                <Route path="reader" element={<Reader />} />
                <Route path="bookshelf" element={<Bookshelf />} />
                <Route path="vocabulary" element={<Vocabulary />} />
                <Route path="sentence" element={<Sentence />} />
                <Route path="me" element={<Me />} />
                <Route path="addBook" element={<AddBook />} />
              </Route>
              <Route path="*" element={<Navigate to="/reader" replace />} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App