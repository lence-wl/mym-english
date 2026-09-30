import React from 'react'
import { Card, Typography, Space, Tag, List } from 'antd'
import { AudioOutlined, StarOutlined, StarFilled } from '@ant-design/icons'
import 'antd/dist/reset.css'

const { Text, Title } = Typography

// 扩展单词卡片数据类型，增加单词类型和词组搭配
export interface VocabularyCardProps {
  word: string // 单词
  phonetic: string // 音标
  definition: string // 释义
  partOfSpeech?: string // 单词类型（如n. v. adj.等）
  phrases?: string | null // 词组搭配JSON字符串（可选，可能为null）
  onPlay?: (word: string) => void // 发音回调（可选）
  isFavorite?: boolean // 是否收藏（可选）
  onToggleFavorite?: () => void // 切换收藏状态（可选）
}

// 定义词组搭配数据结构
interface PhraseItem {
  w: string // 词组
  d: string // 释义
}

export const VocabularyCard: React.FC<VocabularyCardProps> = ({
  word,
  phonetic,
  definition,
  partOfSpeech,
  phrases,
  onPlay,
  isFavorite = false,
  onToggleFavorite,
}) => {
  // 解析词组搭配数据
  const parsePhrases = (phrasesStr?: string | null): PhraseItem[] => {
    if (!phrasesStr) return []
    try {
      const parsed = JSON.parse(phrasesStr)
      return Array.isArray(parsed) ? parsed : []
    } catch (error) {
      console.error('Failed to parse phrases:', error)
      return []
    }
  }

  const phraseList = parsePhrases(phrases)

  return (
    <Card
      hoverable
      style={{
        height: '100%',
        width: '100%',
        border: 'none',
        borderRadius: 12,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.3s ease',
        overflow: 'hidden',
      }}
      styles={{
        body: {
          padding: '20px 24px',
          marginTop: 0,
        },
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow =
          '0 8px 24px rgba(0, 0, 0, 0.1)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLElement).style.boxShadow =
          '0 4px 12px rgba(0, 0, 0, 0.05)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      {/* 单词头部区域 */}
      <Space
        direction="horizontal"
        size="middle"
        style={{
          width: '100%',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
        }}
      >
        <Space direction="horizontal" align="center">
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            {word}
          </Title>
          {partOfSpeech && (
            <Tag color="blue" style={{ fontSize: 12 }}>
              {partOfSpeech}
            </Tag>
          )}
        </Space>

        <Space size="small">
          {/* 发音按钮 */}
          {onPlay && (
            <AudioOutlined
              style={{
                color: '#1890ff',
                cursor: 'pointer',
                fontSize: 18,
                transition: 'color 0.2s',
              }}
              onClick={() => onPlay(word)}
              onMouseOver={(e) =>
                ((e.currentTarget as HTMLElement).style.color = '#096dd9')
              }
              onMouseOut={(e) =>
                ((e.currentTarget as HTMLElement).style.color = '#1890ff')
              }
            />
          )}

          {/* 收藏按钮 */}
          {onToggleFavorite && (
            <>
              {isFavorite ? (
                <StarFilled
                  style={{ color: '#faad14', cursor: 'pointer', fontSize: 18 }}
                  onClick={onToggleFavorite}
                />
              ) : (
                <StarOutlined
                  style={{
                    color: '#aaa',
                    cursor: 'pointer',
                    fontSize: 18,
                    transition: 'color 0.2s',
                  }}
                  onClick={onToggleFavorite}
                  onMouseOver={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#faad14')
                  }
                  onMouseOut={(e) =>
                    ((e.currentTarget as HTMLElement).style.color = '#aaa')
                  }
                />
              )}
            </>
          )}
        </Space>
      </Space>

      {/* 音标区域 */}
      <Text
        style={{
          color: '#666',
          fontSize: 14,
          fontStyle: 'italic',
          display: 'inline-block',
          margin: '8px 0 16px 0',
        }}
      >
        {phonetic}
      </Text>

      {/* 释义区域 */}
      <div style={{ lineHeight: 1.6, fontSize: 15 }}>
        {definition.split('\n').map((paragraph, idx) => (
          <p key={idx} style={{ margin: '8px 0' }}>
            {paragraph}
          </p>
        ))}
      </div>

      {phraseList.length > 0 && (
        <div
          style={{
            paddingTop: 6,
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px 12px', // 水平间距12px，垂直间距8px
              rowGap: 8,
            }}
          >
            {phraseList.map((item, index) => (
              <Tag
                key={index}
                style={{
                  padding: '6px 12px',
                  fontSize: 14,
                  lineHeight: '1.4',
                  whiteSpace: 'nowrap', // 防止词组内换行
                  cursor: 'default',
                }}
              >
                <div className="flex flex-col gap-1">
                  <span style={{ fontWeight: 600, marginRight: 6 }}>
                    {item.w}
                  </span>
                  <span style={{ fontSize: 13 }}>{item.d}</span>
                </div>
              </Tag>
            ))}
          </div>
        </div>
      )}
    </Card>
  )
}

export default VocabularyCard
