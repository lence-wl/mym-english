import React, { useState, useEffect, useRef, type CSSProperties } from 'react'
import styled from 'styled-components'
import Epub, { type Book } from 'epubjs'
import type { NavItem, Contents, Rendition, Location } from 'epubjs'

export type IReactReaderProps = {
  url: string | ArrayBuffer
  tocChanged?: (toc: NavItem[]) => void // 目录数据改变
  locationChanged?: (loc: string) => void // 章节改变
  loadingView?: React.ReactNode // 加载中dom
  location: string | number | null
  getRendition?: (rendition: Rendition) => void
  epubInitOptions?: any
  epubOptions?: any
  showToc?: boolean
  bgColor: string
  handleKeyPress?: () => void
  handleTextSelected?: (cfiRange: string, contents: Contents) => void
  initialWidth?: string | number // 外部传入初始宽度（可选）
}

const defaultStyles = {
  viewHolder: {
    position: 'relative',
    height: '100%',
    width: '100%',
  },
  view: {
    height: '100%',
  },
}

// 主组件
export const ReactReader: React.FC<IReactReaderProps> = (props) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [toc, setToc] = useState<NavItem[]>([])

  const {
    initialWidth,
    loadingView,
    locationChanged,
    url,
    location,
    getRendition,
    epubInitOptions,
    epubOptions,
    handleTextSelected,
    tocChanged,
    bgColor,
  } = props

  const viewerRef = useRef<HTMLDivElement>(null)
  const bookRef = useRef<Book | null>(null)
  const renditionRef = useRef<Rendition | null>(null)
  const locationRef = useRef<any>('')
  // 新增：记录当前阅读位置，宽度变化后恢复
  const currentLocationRef = useRef<string | number | null>(null)

  // 位置变化回调：记录当前位置
  const onLocationChange = (loc: Location) => {
    const newLocation = `${loc.start}`
    currentLocationRef.current = newLocation // 保存当前位置
    if (location !== newLocation) {
      locationRef.current = newLocation
      locationChanged && locationChanged(newLocation)
    }
  }

  // 销毁旧的Rendition实例（关键修复）
  const destroyRendition = () => {
    if (renditionRef.current) {
      // 移除事件监听
      renditionRef.current.off('locationChanged', onLocationChange)
      if (handleTextSelected) {
        renditionRef.current.off('selected', handleTextSelected)
      }
      // 销毁实例（会移除对应的iframe）
      renditionRef.current.destroy()
      renditionRef.current = null
      // 清空viewer容器，避免残留iframe
      if (viewerRef.current) {
        viewerRef.current.innerHTML = ''
      }
    }
  }

  // 加载书籍
  const initBook = () => {
    // 先销毁旧书籍实例
    if (bookRef.current) {
      bookRef.current.destroy()
      bookRef.current = null
    }
    // 销毁旧渲染实例
    destroyRendition()

    bookRef.current = Epub(url, epubInitOptions)

    bookRef.current.loaded.navigation.then(({ toc }: any) => {
      setIsLoaded(true)
      setToc([...toc])
      tocChanged && tocChanged(toc)
    })
  }

  // 注册事件
  const registerEvents = () => {
    if (renditionRef.current) {
      renditionRef.current.on('locationChanged', onLocationChange)
      if (handleTextSelected) {
        renditionRef.current.on('selected', handleTextSelected)
      }
    }
  }

  // 初始化阅读器（优化：先销毁旧实例）
  const initReader = () => {
    if (!viewerRef.current || !bookRef.current) return

    // 关键步骤：初始化前先销毁旧的Rendition，避免多iframe
    destroyRendition()

    const node = viewerRef.current
    const rendition = bookRef.current.renderTo(node, {
      width: initialWidth,
      height: '100%',
      flow: 'scrolled',
      manager: 'continuous',
      requestCredentials: 'include',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      allowScriptedContent: true,
      ...epubOptions,
    })

    renditionRef.current = rendition

    // 注册主题
    renditionRef.current.themes.register('darkTheme', {
      body: {
        backgroundColor: '#1a1a1a',
        color: '#e0e0e0',
        fontSize: '16px',
        lineHeight: '1.8',
      },
      'h1, h2, h3': {
        color: '#fff',
        fontWeight: 'bold',
      },
      a: {
        color: '#64b5f6',
        textDecoration: 'none',
      },
    })

    renditionRef.current.themes.register('lightTheme', {
      body: {
        backgroundColor: '#fff',
        color: '#333',
        fontSize: '16px',
        lineHeight: '1.8',
      },
      'h1, h2, h3': {
        color: '#222',
        fontWeight: 'bold',
      },
      a: {
        color: '#2196f3',
        textDecoration: 'none',
      },
    })

    registerEvents()
    getRendition && getRendition(rendition)

    // 优先恢复当前阅读位置，其次用props传入的location，最后用默认目录
    const targetLocation =
      currentLocationRef.current ||
      location ||
      (toc.length > 0 ? toc[0].href : null)
    if (targetLocation) {
      rendition.display(targetLocation + '')
    } else {
      rendition.display()
    }
  }

  // 宽度变化时，仅更新尺寸无需重建实例（优化性能）
  useEffect(() => {
    if (renditionRef.current && isLoaded) {
      // 优先使用rendition的resize方法更新尺寸（无需重建实例）
      renditionRef.current.resize(
        initialWidth as number,
        100 as unknown as number
      )
    }
  }, [initialWidth, isLoaded])

  // 书籍URL变化时，重新加载书籍
  useEffect(() => {
    initBook()
    // 重置当前位置
    currentLocationRef.current = null
  }, [url, epubInitOptions])

  // 书籍加载完成后，初始化阅读器
  useEffect(() => {
    if (isLoaded) {
      initReader()
    }
  }, [isLoaded, initialWidth, epubOptions]) // 依赖宽度和渲染选项

  // 组件卸载时，彻底销毁实例
  useEffect(() => {
    return () => {
      destroyRendition()
      if (bookRef.current) {
        bookRef.current.destroy()
      }
    }
  }, [])

  return (
    <Style>
      <div
        style={{ backgroundColor: bgColor }}
        className="absolute inset-0 flex justify-center"
      >
        {isLoaded ? (
          <div
            ref={viewerRef}
            style={{
              ...defaultStyles.view,
              width: '100%',
              margin: '0 auto',
              display: 'flex',
              justifyContent: 'center',
            }}
          ></div>
        ) : (
          loadingView || <div>Loading…</div>
        )}
      </div>
    </Style>
  )
}

const Style = styled.div`
  .width-control {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 100;
    display: flex;
    gap: 8px;
    button {
      padding: 4px 8px;
      border: 1px solid #ddd;
      border-radius: 4px;
      background: #fff;
      cursor: pointer;
      &:hover {
        background: #f5f5f5;
      }
    }
  }

  .absolute.inset-0 {
    overflow: auto;
    background: #fafafa;
  }
`
