import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Drawer, Slider, Spin } from 'antd'
import { debounce } from 'lodash'
import { RiArrowLeftSLine, RiSettings3Line } from '@remixicon/react'
import EpubReader from '../reader/EpubReader'
import DefinitionSheet from '../components/DefinitionSheet'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { getBookDetail } from '../api/book'
import { updateReadingStatus } from '../api/user'
import useStore from '../store'
import { readingColorConfig } from '../theme/themeConfig'

/** 阅读页：沉浸全屏，单击中部切换上下工具栏，选中文本弹出释义抽屉 */
const Reader = () => {
  const navigate = useNavigate()
  const state = useStore()
  const { themeConfig, userInfo } = state

  const [bookUrl, setBookUrl] = useState('')
  const [bookTitle, setBookTitle] = useState('')
  const [loadingBook, setLoadingBook] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [openSetting, setOpenSetting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [percent, setPercent] = useState(0)

  const bookRef = useRef<any>(null)
  const locationsReadyRef = useRef(false)

  const readingColor = readingColorConfig[themeConfig.theme]
  const colorText = readingColor?.colorText || '#374151'
  // 上下工具栏跟随阅读主题配色，避免固定白底在深色/彩色主题下突兀
  const chromeBg = readingColor?.colorBgContainer || '#fff'
  const hairline = `1px solid color-mix(in srgb, ${colorText} 15%, transparent)`

  // 拉取当前书籍文件地址
  useEffect(() => {
    const id = userInfo.currentBookId
    if (!id) return
    setLoadingBook(true)
    getBookDetail(id)
      .then((res) => {
        // 后端只返回文件名，需拼上 /uploads 前缀（与桌面端 BaseReader 一致）
        setBookUrl(res.data.filePath ? `/uploads/${res.data.filePath}` : '')
        setBookTitle(res.data.title || '')
      })
      .finally(() => setLoadingBook(false))
  }, [userInfo.currentBookId])

  // 防抖上报阅读进度
  const reportProgress = useMemo(
    () =>
      debounce((cfi: string) => {
        const id = useStore.getState().userInfo.currentBookId
        if (id) updateReadingStatus(id, cfi).catch(() => {})
      }, 800),
    [],
  )
  useEffect(() => () => reportProgress.cancel(), [reportProgress])

  const handleRelocated = useCallback(
    (cfi: string) => {
      const { userInfo: info, updateUserInfo } = useStore.getState()
      const bookId = info.currentBookId
      updateUserInfo({
        currentBookLoc: cfi,
        // 同步本会话内的「按书位置」：在书架切走再切回时，
        // 直接取这里的位置继续读，不必等下一次 /auth/me
        myBookData: [
          ...(info.myBookData || []).filter((b) => String(b.id) !== String(bookId)),
          ...(bookId ? [{ id: String(bookId), location: cfi }] : []),
        ],
      })
      reportProgress(cfi)
      const book = bookRef.current
      if (book && locationsReadyRef.current) {
        try {
          const p = book.locations.percentageFromCfi(cfi)
          if (typeof p === 'number' && !Number.isNaN(p)) setPercent(Math.round(p * 100))
        } catch {
          /* 忽略定位失败 */
        }
      }
    },
    [reportProgress],
  )

  const handleBookReady = useCallback((book: any) => {
    bookRef.current = book
    // 生成定位索引用于百分比进度（异步，不阻塞阅读）
    book.locations.generate(1600).then(() => {
      locationsReadyRef.current = true
    })
  }, [])

  if (!userInfo.currentBookId) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 px-8">
        <div className="text-base" style={{ color: colorText }}>
          还没有正在阅读的书籍
        </div>
        <Button type="primary" onClick={() => navigate('/bookshelf')}>
          去书架选一本
        </Button>
      </div>
    )
  }

  return (
    <div
      className="h-full relative overflow-hidden"
      style={{ background: readingColorConfig[themeConfig.theme]?.colorBgContainer }}
    >
      {loadingBook || !bookUrl ? (
        <div className="h-full flex items-center justify-center">
          <Spin size="large" />
        </div>
      ) : (
        // 正文必须避开顶部状态栏与底部 Home 指示条：已安装 PWA（black-translucent）
        // 下网页内容会伸到状态栏下方，不加内边距就会与状态栏重叠
        <div
          className="absolute inset-0"
          style={{
            paddingTop: 'var(--safe-top)',
            paddingBottom: 'var(--safe-bottom)',
          }}
        >
          <EpubReader
            url={bookUrl}
            initialLocation={userInfo.currentBookLoc}
            fontSize={themeConfig.fontSize}
            themeKey={themeConfig.theme}
            onRelocated={handleRelocated}
            onLookup={setSelectedText}
            onCenterTap={() => setChromeVisible((v) => !v)}
            onBookReady={handleBookReady}
          />
        </div>
      )}

      {/* 顶部工具栏 */}
      <div
        className="absolute top-0 left-0 right-0 z-20 flex items-center gap-2 px-2 transition-opacity duration-200"
        style={{
          paddingTop: 'var(--safe-top)',
          background: chromeBg,
          borderBottom: hairline,
          opacity: chromeVisible ? 1 : 0,
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        <button
          className="p-2 no-select"
          onClick={() => navigate('/bookshelf')}
          aria-label="返回"
        >
          <RiArrowLeftSLine size={26} color={colorText} />
        </button>
        <div className="flex-1 truncate text-[15px] font-medium" style={{ color: colorText }}>
          {bookTitle}
        </div>
        <button
          className="p-2 no-select"
          onClick={() => setOpenSetting(true)}
          aria-label="阅读设置"
        >
          <RiSettings3Line size={22} color={colorText} />
        </button>
      </div>

      {/* 底部进度 */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 px-4 transition-opacity duration-200"
        style={{
          paddingBottom: 'var(--safe-bottom)',
          background: chromeBg,
          borderTop: hairline,
          opacity: chromeVisible ? 1 : 0,
          pointerEvents: chromeVisible ? 'auto' : 'none',
        }}
      >
        <div className="flex items-center gap-3 py-2">
          <div
            className="flex-1 h-1 rounded-full overflow-hidden"
            style={{ background: `color-mix(in srgb, ${colorText} 18%, transparent)` }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-300"
              style={{
                width: `${percent}%`,
                background: 'var(--global-primary)',
              }}
            />
          </div>
          <span className="text-[12px] tabular-nums opacity-70" style={{ color: colorText }}>
            {percent}%
          </span>
        </div>
      </div>

      {/* 阅读设置抽屉 */}
      <Drawer
        placement="bottom"
        height={230}
        open={openSetting}
        onClose={() => setOpenSetting(false)}
        closable={false}
        title="阅读设置"
        styles={{ body: { paddingBottom: 'calc(16px + var(--safe-bottom))' } }}
      >
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-between">
            <span className="text-sm">主题颜色</span>
            <ThemeSwitcher />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">字体大小</span>
              <span className="text-sm opacity-70">{themeConfig.fontSize}px</span>
            </div>
            <Slider
              min={16}
              max={34}
              step={1}
              value={themeConfig.fontSize}
              onChange={(v) => state.updateThemeConfig({ fontSize: v })}
            />
          </div>
        </div>
      </Drawer>

      {/* 长按查词 / 划词查句 */}
      <DefinitionSheet
        text={selectedText}
        open={!!selectedText}
        onClose={() => setSelectedText('')}
      />
    </div>
  )
}

export default Reader