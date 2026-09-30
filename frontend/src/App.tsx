// src/App.tsx
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Spin } from 'antd'
import Reader from './views/BaseReader'
import Login from './views/Login'
import { ConfigProvider } from 'antd'
import { useState, useEffect, Suspense } from 'react'
import PrivateRoute from './router/PrivateRoute'
import routerData, { type RouterData } from './router/index'
import { themes, type ThemeKey } from './theme/themeConfig'
import useStore from './store'

const App = () => {
  const state = useStore()
  const currentTheme = state.themeConfig.theme

  // 加载中占位组件
  const Loading = () => (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Spin size="large" />
    </div>
  )

  return (
    <ConfigProvider
      theme={{
        ...themes[currentTheme],
        cssVar: true,
      }}
    >
      <BrowserRouter>
        <div
          className="h-full w-full"
          style={{
            backgroundColor: 'var(--global-bg-color)',
            transition: 'background-color 0.3s ease',
          }}
        >
          <Suspense fallback={<Loading />}>
            <Routes>
              <Route element={<PrivateRoute />}>
                <Route path="/" element={<Reader />} />
                {routerData.map((item: RouterData) => (
                  <Route
                    path={item.path}
                    key={item.path}
                    element={<item.component />}
                  />
                ))}
              </Route>

              <Route path="/Login" element={<Login />} />
              <Route path="*" element={<div>404 - 页面未找到</div>} />
            </Routes>
          </Suspense>
        </div>
      </BrowserRouter>
    </ConfigProvider>
  )
}

export default App
