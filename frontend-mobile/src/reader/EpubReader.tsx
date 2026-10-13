import { useEffect, useRef } from 'react'
import Epub, { type Book, type Contents, type Rendition } from 'epubjs'
import { epubThemes, buildTypographyRules } from '../theme/EpubThemeConfig'

interface EpubReaderProps {
  /** epub 地址：/uploads/xxx */
  url: string
  /** 初始阅读位置（cfi） */
  initialLocation?: string | number | null
  fontSize: number
  /** 正文行高倍数 */
  lineHeight: number
  themeKey: string
  /** 阅读位置变化（cfi） */
  onRelocated: (cfi: string) => void
  /** 长按查词 / 长按拖动划词，回传被查的文本（单词或选段） */
  onLookup: (text: string) => void
  /** 单击屏幕中间（用于切换顶栏/底栏显隐） */
  onCenterTap: () => void
  /** 初始位置恢复完成（用于隐藏加载态） */
  onRestored?: () => void
  /** 书籍解析完成，可用于生成 locations（可返回其 promise，供恢复位置前等待） */
  onBookReady?: (book: Book, rendition: Rendition) => void | Promise<unknown>
  /**
   * 清掉选中高亮的「信号量」：每次 +1 即触发一次淡出清空。
   * 上层关闭查词弹层时递增此值，EpubReader 收到后给 highlight 色块
   * 加 opacity transition 渐隐，再 setTimeout 清掉 DOM，避免硬切。
   */
  clearHighlightSignal?: number
}

