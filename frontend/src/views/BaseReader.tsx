import { useState, useRef, useEffect } from 'react'
import { ReactReader } from '../components/ReactReader'
import type { Rendition, EpubCFI, Contents } from 'epubjs'
import useStore from '../store'
import { updateReadingStatus } from '../api/user'
import { debounce } from 'lodash'
import { getBookDetail } from '../api/book'
import { Radio, Button, Drawer, notification, Slider, Typography } from 'antd'
import CommonLayer from '../components/CommmonLayer'
import { epubThemes } from '../theme/EpubThemeConfig'
import ThemeSwitcher from '../components/ThemeSwitcher'
import chroma from 'chroma-js'
import { readingColorConfig } from '../theme/themeConfig'
import { Progress } from 'antd'

const handleContextmenu = (e: any) => {
  e.preventDefault() // 阻止默认右键菜单
  e.stopPropagation() // 阻止事件冒泡
  return false
}

// 禁用右键菜单（阻止上下文菜单）
document.addEventListener('contextmenu', handleContextmenu)

let mouseUp = true
export default () => {
  const state = useStore()
  const loc = state.userInfo.currentBookLoc
  const [bookUrl, setBookUrl] = useState<string>('')
  const rendition = useRef<Rendition | undefined>(undefined)
  const [selectedText, setSelectedText] = useState<string>('')
  const [openDrawer, setOpenDrawer] = useState<boolean>(false)
  const [percent, setPercent] = useState<number>(0)
  const [openSetting, setOpenSetting] = useState<boolean>(false)
  const [location, setLoaction] = useState<string | number>(
    state.userInfo.currentBookLoc || 0,
  )

  // 字体大小相关状态
  const [fontSize, setFontSize] = useState<number>(state.themeConfig.fontSize)
  const [bgColor, setBgColor] = useState<string>('#fff')
  const readerWidth = state.themeConfig.readerWidth
  // 弹层相关
  const [selectRect, setSelectRect] = useState<DOMRect>()
  const containerRef = useRef<HTMLElement>(null)
  const [mouseUpState, setMouseUpState] = useState<boolean>(true) // 重命名避免变量冲突

  // 防抖处理字体大小变更，延迟300ms
  const debouncedSetFontSize = debounce((size: number) => {
    if (rendition.current) {
      // 设置 epub 阅读器字体大小
      rendition.current.themes.fontSize(`${size}px`)
      // 更新全局状态
      state.updateThemeConfig({
        ...state.themeConfig,
        fontSize: size,
      })
    }
  }, 300)
  // 监听颜色切换
  useEffect(() => {
    const color = readingColorConfig[state.themeConfig.theme].colorBgContainer
    setBgColor(
      chroma(readingColorConfig[state.themeConfig.theme].colorBgContainer)
        .alpha(0.8)
        .css('rgb'),
    )
  }, [state.themeConfig.theme])

  // 宽度切换方法
  const switchReaderWidth = (type: string) => {
    switch (type) {
      case '100%':
        state.updateThemeConfig({ readerWidth: '100%' })
        break
      case '50%':
        state.updateThemeConfig({ readerWidth: '50%' })
        break
      case 'a4':
        state.updateThemeConfig({ readerWidth: calculateA4Width() })
        break
    }
  }

  // 计算A4宽度
  const calculateA4Width = (dpi = 96) => {
    const A4_WIDTH_MM = 210 // A4标准宽度（mm）
    const MM_TO_INCH = 25.4 // 1英寸=25.4mm
    return Math.round((A4_WIDTH_MM * dpi) / MM_TO_INCH) * 1.34 + 'px' // 转px字符串
  }

  const getRendition = async (_rendition: Rendition) => {
    Object.entries(epubThemes).forEach(([tag, styles]) => {
      _rendition.themes.register(tag, styles)
    })
    _rendition.themes.select(state.themeConfig.theme)
    // 初始化字体大小
    _rendition.themes.fontSize(`${fontSize}px`)

    // 文字选择事件
    _rendition.on('selected', async (cfiRange: EpubCFI, contents: Contents) => {
      const selection = contents.document.getSelection()!
      // 弹层挂载点：优先用书自带的 .chapter，取不到就退回 iframe 的 body。
      // 不能只依赖 .chapter —— 部分书里没有这个 class，container 会变成
      // undefined，导致 CommonLayer 静默返回 null（表现为划词毫无反应且不报错）
      containerRef.current = (contents.document.getElementsByClassName(
        'chapter',
      )[0] || contents.document.body) as any
      const range = selection.getRangeAt(0) // 获取第一个选中范围
      const rect = range.getBoundingClientRect() // 获取选中区域的位置矩形
      setSelectRect(rect)
      const text = selection.toString().trim()!
      if (text) {
        setSelectedText(text)
      } else {
        setSelectedText('')
      }
    })
    _rendition.on('mousedown', (event: any) => {
      const tagName = event.target.tagName
      if (!['svg', 'path'].includes(tagName)) {
        setSelectedText('')
        setMouseUpState(false)
      }
    })
    _rendition.on('mouseup', async () => {
      if (selectedText.length <= 1000) {
        setMouseUpState(true)
        setOpenDrawer(true)
      } else {
        if (!document.getElementsByClassName('ant-notification').length) {
          notification.info({ message: '选择的文本太多了' })
          setSelectedText('')
          setMouseUpState(true)
        }
      }
    })

    rendition.current = _rendition
    // 生成位置索引（仅首次加载书籍时需要，避免重复生成）
    _rendition.book.locations.generate(2048).then(() => {
      setPercent(
        rendition.current?.book.locations.percentageFromCfi(location as any) ||
          0,
      )
    })

    setTimeout(async () => {
      await rendition.current?.display(location as any)
      state.updateUserInfo({
        currentBookLoc: location,
      })
      debouncedUpdateReadingStatus(location as any)
    })
  }

  // 处理字体大小变更
  const handleFontSizeChange = (value: number) => {
    setFontSize(value)
    debouncedSetFontSize(value)
  }

  const debouncedUpdateReadingStatus = debounce(async (loc: string) => {
    setPercent(rendition.current?.book.locations.percentageFromCfi(loc) || 0)
    await updateReadingStatus()
  }, 500)

  // 使用防抖的位置更新函数
  const locationChanged = async (loc: any) => {
    const { userInfo, updateUserInfo } = useStore.getState()
    const bookId = userInfo.currentBookId
    updateUserInfo({
      currentBookLoc: loc,
      // 同步本会话内的「按书位置」：在书架切走再切回时，
      // 直接取这里的位置继续读，不必等下一次 /auth/me
      myBookData: [
        ...(userInfo.myBookData || []).filter((b) => String(b.id) !== String(bookId)),
        ...(bookId ? [{ id: String(bookId), location: String(loc) }] : []),
      ],
    })
    debouncedUpdateReadingStatus(loc)
  }

  // 获取电子书详情数据
  const getBookData = async () => {
    if (state.userInfo.currentBookId) {
      const bookData = await getBookDetail(state.userInfo.currentBookId)
      setBookUrl(bookData.data.filePath)
    }
  }

  useEffect(() => {
    getBookData()
  }, [])

  useEffect(() => {
    if (rendition.current && state.themeConfig.theme) {
      rendition.current?.themes.select(state.themeConfig.theme)
      // 同步字体大小
      rendition.current.themes.fontSize(`${fontSize}px`)
    }
  }, [state.themeConfig.theme])

  // 组件卸载时清除防抖
  useEffect(() => {
    return () => {
      debouncedSetFontSize.cancel()
      debouncedUpdateReadingStatus.cancel()
    }
  }, [])

  return bookUrl ? (
    <>
      <Drawer
        height={90}
        styles={{
          mask: {
            opacity: 0,
          },
          body: {
            padding: 0,
          },
        }}
        placement={'top'}
        onClose={() => {
          setOpenSetting(false)
        }}
        closable={false}
        mask={true}
        open={openSetting}
      >
        <div className="flex justify-center">
          <div className="flex flex-col items-center justify-center w-[60%]">
            <div className="flex items-center">
              <div className="flex items-center">
                <Typography.Text className="mr-2 text-sm">
                  主题颜色:
                </Typography.Text>
                <ThemeSwitcher />
              </div>
              <div className="flex items-center mx-[20px]">
                <Typography.Text className="mr-2 text-sm">
                  宽度设置:
                </Typography.Text>
                <Radio.Group
                  size="small"
                  options={[
                    { label: '全屏', value: '100%' },
                    { label: '半屏', value: '50%' },
                    { label: 'A4纸张', value: 'a4' },
                  ]}
                  onChange={(e) => {
                    switchReaderWidth(e.target.value)
                  }}
                  value={
                    readerWidth != '100%' && readerWidth != '50%'
                      ? 'a4'
                      : readerWidth
                  }
                  optionType="button"
                />
              </div>
              <div className="flex items-center">
                <Typography.Text className="mr-2 text-sm">
                  字体大小:
                </Typography.Text>
                <Slider
                  value={fontSize}
                  min={20}
                  max={60}
                  step={2}
                  onChange={handleFontSizeChange}
                  style={{ width: 180 }}
                  tooltip={{ formatter: (value) => `${value}px` }}
                />
                <Typography.Text className="ml-2 text-sm font-medium">
                  {fontSize}px
                </Typography.Text>
              </div>
            </div>
            {/* 阅读进度 */}
            <div className="px-[20px] w-[100%]">
              <Progress
                strokeColor={
                  chroma(
                    readingColorConfig[state.themeConfig.theme]
                      .colorBgContainer,
                  ).css('rgb') === 'rgb(255 255 255)'
                    ? ''
                    : chroma(
                        readingColorConfig[state.themeConfig.theme]
                          .colorBgContainer,
                      ).css('rgb')
                }
                percent={parseInt(percent * 100 + '')}
                status="active"
              />
            </div>
          </div>
        </div>
      </Drawer>
      <div className="fixed right-10 top-0 z-1000">
        <img
          onClick={() => setOpenSetting(!openSetting)}
          // Tailwind 工具类组合：基础样式 + hover 效果 + 过渡动画
          className="relative z-10 w-[3vw] opacity-50 cursor-pointer transition-all duration-300 transform-origin-center hover:scale-110 hover:opacity-100"
          src="/images/arr_up.png"
          alt="设置按钮" // 无障碍优化
        />
      </div>

      <div className="h-[100vh] w-[100vw] pt-16 backdrop-blur-3xl">
        {/* 顶部留出控件空间 */}
        <ReactReader
          key={bgColor}
          bgColor={bgColor}
          url={`/uploads/${bookUrl}`}
          location={location}
          initialWidth={readerWidth}
          locationChanged={locationChanged}
          getRendition={getRendition}
        />
      </div>

      {/* 翻译弹层 */}
      {selectedText && mouseUpState ? (
        <CommonLayer
          rect={selectRect!}
          selectedText={selectedText}
          container={containerRef.current!}
          zIndex={1001}
        ></CommonLayer>
      ) : null}
    </>
  ) : (
    <div className="h-screen flex items-center justify-center">加载中...</div>
  )
}
