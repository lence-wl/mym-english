import { NavLink } from 'react-router-dom'
import {
  RiBookOpenLine,
  RiBookMarkedLine,
  RiChatQuoteLine,
  RiStackLine,
  RiUser3Line,
} from '@remixicon/react'

const tabs = [
  { path: '/reader', name: '阅读', Icon: RiBookOpenLine },
  { path: '/vocabulary', name: '单词', Icon: RiBookMarkedLine },
  { path: '/sentence', name: '句子', Icon: RiChatQuoteLine },
  { path: '/bookshelf', name: '书架', Icon: RiStackLine },
  { path: '/me', name: '我的', Icon: RiUser3Line },
]

/**
 * 底部 Tab 导航。
 *
 * 必须作为 h-dvh flex-col 外壳的 flex 子项（shrink-0），不能使用
 * `position: fixed; bottom: 0`：后者在 iOS 已安装 PWA 下会停在
 * Home 指示条之上，导致导航栏不贴屏幕底部。
 * padding-bottom 用安全区，让背景铺满 Home 指示条区域。
 */
const TabBar = () => (
  <nav
    className="shrink-0 flex border-t"
    style={{
      height: 'calc(var(--tabbar-height) + var(--safe-bottom))',
      paddingBottom: 'var(--safe-bottom)',
      background: 'var(--ant-color-bg-elevated, #fff)',
      borderColor: 'var(--ant-color-border-secondary, #f0f0f0)',
    }}
  >
    {tabs.map(({ path, name, Icon }) => (
      <NavLink
        key={path}
        to={path}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 no-select"
      >
        {({ isActive }) => (
          <>
            <Icon size={22} color={isActive ? 'var(--ant-color-primary)' : '#9aa0a6'} />
            <span
              className="text-[11px] leading-[1.2]"
              style={{ color: isActive ? 'var(--ant-color-primary)' : '#9aa0a6' }}
            >
              {name}
            </span>
          </>
        )}
      </NavLink>
    ))}
  </nav>
)

export default TabBar