/** 左右翻页模式下，两侧各 25% 为翻页热区（剩余 50% 留给工具栏切换，减少误触） */
const TAP_ZONE = 0.25
const LONG_PRESS_MS = 450 // 长按判定时长（松手早于它视为轻点）
const MOVE_TOLERANCE = 10 // 长按期间允许的位移，超出即视为滑动
const ARM_DEAD_ZONE = 16 // 长按命中词后的死区：松手前位移小于它 → 始终算查词，避免手抖变成选段
const HIGHLIGHT_COLOR = 'rgba(255, 214, 102, 0.55)' // 选中底色：荧光笔黄，深浅主题下都可读
const HIGHLIGHT_UNDERLINE = 'rgba(230, 150, 0, 0.9)' // 选中下划线：底色之外再加一道，低对比设备也看得清
const OVERLAY_ID = 'lookup-overlay' // 兜底色块容器的 id
const isWordChar = (ch?: string) => !!ch && /[A-Za-z'’-]/.test(ch)

/**
 * 移动端 epub 阅读内核。
 *
 * 与桌面端的差异（桌面端为 scrolled + 连续滚动，且依赖 mousedown/mouseup）：
 * 1. 固定左右翻页（paginated + default manager）：单页横向翻页，靠左右热区/横滑换页，
 *    并给容器加平滑过渡避免"硬切"；
 * 2. 正文禁用原生选择（见 EpubThemeConfig），查词查句都改成自研手势：
 *    长按不动 = 查词，长按后继续拖动划词 = 查句，系统不会弹出拷贝/查询/翻译菜单；
 * 3. 监听 resize/orientationchange，横竖屏切换后重新排版。
 */
const EpubReader = ({
  url,
  initialLocation,
  fontSize,
  lineHeight,
  themeKey,
  onRelocated,
  onLookup,
  onCenterTap,
  onRestored,
  onBookReady,
  clearHighlightSignal,
}: EpubReaderProps) => {
  const holderRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  // 当前章节 iframe 的 document：closeSignal 触发淡出时需要拿到 layer
  const contentsDocRef = useRef<Document | null>(null)
  // 期望停留的 cfi：初始为 initialLocation，之后由 relocated 事件更新。
  // paginated 模式下重排（resize）会重新分页，可能把视图重置到章节开头，
  // 这里留一份「应停留位置」，重排后据此定位回去。
  const desiredCfiRef = useRef<string | null>(null)
  // 用 ref 保存回调，避免因依赖变化重建 state
  const cbRef = useRef({ onRelocated, onLookup, onCenterTap, onRestored, onBookReady })
  cbRef.current = { onRelocated, onLookup, onCenterTap, onRestored, onBookReady }

  // 内容加载时挂载触屏交互（翻页 / 长按查词 / 轻点）
  const attachContentHandlers = (contents: Contents) => {
    const win = contents.window as any
    const doc = contents.document
    if (!doc) return
    // 暴露给上层 closeSignal 触发淡出时使用
    contentsDocRef.current = doc

    // epubjs 换页是靠直接改 container.scrollLeft 实现的，默认瞬时跳变（"硬切"）。
    // 给滚动容器加平滑过渡，换页就有滑动感。容器由 manager.render 创建，内容加载时必定已存在。
    const container = (renditionRef.current as any)?.manager?.container as
      | HTMLElement
      | undefined
    if (container) container.style.scrollBehavior = 'smooth'

    let startX = 0
    let startY = 0
    let startTime = 0
    let lastTouchAt = 0
    let pressTimer: ReturnType<typeof setTimeout> | null = null
    /** 长按已命中单词，进入划词状态（此时松手 = 查词，继续拖动 = 查句/查选段） */
    let armed = false
    /** 长按命中时的落点，用于计算死区 */
    let armX = 0
    let armY = 0
    /** 划词锚点（落在词首） */
    let anchor: { node: Node; offset: number } | null = null
    /** 当前划中的范围 */
    let selRange: Range | null = null

    const turn = (dir: 'prev' | 'next') => {
      const r = renditionRef.current
      if (!r) return
      if (dir === 'next') r.next()
      else r.prev()
    }

    /**
     * 分页模式下 epubjs 会把 iframe 拉宽到「所有列的总宽」并整体左移，用平移来换页。
     * 因此 iframe 内的 clientX 不是可视坐标，必须叠加 iframe 相对外层容器的左偏移才能换算回来。
     * 注意：caretRangeFromPoint 与触摸事件同处 iframe 坐标系，取词时不需要这层换算。
     */
    const visiblePoint = (x: number) => {
      const rect = (win?.frameElement as HTMLElement | null)?.getBoundingClientRect?.()
      const offsetX = rect ? -rect.left : 0
      const width = holderRef.current?.clientWidth || (rect ? rect.width : 320)
      return { x: x - offsetX, width }
    }

    /**
     * 命中点所在的单词范围（Range 锚在词首）。
     * 正文已禁用原生选择，所以用 caretRangeFromPoint 自行定位。
     */
    const wordRangeAt = (x: number, y: number) => {
      const caret = doc.caretRangeFromPoint?.(x, y)
      const node = caret?.startContainer
      if (!node || node.nodeType !== Node.TEXT_NODE) return null

      const text = node.textContent || ''
      // 点在单词右侧边界之后时向左退一格
      let at = caret!.startOffset
      if (!isWordChar(text[at]) && isWordChar(text[at - 1])) at -= 1
      if (!isWordChar(text[at])) return null

      let s = at
      let e = at + 1
      while (s > 0 && isWordChar(text[s - 1])) s--
      while (e < text.length && isWordChar(text[e])) e++

      const range = doc.createRange()
      range.setStart(node, s)
      range.setEnd(node, e)
      return range
    }

    /** 从锚点拖到手指当前点；末端补到词尾，避免把单词切成两半 */
    const rangeTo = (from: { node: Node; offset: number }, x: number, y: number) => {
      const caret = doc.caretRangeFromPoint?.(x, y)
      const node = caret?.startContainer
      if (!node || node.nodeType !== Node.TEXT_NODE) return null

      const text = node.textContent || ''
      let endOffset = caret!.startOffset
      while (endOffset < text.length && isWordChar(text[endOffset])) endOffset++

      const range = doc.createRange()
      range.setStart(from.node, from.offset)
      range.setEnd(node, endOffset)
      // 反向拖动时 start 会晚于 end，交换回来
      if (range.collapsed && (from.node !== node || from.offset !== endOffset)) {
        range.setStart(node, endOffset)
        range.setEnd(from.node, from.offset)
      }
      return range
    }

    /**
     * 划词高亮：用绝对定位色块实现，不依赖 CSS Custom Highlight API。
     *
     * 为什么弃用 ::highlight()：真机 iOS 上 API 注册成功（CSS.highlights 里能查到、
     * size 为 1），但 WebKit 就是不绘制，怀疑与正文 user-select:none 有关。色块是纯 DOM
     * + 基础 CSS，兼容性最好；它同样不产生原生 Selection，所以不会触发系统菜单。
     * 坐标取自 range.getClientRects()，与文本同处 iframe 视口坐标系，无需换算。
     */
    const setHighlight = (range: Range | null) => {
      let layer = doc.getElementById(OVERLAY_ID) as HTMLElement | null
      if (!range) {
        if (layer) layer.textContent = ''
        return
      }
      if (!layer) {
        layer = doc.createElement('div')
        layer.id = OVERLAY_ID
        layer.style.cssText =
          'position:fixed;left:0;top:0;right:0;bottom:0;pointer-events:none;z-index:2147483647'
        doc.documentElement.appendChild(layer)
      }
      layer.textContent = ''
      const rects = Array.from(range.getClientRects())
      rects.forEach((r) => {
        const box = doc.createElement('span')
        box.style.cssText =
          `position:absolute;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;` +
          `background:${HIGHLIGHT_COLOR};border-bottom:2px solid ${HIGHLIGHT_UNDERLINE};border-radius:2px`
        layer!.appendChild(box)
      })
    }

    const clearPress = () => {
      if (pressTimer) {
        clearTimeout(pressTimer)
        pressTimer = null
      }
    }

    const handleStart = (x: number, y: number) => {
      startX = x
      startY = y
      startTime = Date.now()
      armed = false
      anchor = null
      selRange = null
      setHighlight(null)
      clearPress()
      // 长按 450ms 命中单词 -> 高亮并进入划词状态：
      // 松手不动 = 查词；继续拖动 = 扩大范围，松手查句/查选段。
      pressTimer = setTimeout(() => {
        pressTimer = null
        const range = wordRangeAt(x, y)
        if (!range) return
        armed = true
        armX = x
        armY = y
        anchor = { node: range.startContainer, offset: range.startOffset }
        selRange = range
        setHighlight(range)
      }, LONG_PRESS_MS)
    }

    const handleMove = (x: number, y: number) => {
      // 划词中：跟随手指扩大选区，不做取消判断
      if (armed && anchor) {
        // 死区：刚命中词后的小幅抖动仍按查词处理，超出阈值才真正开始选段
        if (Math.hypot(x - armX, y - armY) < ARM_DEAD_ZONE) return
        const range = rangeTo(anchor, x, y)
        if (range) {
          selRange = range
          setHighlight(range)
        }
        return
      }
      if (Math.abs(x - startX) > MOVE_TOLERANCE || Math.abs(y - startY) > MOVE_TOLERANCE) clearPress()
    }

    const handleEnd = (x: number, y: number) => {
      clearPress()
      // 长按手势已接管本次触摸：松手时按划中的文本查询，不再翻页/切工具栏
      if (armed) {
        armed = false
        anchor = null
        const text = (selRange?.toString() || '').replace(/\s+/g, ' ').trim()
        selRange = null
        if (text) cbRef.current.onLookup(text)
        return
      }

      const dx = x - startX
      const dy = y - startY
      const dt = Date.now() - startTime

      // 横向轻扫
      if (Math.abs(dx) > 50 && Math.abs(dy) < 40 && dt < 800) {
        turn(dx < 0 ? 'next' : 'prev')
        return
      }
      // 轻点
      if (dt < 350 && Math.abs(dx) < 20 && Math.abs(dy) < 20) {
        const { x: vx, width } = visiblePoint(x)
        if (vx < width * TAP_ZONE) turn('prev')
        else if (vx > width * (1 - TAP_ZONE)) turn('next')
        else cbRef.current.onCenterTap()
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      // 兜底阻断 WebKit 的原生选择/呼叫菜单机器（正文样式已禁用选择，这里再压一层）。
      // 书内链接保持默认行为，避免影响跳转。
      if (!(e.target as Element | null)?.closest?.('a[href]')) {
        e.preventDefault()
      }
      handleStart(t.clientX, t.clientY)
    }
    const onTouchMove = (e: TouchEvent) => {
      const t = e.touches[0]
      if (t) handleMove(t.clientX, t.clientY)
    }
    const onTouchEnd = (e: TouchEvent) => {
      const t = e.changedTouches[0]
      if (!t) return
      lastTouchAt = Date.now()
      handleEnd(t.clientX, t.clientY)
    }
    // 非触屏环境（桌面浏览器 / 触控板）走同一套手势逻辑
    const onMouseDown = (e: MouseEvent) => {
      handleStart(e.clientX, e.clientY)
    }
    const onMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY)
    }
    const onMouseUp = (e: MouseEvent) => {
      // 触屏设备 touchend 后会补发合成 mouse 事件，忽略以免重复翻页
      if (Date.now() - lastTouchAt < 600) return
      handleEnd(e.clientX, e.clientY)
    }
    // 原生选择、拖拽与长按上下文菜单一律拦掉（Android 长按同样会弹菜单）
    const blockDefault = (e: Event) => e.preventDefault()
    const onContextMenu = blockDefault

    doc.addEventListener('touchstart', onTouchStart, { passive: false })
    doc.addEventListener('touchmove', onTouchMove, { passive: false })
    doc.addEventListener('touchend', onTouchEnd, { passive: true })
    doc.addEventListener('mousedown', onMouseDown)
    doc.addEventListener('mousemove', onMouseMove)
    doc.addEventListener('mouseup', onMouseUp)
    doc.addEventListener('contextmenu', onContextMenu)
    doc.addEventListener('selectstart', blockDefault)
    doc.addEventListener('dragstart', blockDefault)

    return () => {
      clearPress()
      setHighlight(null)
      doc.removeEventListener('touchstart', onTouchStart)
      doc.removeEventListener('touchmove', onTouchMove)
      doc.removeEventListener('touchend', onTouchEnd)
      doc.removeEventListener('mousedown', onMouseDown)
      doc.removeEventListener('mousemove', onMouseMove)
      doc.removeEventListener('mouseup', onMouseUp)
      doc.removeEventListener('contextmenu', onContextMenu)
      doc.removeEventListener('selectstart', blockDefault)
      doc.removeEventListener('dragstart', blockDefault)
    }
  }

  // 初始化（仅在 url 变化时重建）
  useEffect(() => {
    if (!holderRef.current || !url) return
    let disposed = false

    const book = Epub(url, {
      requestCredentials: 'include',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      allowScriptedContent: true,
    } as any)
    bookRef.current = book

    const rendition = book.renderTo(holderRef.current, {
      width: '100%',
      height: '100%',
      // 固定左右翻页
      flow: 'paginated',
      manager: 'default',
      spread: 'none',
      allowScriptedContent: true,
    })
    renditionRef.current = rendition

    // 注册配色主题
    Object.entries(epubThemes).forEach(([tag, styles]) => {
      rendition.themes.register(tag, styles as any)
    })
    // 行高挂在与配色无关的 default 主题上：epubjs 每次加载内容都会注入它
    rendition.themes.register('default', buildTypographyRules(lineHeight) as any)
    rendition.themes.select(themeKey)
    rendition.themes.fontSize(`${fontSize}px`)

    // 触屏交互
    rendition.hooks.content.register((contents: Contents) => {
      return attachContentHandlers(contents) as any
    })

    // 恢复位置期间禁止把位置上报给上层。
    // paginated 模式下 display(savedCfi) 一旦解析失败会降级到章节开头并触发
    // relocated；若此时上报，就会把「章节开头」的假 cfi 覆盖掉后端已存的正确进度。
    let isRestoring = true

    // 阅读位置变化
    rendition.on('relocated', (loc: any) => {
      if (!loc?.start?.cfi) return
      desiredCfiRef.current = loc.start.cfi
      if (isRestoring) return
      cbRef.current.onRelocated(loc.start.cfi)
    })

    const startLocation =
      initialLocation && String(initialLocation).length ? String(initialLocation) : null
    // 记下「应停留位置」，供重排后定位回去
    desiredCfiRef.current = startLocation

    // 是否已完成初始定位：在 display() 完成前绝不触发 relayout ——
    // paginated 模式下 resize 会重新分页并把视图重置到章节开头，
    // 抢在恢复之前就会导致「回到章节开头而非具体页」。
    let displayed = false

    // 横竖屏 / 尺寸变化后重新排版
    let lastW = 0
    let lastH = 0
    const relayout = () => {
      // 初始 display 尚未完成时不重排，避免把刚恢复的位置重置到章节开头
      if (!displayed) return
      const node = holderRef.current
      const r = renditionRef.current
      // 渲染内核未就绪时 manager 尚未创建，此时 resize 会抛错，需跳过
      if (!node || !r || typeof (r as any).manager?.resize !== 'function') return
      const w = node.clientWidth
      const h = node.clientHeight
      // 尺寸没变就不重排：多余重排会重新分页并丢位置
      if (w === lastW && h === lastH) return
      lastW = w
      lastH = h
      // 重排前记住当前位置，重排后定位回去，避免跳回章节开头
      const keep =
        (r as any).currentLocation?.()?.start?.cfi || desiredCfiRef.current
      console.log('[reading-progress] relayout', { w, h, keep })
      r.resize(w, h)
      if (keep) {
        window.setTimeout(() => {
          if (disposed) return
          try {
            ;(renditionRef.current as any)?.display?.(keep)
          } catch {
            /* 忽略定位失败 */
          }
        }, 250)
      }
    }

    // 初始定位：恢复到上次阅读位置。
    // 不能直接 display(savedCfi)：paginated 模式下 manager 用
    // contents.locationOf(cfi) → EpubCFI.toRange(document) 计算页内偏移，
    // 一旦该 cfi 在当前 DOM 里解析不出 range，就退化成 {left:0,top:0}，
    // 视图必然停在页 0（章节开头）。实测连续重试多次仍固定落在章节开头。
    // 改用 locations 中转 —— 其中的 cfi 由本书 DOM 生成，取回后必然可解析：
    //   percentageFromCfi(cfi) 只做 CFI 数值比较（不碰 DOM），
    //   display(percentage) 内部再走 cfiFromPercentage 拿回可解析的 cfi。
    const restoreLocation = (): Promise<void> => {
      const r = renditionRef.current as any
      if (!r) return Promise.resolve()
      const locations = (book as any).locations
      if (startLocation && locations?.total) {
        const pct = locations.percentageFromCfi(startLocation)
        console.log('[reading-progress] restore', {
          cfi: startLocation,
          total: locations.total,
          pct,
        })
        if (typeof pct === 'number' && pct > 0) {
          return Promise.resolve(r.display(pct) as any)
        }
      }
      // 新书从头 / 算不出百分比时退回直接按 cfi（或空目标）定位
      return Promise.resolve(r.display(startLocation || undefined) as any)
    }

    // 等 locations 生成完（percentageFromCfi 依赖它）再恢复；
    // onBookReady 负责触发 locations.generate，这里串起它的 promise。
    book.loaded.navigation
      .then(() => {
        if (disposed) return
        return cbRef.current.onBookReady?.(book, rendition)
      })
      .then(() => {
        if (disposed) return
        return restoreLocation()
      })
      .then(() => {
        if (disposed) return
        displayed = true
        isRestoring = false
        cbRef.current.onRestored?.()
        // 内核 start 完成后补一次重排（此时已落到恢复位置，relayout 会保留该位置）
        relayout()
      })
      .catch(() => {
        displayed = true
        isRestoring = false
        cbRef.current.onRestored?.()
      })

    window.addEventListener('resize', relayout)
    window.addEventListener('orientationchange', relayout)
    const ro = new ResizeObserver(relayout)
    ro.observe(holderRef.current)

    return () => {
      disposed = true
      window.removeEventListener('resize', relayout)
      window.removeEventListener('orientationchange', relayout)
      ro.disconnect()
      renditionRef.current?.destroy()
      renditionRef.current = null
      book.destroy()
      bookRef.current = null
    }
    // initialLocation 只在首次加载时生效，故不加入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url])

  // 主题切换
  useEffect(() => {
    renditionRef.current?.themes.select(themeKey)
  }, [themeKey])

  // 字号调整（不重建实例，保留阅读位置）
  useEffect(() => {
    renditionRef.current?.themes.fontSize(`${fontSize}px`)
  }, [fontSize])

  // 行高调整：重注册 default 主题即可原子更新，无需重建实例
  useEffect(() => {
    const r = renditionRef.current
    if (!r) return
    // 同一 key 再次注册是"追加"而非替换，先清掉旧节点，避免拖动滑杆时规则越积越多
    // getContents() 运行时返回数组，但 epubjs 的类型声明写的是单个 Contents，这里强转
    ;((r.getContents() as unknown) as any[]).forEach((c) => {
      c.document?.getElementById?.('epubjs-inserted-css-default')?.remove()
    })
    r.themes.register('default', buildTypographyRules(lineHeight) as any)
  }, [lineHeight])

  // 关闭查词弹层时把选中色块淡出再清掉：
  // 默认 setHighlight(null) 直接 textContent='' 硬切，体验突兀；
  // 这里给每个色块加 opacity transition，180ms 后再清 DOM。
  useEffect(() => {
    if (!clearHighlightSignal) return
    const doc = contentsDocRef.current
    if (!doc) return
    const layer = doc.getElementById(OVERLAY_ID) as HTMLElement | null
    if (!layer || !layer.children.length) return
    const boxes = Array.from(layer.children) as HTMLElement[]
    boxes.forEach((b) => {
      b.style.transition = 'opacity 180ms ease-out'
      // 强制 reflow 让上面的 transition 在下一帧生效
      // eslint-disable-next-line no-unused-expressions
      void b.offsetWidth
      b.style.opacity = '0'
    })
    const t = window.setTimeout(() => {
      const l = contentsDocRef.current?.getElementById?.(OVERLAY_ID) as
        | HTMLElement
        | null
      if (!l) return
      // 只清掉已淡出的（opacity:0）色块,保留淡出期间用户新长按画的高亮
      const faded = Array.from(l.children).filter(
        (b) => (b as HTMLElement).style.opacity === '0',
      )
      faded.forEach((b) => b.remove())
    }, 200)
    return () => window.clearTimeout(t)
  }, [clearHighlightSignal])

  return <div ref={holderRef} className="h-full w-full" />
}

export default EpubReader