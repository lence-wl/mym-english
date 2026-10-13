import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Drawer, Slider, Spin } from 'antd'
import { debounce } from 'lodash'
import { RiArrowLeftSLine, RiSettings3Line } from '@remixicon/react'
import EpubReader from '../reader/EpubReader'
import DefinitionSheet from '../components/DefinitionSheet'
import ThemeSwitcher from '../components/ThemeSwitcher'
import { getBookDetail } from '../api/book'
import { flushReadingStatus } from '../api/user'
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
  // 初始阅读位置是否已恢复：恢复需等 locations 生成，期间盖一层加载态避免白屏
  const [bookRestored, setBookRestored] = useState(false)
  const [chromeVisible, setChromeVisible] = useState(true)
  const [openSetting, setOpenSetting] = useState(false)
  const [selectedText, setSelectedText] = useState('')
  const [percent, setPercent] = useState(0)
  // 关闭查词弹层时递增,触发 EpubReader 把选中色块淡出清掉（而非硬切）
  const [clearHighlightSignal, setClearHighlightSignal] = useState(0)

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
    setBookRestored(false)
    getBookDetail(id)
      .then((res) => {
        // 后端只返回文件名，需拼上 /uploads 前缀（与桌面端 BaseReader 一致）
        setBookUrl(res.data.filePath ? `/uploads/${res.data.filePath}` : '')
        setBookTitle(res.data.title || '')
      })
      .finally(() => setLoadingBook(false))
  }, [userInfo.currentBookId])

  // 上报阅读进度：用极短防抖(150ms)合并连续翻页,内部走 fetch keepalive。
  // 之前用 axios + 800ms 防抖,在 iOS PWA 下有两个失效路径:
  //   1) 800ms 内滑掉 App,axios XHR 会被中止,pagehide 又不一定触发;
  //   2) 即使 pagehide 触发,axios 也不带 keepalive,请求会被浏览器中止。
  // 改用 fetch keepalive 后,请求一旦发出,即使页面立刻被销毁浏览器也会发完。
  const reportProgress = useMemo(
    () =>
      debounce((cfi: string) => {
        const { userInfo } = useStore.getState()
        flushReadingStatus(userInfo.currentBookId, cfi)
      }, 150),
    [],
  )
  // 卸载时 flush:用户翻页后 150ms 内切走 Tab,组件 unmount 立即触发最后一次上报
  useEffect(() => () => reportProgress.flush(), [reportProgress])

  // 切后台 / 关闭 App / 刷新页面时,React 来不及跑 unmount cleanup,这里兜底。
  // 只 flush「防抖队列里待发的上报」,不能无条件写 store 里的 currentBookLoc:
  // App 从后台恢复(未重新加载)时 store 可能还是本机旧位置,直接写回会把
  // 另一端(PC)刚存下的进度覆盖掉,导致多端进度互相打架。
  useEffect(() => {
    const flushOnHide = () => reportProgress.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flushOnHide()
    }
    window.addEventListener('pagehide', flushOnHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flushOnHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [reportProgress])

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

  // 返回 locations 生成 promise：EpubReader 需要等它完成后再按百分比恢复位置
  const handleBookReady = useCallback((book: any) => {
    bookRef.current = book
    // 生成定位索引用于百分比进度（异步，不阻塞阅读）
    return book.locations.generate(1600).then(() => {
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
        // 左右内边距即"页边距"：容器变窄后 epubjs 会把单页宽度一并收窄，形成左右留白
        <>
          <div
            className="absolute inset-0"
            style={{
              paddingTop: 'var(--safe-top)',
              paddingBottom: 'var(--safe-bottom)',
              paddingLeft: themeConfig.pageMargin,
              paddingRight: themeConfig.pageMargin,
            }}
          >
            <EpubReader
              url={bookUrl}
              initialLocation={userInfo.currentBookLoc}
              fontSize={themeConfig.fontSize}
              lineHeight={themeConfig.lineHeight}
              themeKey={themeConfig.theme}
              onRelocated={handleRelocated}
              onLookup={setSelectedText}
              onCenterTap={() => setChromeVisible((v) => !v)}
              onBookReady={handleBookReady}
              onRestored={() => setBookRestored(true)}
              clearHighlightSignal={clearHighlightSignal}
            />
          </div>
          {/* 恢复阅读位置需等 locations 生成，期间盖一层加载态，避免先显示章节开头再跳转 */}
          {!bookRestored && (
            <div
              className="absolute inset-0 z-10 flex items-center justify-center"
              style={{ background: readingColorConfig[themeConfig.theme]?.colorBgContainer }}
            >
              <Spin size="large" />
            </div>
          )}
        </>
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
        height={360}
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
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">行高</span>
              <span className="text-sm opacity-70">{themeConfig.lineHeight.toFixed(1)}</span>
            </div>
            <Slider
              min={1.2}
              max={2.4}
              step={0.1}
              value={themeConfig.lineHeight}
              onChange={(v) => state.updateThemeConfig({ lineHeight: v })}
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm">左右页边距</span>
              <span className="text-sm opacity-70">{themeConfig.pageMargin}px</span>
            </div>
            <Slider
              min={8}
              max={48}
              step={4}
              value={themeConfig.pageMargin}
              onChange={(v) => state.updateThemeConfig({ pageMargin: v })}
            />
          </div>
        </div>
      </Drawer>

      {/* 长按查词 / 划词查句 */}
      <DefinitionSheet
        text={selectedText}
        open={!!selectedText}
        onClose={() => {
          setSelectedText('')
          // 关弹层时触发 iframe 里的高亮色块淡出再清掉,而非硬切
          setClearHighlightSignal((v) => v + 1)
        }}
      />
    </div>
  )
}

export default Reader