import { getWordDataFormLLM, grammarAnalyze } from '../api/llm'
import { useEffect, useState, useRef } from 'react'
import Sentence from '../components/Sentence'
import Word from '../components/Word'
import ActionIcons from './ActionIcons'
import { getWordByText } from '../api/word'
import chroma from 'chroma-js'
import { readingColorConfig } from '../theme/themeConfig'
import useStore from '../store'

const ShowTranslation = ({ text }: { text: string }) => {
  const [translation, setTranslation] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [favorite, setIsFavorite] = useState(false)
  const { userInfo, themeConfig } = useStore()
  const [showText, setShowText] = useState(true)

  const handleAnalyze = async () => {
    if (!text.trim()) return
    setLoading(true)
    setTranslation('')
    // 非流式输出
    try {
      let data
      const JSONRef = (await getWordDataFormLLM(text)) as any
      try {
        data = JSON.parse(JSONRef.data)
        setTranslation(data)
        setLoading(false)
        if (data?.t) {
          setShowText(false)
        }
      } catch (err) {
        console.error(err)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }
  /* 流式输出示例 */
  // useEffect(() => {
  //   grammarAnalyze('hello', (data:any) => {
  //     console.log(data)
  //   }, () => {
  //     console.log('complete')
  //   }, (error:any) => {
  //     console.log(error)
  //   })
  // },[])

  // 检查是否在单词库中
  useEffect(() => {
    if (text.trim()) {
      getWordByText(text).then((res) => {
        if (res.data) {
          setIsFavorite(true)
          const data = res.data[0]
          if (data) {
            setIsFavorite(true)
            // 判断是单词还是句子
            if (data.isSentence && data.phrases) {
              setTranslation({
                t: data.definition,
                l: JSON.parse(data.phrases),
              })
              setShowText(false)
            } else {
              setTranslation({ p: data.phonetic, d: data.definition })
            }
            setLoading(false)
          }
        } else {
          setIsFavorite(false)
          handleAnalyze()
        }
      })
    }
  }, [text])

  // 拆分单词数组并去空（处理多空格情况）
  const wordList = text.split(' ').filter((word) => word.trim())

  // 内联样式定义
  const styles = {
    container: {
      width: '100%',
    },
    textHeader: {
      fontWeight: 800, // 对应 font-extrabold
      marginBottom: '0.5rem', // 对应 mb-2
    },
    flexRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    actionContainer: {
      display: 'flex',
      gap: '0.5rem', // 对应 gap-2
      justifyContent: 'flex-end',
    },
    translationContent: {
      marginTop: '0.5rem',
    },
  }

  return (
    <div
      style={{
        ...styles.container,
        padding: '10px',
        boxSizing: 'border-box',
        userSelect: 'none',
        backdropFilter: 'blur(6px)',
        color: readingColorConfig[themeConfig.theme].colorText,

        backgroundColor: chroma(
          readingColorConfig[themeConfig.theme].colorBgContainer,
        )
          .alpha(0.3)
          .css('rgb'),
      }}
    >
      {showText ? (
        <div style={styles.textHeader}>
          <div style={styles.flexRow}>
            {
              <span style={{ fontSize: themeConfig.fontSize * 0.7 + 'px' }}>
                {text}
              </span>
            }
            {/* 单词数 === 1 且未加载时显示操作按钮 */}
            {!loading && !translation?.t ? (
              <div style={styles.actionContainer}>
                <ActionIcons
                  themeConfig={themeConfig}
                  favorite={favorite}
                  translation={translation}
                  data={translation}
                  text={text}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* 单词数 >=3 且未加载时显示操作按钮 */}
      {!loading && translation?.t ? (
        <div style={styles.actionContainer}>
          <ActionIcons
            themeConfig={themeConfig}
            setShowText={setShowText}
            favorite={favorite}
            translation={translation}
            data={translation}
            text={text}
          />
        </div>
      ) : null}

      <div style={styles.translationContent}>
        {/* 根据单词数选择展示组件 */}
        {wordList.length > 1 && translation.l ? (
          <Sentence
            themeConfig={themeConfig}
            loading={loading}
            data={translation}
          />
        ) : (
          <Word
            themeConfig={themeConfig}
            loading={loading}
            data={translation}
          />
        )}
      </div>
    </div>
  )
}

export default ShowTranslation
