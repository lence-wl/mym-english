import { useState, useEffect } from 'react'
import { Select, Space } from 'antd'
import { themes, themeOptions, type ThemeKey } from '../theme/themeConfig'
import useStore from '../store'

const ThemeSwitcher = () => {
  const state = useStore()
  const theme = state.themeConfig.theme
  // 同步全局背景色
  useEffect(() => {
    const root = document.documentElement
    const bgColor = themes[theme].token?.colorBgContainer
    if (bgColor && root) {
      root.style.setProperty('--global-bg-color', bgColor)
    }
  }, [theme])

  return (
    <div style={{ padding: '10px 0' }}>
      <Select
        value={theme}
        onChange={(newValue) => {
          localStorage.setItem('theme', newValue)
          state.updateThemeConfig({ theme: newValue })
        }}
        size="small"
        style={{ width: 200 }}
      >
        {themeOptions.map((option) => (
          <Select.Option key={option.key} value={option.key}>
            <Space size="small">
              {option.icon}
              <span>{option.label}</span>
            </Space>
          </Select.Option>
        ))}
      </Select>
    </div>
  )
}

export default ThemeSwitcher
