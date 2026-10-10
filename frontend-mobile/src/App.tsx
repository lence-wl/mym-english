import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ConfigProvider, Spin, theme } from 'antd'
import { useState, useEffect, Suspense, lazy } from 'react'
import useStore from './store'
import { themes } from './theme/themeConfig'
import PrivateRoute from './router/PrivateRoute'

const Login = lazy(() => import('./pages/Login'))
const Reader = lazy(() => import('./pages/Reader'))
const Bookshelf = lazy(() => import('./pages/Bookshelf'))
const Vocabulary = lazy(() => import('./pages/Vocabulary'))
const VocabularyPlay = lazy(() => import('./pages/VocabularyPlay'))
const Sentence = lazy(() => import('./pages/Sentence'))
const Me = lazy(() => import('./pages/Me'))
const AddBook = lazy(() => import('./pages/AddBook'))

const Loading = () => (
  <div className="h-full w-full flex items-center justify-center">
    <Spin size="large" />
  </div>
)

/**
 * 把 antd 解析后的 token 发布成全局 CSS 变量。
 *
 * antd 开启 cssVar 后，--ant-* 变量只声明在各个 antd 组件自己的节点上（不在 :root），
 * 我们自己的元素读不到它们，会静默走 var() 的兜底值——表现就是暮夜黑下卡片仍是白底、
 * 继承来的正文仍是 #374151 的深灰。这里统一从 useToken() 取值挂到 :root，
 * 自定义元素一律用 var(--global-*)，不依赖 antd 变量的作用域与命名。
 */
const ThemeVars = () => {
  const { token } = theme.useToken()

  useEffect(() => {
    const root = document.documentElement.style
    root.setProperty('--global-bg-color', token.colorBgContainer)
    root.setProperty('--global-bg-elevated', token.colorBgElevated)
    root.setProperty('--global-text-color', token.colorText)
    root.setProperty('--global-text-secondary', token.colorTextSecondary)
    root.setProperty('--global-primary', token.colorPrimary)
    root.setProperty('--global-primary-bg', token.colorPrimaryBg)
    root.setProperty('--global-border-secondary', token.colorBorderSecondary)

    // Android PWA 的状态栏取 theme-color，固定绿色在暮夜黑下会割裂
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', token.colorBgContainer)
  }, [token])

  return null
}

const App = () => {
  const currentTheme = useStore((s) => s.themeConfig.theme)

  return (
    <ConfigProvider theme={{ ...themes[currentTheme], cssVar: true }}>
      <ThemeVars />
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
                <Route path="vocabulary/play" element={<VocabularyPlay />} />
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