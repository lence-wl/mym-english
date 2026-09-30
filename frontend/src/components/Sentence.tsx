import { Skeleton } from 'antd'
import React from 'react'
import SkeletonForLLM from '../components/SkeletonForLLM'
import { type State } from '../store'
interface SentenceData {
  t: string
  l: Array<{
    w: string
    d: string
  }>
}

interface SentenceProps {
  data?: SentenceData
  loading?: boolean
  themeConfig: State['themeConfig']
}

const Sentence: React.FC<SentenceProps> = ({
  data = { t: '', l: [] },
  loading = true,
}) => {
  const styles = {
    sentenceTitle: {
      fontWeight: 500,
      margin: '0.25rem 0',
      padding: '0.25rem 0',
    },
    translationsList: {
      marginBottom: '0.75rem',
    },
    translationItem: {
      transition: 'background-color 0.2s ease',
    },
    wordLine: {
      display: 'flex',
      alignItems: 'center',
      fontWeight: 600,
    },
    indexSpan: {
      marginRight: '0.25rem',
      width: '1.25rem',
      display: 'inline-block',
    },
    definitionLine: {
      marginLeft: '2rem',
      marginTop: '0.25rem',
    },
  }

  // 实际内容组件（使用内联样式）
  const renderContent = () => (
    <div>
      {/* 句子翻译标题 */}
      <div style={styles.sentenceTitle}>{data.t}</div>
      {/* 翻译列表 */}
      <div style={styles.translationsList}>
        {data.l.map((item, index) => (
          <div
            key={index}
            style={styles.translationItem}
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = 'transparent')
            }
          >
            {/* 单词行 */}
            <div style={styles.wordLine}>
              <span style={styles.indexSpan}>{index + 1}.</span>
              <span>{item.w}</span>
            </div>
            {/* 释义行 */}
            <div style={styles.definitionLine}>{item.d}</div>
          </div>
        ))}
      </div>
    </div>
  )

  // 修复：自定义脉冲动画（正确的 EffectCallback 格式）
  React.useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])

  return (
    <div>
      {loading ? (
        <SkeletonForLLM isWord={false}></SkeletonForLLM>
      ) : (
        renderContent()
      )}
    </div>
  )
}

export default Sentence
