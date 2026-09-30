import React, { useState, useRef, useEffect } from 'react'
import styled, { css, keyframes } from 'styled-components'

// 箭头旋转缓动动画
const rotateArrow = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(180deg); }
`

// 按钮滑入动画（贴边时默认隐藏一部分，hover 完全显示）
const slideIn = keyframes`
  from {
    ${({ position }: { position: 'top' | 'bottom' | 'left' | 'right' }) => {
      switch (position) {
        case 'left':
          return 'transform: translateX(-70%);'
        case 'right':
          return 'transform: translateX(70%);'
        case 'top':
          return 'transform: translateY(-70%);'
        case 'bottom':
          return 'transform: translateY(70%);'
      }
    }}
  }
  to {
    transform: translate(0);
  }
`

// 主按钮样式（支持贴边、圆角、动画）
const StyledEdgeButton = styled.button<{
  position: 'top' | 'bottom' | 'left' | 'right' // 贴边位置
  isLeftDirection: boolean // 箭头初始方向（左/右）
  size?: 'small' | 'medium' | 'large'
  isAnimating: boolean
}>`
  // 基础定位（贴边核心）
  position: fixed;
  z-index: 999; // 确保在阅读器上方
  ${({ position }) => {
    switch (position) {
      case 'left':
        return css`
          left: 0;
          top: 50%;
          transform: translateY(-50%);
        `
      case 'right':
        return css`
          right: 0;
          top: 50%;
          transform: translateY(-50%);
        `
      case 'top':
        return css`
          top: 0;
          left: 50%;
          transform: translateX(-50%);
        `
      case 'bottom':
        return css`
          bottom: 0;
          left: 50%;
          transform: translateX(-50%);
        `
    }
  }}

  // 尺寸配置（带圆润弧度）
  ${({ size }) => {
    switch (size) {
      case 'small':
        return css`
          width: 48px;
          height: 48px;
          border-radius: 0 24px 24px 0;
        ` // 贴边侧无圆角
      case 'large':
        return css`
          width: 64px;
          height: 64px;
          border-radius: 0 32px 32px 0;
        `
      default: // medium
        return css`
          width: 56px;
          height: 56px;
          border-radius: 0 28px 28px 0;
        `
    }
  }}

  // 贴边位置特殊圆角（比如左侧贴边：左边无圆角，右边圆润）
  ${({ position }) => {
    if (position === 'right') {
      return css`
        border-radius: 28px 0 0 28px;
      `
    } else if (position === 'top') {
      return css`
        border-radius: 0 0 28px 28px;
      `
    } else if (position === 'bottom') {
      return css`
        border-radius: 28px 28px 0 0;
      `
    }
  }}

  // 样式美化
  background: rgba(255, 255, 255, 0.9); // 半透明白色背景
  backdrop-filter: blur(8px); // 毛玻璃效果
  border: none;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); // 缓动曲线
  overflow: hidden;

  // 初始隐藏一部分，hover 完全显示
  transform: ${({ position }) => {
    switch (position) {
      case 'left':
        return 'translateX(-70%) translateY(-50%)'
      case 'right':
        return 'translateX(70%) translateY(-50%)'
      case 'top':
        return 'translateX(-50%) translateY(-70%)'
      case 'bottom':
        return 'translateX(-50%) translateY(70%)'
    }
  }};

  &:hover {
    transform: ${({ position }) => {
      switch (position) {
        case 'left':
          return 'translateX(0) translateY(-50%)'
        case 'right':
          return 'translateX(0) translateY(-50%)'
        case 'top':
          return 'translateX(-50%) translateY(0)'
        case 'bottom':
          return 'translateX(-50%) translateY(0)'
      }
    }};
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
    background: rgba(255, 255, 255, 0.95);
  }

  &:active {
    transform: ${({ position }) => {
      switch (position) {
        case 'left':
          return 'translateX(-10%) translateY(-50%)'
        case 'right':
          return 'translateX(10%) translateY(-50%)'
        case 'top':
          return 'translateX(-50%) translateY(10%)'
        case 'bottom':
          return 'translateX(-50%) translateY(-10%)'
      }
    }};
    box-shadow: 0 1px 8px rgba(0, 0, 0, 0.1);
  }

  // 箭头容器
  .arrow-wrapper {
    position: relative;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;

    // 箭头旋转动画
    ${({ isAnimating }) =>
      isAnimating &&
      css`
        animation: ${rotateArrow} 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)
          forwards;
      `}
  }

  // 箭头样式（圆润三角形）
  .arrow {
    width: 0;
    height: 0;
    border-style: solid;
    ${({ isLeftDirection, position, size }) => {
      const arrowSize = size === 'small' ? 8 : size === 'large' ? 12 : 10

      // 左右方向箭头（默认）
      if (
        position === 'left' ||
        position === 'right' ||
        !['top', 'bottom'].includes(position)
      ) {
        return isLeftDirection
          ? css`
              border-width: ${arrowSize}px 0 ${arrowSize}px ${arrowSize * 1.6}px;
              border-color: transparent transparent transparent #333;
            `
          : css`
              border-width: ${arrowSize}px ${arrowSize * 1.6}px ${arrowSize}px 0;
              border-color: transparent #333 transparent transparent;
            `
      }
      // 上下方向箭头（贴边上下时）
      else {
        return isLeftDirection
          ? css`
              border-width: ${arrowSize * 1.6}px ${arrowSize}px 0 ${arrowSize}px;
              border-color: #333 transparent transparent transparent;
            `
          : css`
              border-width: 0 ${arrowSize}px ${arrowSize * 1.6}px ${arrowSize}px;
              border-color: transparent transparent #333 transparent;
            `
      }
    }}
    transition: border-color 0.3s ease;
  }

  &:hover .arrow {
    border-color: ${({ isLeftDirection, position }) => {
      if (
        position === 'left' ||
        position === 'right' ||
        !['top', 'bottom'].includes(position)
      ) {
        return isLeftDirection
          ? 'transparent transparent transparent #1890ff'
          : 'transparent #1890ff transparent transparent'
      } else {
        return isLeftDirection
          ? '#1890ff transparent transparent transparent'
          : 'transparent transparent #1890ff transparent'
      }
    }};
  }
