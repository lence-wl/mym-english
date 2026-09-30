import { useEffect, useState } from 'react'
import {
  RiVolumeUpFill,
  RiStarFill,
  RiStarLine,
  RiLoader2Line,
} from '@remixicon/react'
import { addWord, deleteWordByText } from '../api/word'
import { getTTS } from '../api/llm'
import useStore from '../store'
import { useTtsWithWordHighlight } from '../hooks/useTTSPlay'
import { readingColorConfig } from '../theme/themeConfig'

const ActionIcons = ({
  text,
  data,
  translation,
  favorite,
  themeConfig,
}: any) => {
  const [isFavorite, setIsFavorite] = useState(favorite || false)
  const [volumeClicked, setVolumeClicked] = useState(false)
  const [starClicked, setStarClicked] = useState(false)
  const state = useStore()
  const {
    loading,
    setParams,
    error,
    audioUrl,
    audioDuration,
    handleSubmit,
    handleDownload,
    handleReset,
    handleAudioPlay,
    handleAudioPause,
    handleAudioTimeUpdate,
    RenderHighlightedText,
    highlightedWordIndex,
    wordTimestampsRef,
  } = useTtsWithWordHighlight({ autoPlay: true })

  // 文本朗读功能
  const speakText = async (text: string) => {
    // 是句子
    if (translation?.t) {
      handleSubmit({ text })
    } else {
      window.speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      window.speechSynthesis.speak(utterance)
    }
  }

  const handleVolumeClick = () => {
    setVolumeClicked(true)
    setTimeout(() => setVolumeClicked(false), 300)
    speakText(text)
  }

  const handleStarClick = async () => {
    setStarClicked(true)
    setTimeout(() => setStarClicked(false), 300)
    if (isFavorite) {
      // 删除单词
      await deleteWordByText(text)
      setIsFavorite(false)
    } else {
      // 添加单词
      await addWord({
        word: text,
        phonetic: data.p || '',
        definition: data.t || data.d,
        bookId: state.userInfo.currentBookId,
        isSentence: Boolean(translation?.t),
        phrases: JSON.stringify(translation?.l || []), // 如果是句子，常用短语搭配也保存
      })
      setIsFavorite(true)
    }
  }

  // 关闭时停止语音播放
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel()
    }
  }, [])

  // 内联样式定义
  const styles = {
    container: {
      display: 'flex',
      gap: '0.5rem', // 对应 gap-2
      justifyContent: 'flex-end',
    },
    // 基础图标样式（通用过渡动画）
    iconBase: {
      cursor: 'pointer',
      transitionProperty: 'all',
      transitionDuration: '300ms',
      transitionTimingFunction: 'ease-out',
    },
    // 音量图标样式
    volumeIcon: {
      ...{
        // hover 变深灰
        ':hover': {
          color: '#111827', // gray-900
        },
      },
      // 点击状态：缩放+蓝色
      ...(volumeClicked
        ? { transform: 'scale(0.9)', color: '#3b82f6' } // scale-90 + text-blue-500
        : { color: '#374151' }), // text-gray-700
    },
    // 已收藏星星样式
    starFillIcon: {
      ...{
        // hover 加深黄色
        ':hover': {
          color: '#eab308', // text-yellow-500
        },
      },
      // 点击状态：缩放+旋转
      ...(starClicked
        ? { transform: 'scale(1.1) rotate(12deg)', color: '#eab308' } // scale-110 + rotate-12 + 黄色
        : { color: '#eab308' }), // 已收藏默认黄色
    },
    // 未收藏星星样式
    starLineIcon: {
      ...{
        // hover 变浅黄
        ':hover': {
          color: '#facc15', // text-yellow-400
        },
      },
      // 点击状态：缩放+旋转
      ...(starClicked
        ? { transform: 'scale(1.1) rotate(12deg)', color: '#facc15' } // scale-110 + rotate-12 + 浅黄
        : { color: '#374151' }), // text-gray-700
    },
  }

  useEffect(() => {
    setParams({ text: text })
  }, [])

  return (
    <div>
      <div
        style={{
          fontSize: themeConfig.fontSize * 0.7 + 'px',
          display: 'flex',
          fontWeight: '800',
          marginBottom: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        {wordTimestampsRef.current?.length ? (
          wordTimestampsRef.current?.map(({ word }, index) => (
            <span
              key={index}
              style={{
                padding: '0 3px',
                position: 'relative',
                color:
                  highlightedWordIndex === index
                    ? '#0f0'
                    : readingColorConfig[themeConfig.theme].colorText,
                transition: 'background-color 0.1s ease',
                borderRadius: '2px',
              }}
            >
              {word}
            </span>
          ))
        ) : (
          <span>{text}</span>
        )}
      </div>
      <div style={styles.container}>
        {/* 音量图标 */}
        {}
        {loading ? (
          <RiLoader2Line
            style={{ ...styles.iconBase, ...styles.volumeIcon }}
            size={22}
          />
        ) : (
          <RiVolumeUpFill
            style={{ ...styles.iconBase, ...styles.volumeIcon }}
            size={22}
            onClick={handleVolumeClick}
          />
        )}

        {/* 收藏图标 */}
        {isFavorite ? (
          <RiStarFill
            style={{ ...styles.iconBase, ...styles.starFillIcon }}
            size={21}
            onClick={handleStarClick}
          />
        ) : (
          <RiStarLine
            style={{ ...styles.iconBase, ...styles.starLineIcon }}
            size={21}
            onClick={handleStarClick}
          />
        )}
      </div>
    </div>
  )
}

export default ActionIcons
