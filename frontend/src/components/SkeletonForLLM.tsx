import React from 'react'
import type { CSSProperties } from 'styled-components'
import chroma from 'chroma-js'
import { readingColorConfig } from '../theme/themeConfig'
import useStore from '../store'
const SkeletonForLLm = ({ isWord }: any) => {
  const { themeConfig } = useStore()
  // 骨架屏基础样式
  const skeletonContainer = {
    borderRadius: '4px',
  }

  // 句子骨架样式
  const sentenceSkeleton = {
    height: '20px',
    width: '100%',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
    marginBottom: '16px',
  }

  // 翻译项容器样式
  const translationsContainer = {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  }

  // 单个翻译项骨架样式
  const translationItem = {
    height: '20px',
    width: '55%',
    borderRadius: '4px',
    position: 'relative',
    overflow: 'hidden',
  }

  // 动画渐变样式
  const animationOverlay = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: `linear-gradient(90deg, ${chroma(
      readingColorConfig[themeConfig.theme].colorBgContainer
    ).darken()} 0%, ${chroma(
      readingColorConfig[themeConfig.theme].colorBgContainer
    ).brighten()} 50%, ${chroma(
      readingColorConfig[themeConfig.theme].colorBgContainer
    ).darken()} 100%)`,
    backgroundSize: '200% 100%',
    animation: 'skeleton-loading 2s infinite',
  }

  return (
    <>
      {/* 动画关键帧定义 */}
      <style>{`
        @keyframes skeleton-loading {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
      `}</style>

      {/* 骨架屏主体 */}
      <div style={skeletonContainer}>
        {/* 句子骨架屏 */}
        <div style={sentenceSkeleton as CSSProperties}>
          <div style={animationOverlay as CSSProperties} />
        </div>
        {/* 翻译项骨架屏容器 */}
        <div style={translationsContainer as CSSProperties}>
          {(isWord ? [1] : [1, 2, 3]).map((i) => (
            <div key={i} style={translationItem as CSSProperties}>
              <div style={animationOverlay as CSSProperties} />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

export default SkeletonForLLm