`

// 组件 props 类型定义
interface EdgeArrowButtonProps {
  /** 贴边位置 */
  position: 'top' | 'bottom' | 'left' | 'right'
  /** 初始箭头方向（左/右，上下贴边时自动转为上/下） */
  initialDirection: 'left' | 'right'
  /** 按钮尺寸 */
  size?: 'small' | 'medium' | 'large'
  /** 切换方向时的回调 */
  onDirectionChange?: (direction: 'left' | 'right') => void
  /** 点击按钮时的回调（返回当前方向） */
  onClick?: (direction: 'left' | 'right') => void
  /** 自定义样式 */
  style?: React.CSSProperties
}

const EdgeArrowButton: React.FC<EdgeArrowButtonProps> = ({
  position,
  initialDirection = 'left',
  size = 'medium',
  onDirectionChange,
  onClick,
  style,
}) => {
  const [direction, setDirection] = useState<'left' | 'right'>(initialDirection)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<NodeJS.Timeout | null>(null)

  // 切换方向（带动画）
  const toggleDirection = () => {
    if (isAnimating) return

    setIsAnimating(true)
    const newDirection = direction === 'left' ? 'right' : 'left'
    setDirection(newDirection)
    onDirectionChange?.(newDirection)

    // 动画结束后重置状态
    animationRef.current = setTimeout(() => {
      setIsAnimating(false)
    }, 400)
  }

  // 处理点击事件
  const handleClick = () => {
    onClick?.(direction)
    // 可选：点击时自动切换方向（根据需求决定是否开启）
    // toggleDirection();
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (animationRef.current) clearTimeout(animationRef.current)
    }
  }, [])

  return (
    <StyledEdgeButton
      position={position}
      isLeftDirection={direction === 'left'}
      size={size}
      isAnimating={isAnimating}
      onClick={handleClick}
      onDoubleClick={toggleDirection} // 双击切换方向
      style={style}
      aria-label={`${direction === 'left' ? '向左' : '向右'}切换按钮`}
    >
      <div className="arrow-wrapper">
        <div className="arrow" />
      </div>
    </StyledEdgeButton>
  )
}

export default EdgeArrowButton
