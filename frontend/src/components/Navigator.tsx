import styled, { css, keyframes } from 'styled-components'
import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import routerData from '../router/index'
import { theme, type GlobalToken } from 'antd'
import { isGuest, promptGuestLogin } from '../utils/guest'

const Navigator = () => {
  // 获取当前主题 token
  const { token } = theme.useToken()
  const [isOpen, setIsOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const guest = isGuest()

  // 游客仅可直接进入公开阅读相关路由，其余入口提示登录（避免挂载受限页面触发 401）
  const GUEST_ALLOWED = ['/', '/bookshelf']

  const toggleOpen = () => {
    setIsOpen((prev) => !prev)
  }

  return (
    <Style themeToken={token}>
      <div className="btn_left_icon">
        <img
          style={{ zIndex: 10000, position: 'relative' }}
          onClick={toggleOpen}
          src={isOpen ? '/images/arr_right.png' : '/images/arr_left.png'}
          alt={isOpen ? '收起菜单' : '展开菜单'}
        />

        {isOpen && (
          <div className="panel">
            {routerData.map((item) => {
              if (item.notMenu) return null
              const isActive = location.pathname === item.path
              return (
                <Link
                  className={`panel-row truncate title ${
                    isActive ? 'active' : ''
                  }`}
                  key={item.path}
                  to={item.path}
                  onClick={(e) => {
                    if (guest && !GUEST_ALLOWED.includes(item.path)) {
                      e.preventDefault()
                      promptGuestLogin(() => navigate('/login'))
                      return
                    }
                    toggleOpen()
                  }}
                >
                  {item.name}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </Style>
  )
}

export default Navigator

// 面板展开/收起动画
const slideIn = keyframes`
  from { transform: translateY(-50%) translateX(-20px); opacity: 0; }
  to { transform: translateY(-50%) translateX(0); opacity: 1; }
`

const slideOut = keyframes`
  from { transform: translateY(-50%) translateX(0); opacity: 1; }
  to { transform: translateY(-50%) translateX(-20px); opacity: 0; }
`

// 使用 shouldForwardProp 过滤 themeToken，避免透传到DOM
const Style = styled.div.withConfig({
  shouldForwardProp: (prop) => prop !== 'themeToken',
})<{
  themeToken: GlobalToken
}>`
  .btn_left_icon {
    position: fixed;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    z-index: 100;

    img {
      height: 3vw;
      cursor: pointer;
      transition: all 0.3s ease;
      opacity: 0.5;
      &:hover {
        transform: scale(1.1);
        opacity: 1;
      }
    }
  }

  .panel {
    overflow: hidden;
    position: absolute;
    left: 140%;
    top: 50%;
    background: ${({ themeToken }) => themeToken.colorBgBase};
    box-sizing: border-box;
    padding-top: 5px;
    display: inline-block;
    border-radius: ${({ themeToken }) => themeToken.borderRadius}px;
    box-shadow: ${({ themeToken }) => themeToken.boxShadowSecondary};
    animation: ${slideIn} 0.3s forwards;
    pointer-events: auto;

    /* 优化动画效果 */
    transform-origin: left center;
  }

  .panel-row {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    border-bottom: 1px solid
      ${({ themeToken }) => themeToken.colorBorderSecondary};
    height: 40px;
    padding: 0 30px;
    color: ${({ themeToken }) => themeToken.colorText};
    text-decoration: none;
    transition: all 0.2s ease;

    &:last-child {
      border-bottom: none;
    }

    &:hover {
      background: ${({ themeToken }) => themeToken.colorPrimaryBgHover};
    }
  }

  .panel-row.active {
    background: ${({ themeToken }) => themeToken.colorPrimaryBg};
    color: ${({ themeToken }) => themeToken.colorPrimary};
    font-weight: bold;
  }

  .title {
    font-family: 'Source Han Sans CN', sans-serif;
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0px;
    vertical-align: middle;
  }

  /* 优化收起时的动画处理 */
  .btn_left_icon:not(:has(img[src$='arr_right.png'])) .panel {
    animation: ${slideOut} 0.3s forwards;
    pointer-events: none;
  }
`
