import React, { useEffect, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import useStore from '../store'
import ShowTranslation from './ShowTranslation'
import chroma from 'chroma-js'
import { readingColorConfig } from '../theme/themeConfig'
interface CommonLayerProps {
  selectedText: string
  /** 用于确定层的位置和大小的DOMRect对象 */
  rect: DOMRect
  /** 层的挂载点DOM元素 */
  container: HTMLElement
  /** 额外的样式 */
  style?: React.CSSProperties
  /** 层的z-index值，默认1000 */
  zIndex?: number
  /** 动画持续时间(ms)，默认300 */
  animationDuration?: number
}

const CommonLayer: React.FC<CommonLayerProps> = ({
  rect,
  container,
  selectedText,
  style = {},
  zIndex = 1000,
  animationDuration = 300,
}) => {
  const layerRef = useRef<HTMLDivElement>(null)
  const [isAnimating, setIsAnimating] = useState(false)
  const { userInfo, themeConfig } = useStore()
  const [answer, setAnswer] = useState('')
  const answerRef = useRef('')

  // 处理可见性变化，触发动画
  useEffect(() => {
    if (selectedText) {
      // 先重置状态再触发动画
      setIsAnimating(false)
      // 强制重绘后再启动动画
      const timer = setTimeout(() => setIsAnimating(true), 0)
      return () => clearTimeout(timer)
    } else {
      setIsAnimating(false)
    }
  }, [selectedText])

  // 根据DOMRect更新层的位置和大小
  useEffect(() => {
    if (!layerRef.current) return
    const contaimerRect = container.getClientRects()[0]
    

    const { left, top, height } = rect
    // 设置基础定位样式
    Object.assign(layerRef.current.style, {
      position: 'absolute',
      left: (contaimerRect.width-150 > left ) ? `${left}px`:`${left - 200}px`,
      top: `${top - height}px`,
      // width: `${width}px`,
      // height: `${height}px`,
      zIndex: zIndex.toString(),
    })
  }, [rect, zIndex])

  // 翻转动画样式
  const flipStyle: React.CSSProperties = {
    // 透视效果，增强3D感
    perspective: '1000px',
    // 动画持续时间
    transition: `transform ${animationDuration}ms ease-in-out`,
    // 初始状态：Y轴旋转90度（不可见）
    transform: isAnimating ? 'rotateY(0deg)' : 'rotateY(90deg)',
    // 保持3D变换效果
    transformStyle: 'preserve-3d',
    // 背面不可见
    backfaceVisibility: 'hidden',
    // 确保动画流畅
    willChange: 'transform',
  }

  // 创建层内容
  const layerContent = (
    <div
      ref={layerRef}
      style={{
        ...style,
        ...flipStyle,
        fontSize: themeConfig.fontSize * 0.6 + 'px',
        background: 'rgba(0, 0, 0, 0)',
        color: '#000',
        minWidth: '200px',
        minHeight: '100px',
        maxWidth:
          selectedText.split(' ').length === 1
            ? ((themeConfig.fontSize * 0.7) / 12) * 200 + 'px'
            : '70vw',
        maxHeight: '400px',
        overflowY: 'auto',
        display: selectedText ? 'block' : 'none',
        width: 'auto !important',
        borderRadius: '10px',
        border: `1px solid ${readingColorConfig[themeConfig.theme].colorText}`,
        // transform: 'translateY(-100%)',
      }}
    >
      <ShowTranslation text={selectedText}></ShowTranslation>
    </div>
  )

  // 渲染到指定的挂载点
  return container ? ReactDOM.createPortal(layerContent, container) : null
}

export default CommonLayer
