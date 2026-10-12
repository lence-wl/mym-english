import PageWrapper from '../components/PageWrapper'
import React, { useEffect, useRef } from 'react'
import { Card, Col, Row, Button, Statistic } from 'antd'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { getBooksDetailByIds } from '../api/book'
import { me } from '../api/user'
import useStore from '../store'
import { useNavigate } from 'react-router-dom'
// 导入 ECharts 核心和词云组件
import * as echarts from 'echarts'
import 'echarts-wordcloud'

export default () => {
  const { userInfo } = useStore()
  const books = [...(userInfo.completedBooks || [])]
  const chartRef = useRef<HTMLDivElement>(null) // 图表容器引用
  let myChart: echarts.ECharts | null = null
  const navigate = useNavigate()

  // 进入页面时刷新用户信息：生词/句子统计会随阅读与收藏变化，避免显示旧数据
  useEffect(() => {
    let alive = true
    me()
      .then(({ data }) => {
        if (alive) useStore.getState().updateUserInfo(data)
      })
      .catch(() => {
        /* 刷新失败时沿用现有数据，不阻塞页面 */
      })
    return () => {
      alive = false
    }
  }, [])

  // 生成随机颜色（RGB格式）
  const getRandomColor = () => {
    const r = Math.floor(Math.random() * 255)
    const g = Math.floor(Math.random() * 255)
    const b = Math.floor(Math.random() * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  // 准备词云数据（从已读书籍中提取书名，随机生成权重）
  const getWordCloudData = () => {
    return books.map((book) => ({
      name: book.title || `书籍${book.id}`,
      value: Math.floor(Math.random() * 80) + 20,
    }))
  }

  // 初始化词云图
  const initWordCloud = () => {
    if (!chartRef.current) return

    // 销毁已有图表（避免重复渲染）
    if (myChart) {
      myChart.dispose()
    }

    // 初始化图表
    myChart = echarts.init(chartRef.current)

    // 配置项（只保留横平竖直，颜色随机、位置随机）
    const option = {
      series: [
        {
          type: 'wordCloud',
          gridSize: 15, // 增大间距，避免横竖文字重叠
          sizeRange: [12, 16], // 调整文字大小范围，更醒目
          // rotationRange: [0, 90], // 限制旋转角度：只允许 0°（水平）和 90°（垂直）
          // rotationStep: 90, // 旋转步长 90°，确保只在 0° 和 90° 之间切换
          shape: 'rect', // 词云形状（可按需修改）
          drawOutOfBound: false,
          data: getWordCloudData(), // 词云数据
          layout: 'random', // 位置随机
          randomSeed: Math.random() * 10000, // 每次渲染位置不同
          textStyle: {
            color: () => getRandomColor(), // 每个词调用随机颜色函数
            fontSize: null, // 不覆盖 sizeRange 配置
          },
        },
      ],
    }

    // 渲染图表
    myChart.setOption(option)

    // 监听窗口 resize，自适应图表
    window.addEventListener('resize', () => {
      myChart?.resize()
    })
  }

  // 依赖更新时重新渲染词云
  useEffect(() => {
    initWordCloud()
    // 清理函数：移除 resize 监听 + 销毁图表
    return () => {
      window.removeEventListener('resize', () => {
        myChart?.resize()
      })
      myChart?.dispose()
    }
  }, [books]) // 已读书籍变化时重新渲染
  const handleLogout = () => {
    localStorage.removeItem('token')
    window.location.href = window.location.origin + '/login'
  }

  return (
    <PageWrapper>
      <div className="flex flex-row-reverse pb-[20px] items-center gap-4">
        <Button onClick={handleLogout} size="small">
          退出登录
        </Button>
        <ThemeSwitcher />
      </div>
      <Row gutter={16}>
        <Col span={8}>
          <Card
            styles={{ body: { padding: '0' } }}
            title="已读"
            variant="borderless"
          >
            {/* 词云图容器：必须设置宽高 */}
            <div
              ref={chartRef}
              style={{ width: '100%', height: '200px' }} // 固定高度，确保图表正常显示
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="单词" variant="borderless">
            <div className="h-[150px] flex items-center justify-center">
              <Statistic
                valueStyle={{ fontSize: '50px' }}
                groupSeparator=""
                value={userInfo.wordCount || 0} // 容错处理
              />
            </div>
          </Card>
        </Col>
        <Col span={8}>
          <Card title="句子" variant="borderless">
            <div className="h-[150px] flex items-center justify-center">
              <Statistic
                valueStyle={{ fontSize: '50px' }}
                groupSeparator=""
                value={userInfo.sentenceCount || 0} // 容错处理
              />
            </div>
          </Card>
        </Col>
      </Row>
    </PageWrapper>
  )
}
