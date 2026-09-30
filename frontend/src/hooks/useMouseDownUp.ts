import { useEffect, useCallback } from 'react'

// 注意：这里使用的是原生 DOM 的 MouseEvent 类型，而非 React.MouseEvent
type NativeMouseEventHandler = (event: MouseEvent) => void

/**
 * 监听鼠标按下和抬起事件的 Hook（修正类型版本）
 * @param onMouseDown 鼠标按下时的回调函数（接收原生 DOM 事件）
 * @param onMouseUp 鼠标抬起时的回调函数（接收原生 DOM 事件）
 * @param options 事件监听选项（可选）
 */
const useMouseDownUp = (
  onMouseDown?: NativeMouseEventHandler,
  onMouseUp?: NativeMouseEventHandler,
  options?: boolean | AddEventListenerOptions
) => {
  // 缓存回调，避免依赖变化导致的重复绑定
  const handleMouseDown = useCallback<NativeMouseEventHandler>(
    (event) => {
      onMouseDown?.(event)
    },
    [onMouseDown]
  )

  const handleMouseUp = useCallback<NativeMouseEventHandler>(
    (event) => {
      onMouseUp?.(event)
    },
    [onMouseUp]
  )

  useEffect(() => {
    // 给 document 绑定原生事件（使用原生 MouseEvent 类型）
    document.addEventListener('mousedown', handleMouseDown, options)
    document.addEventListener('mouseup', handleMouseUp, options)

    // 解绑事件
    return () => {
      document.removeEventListener('mousedown', handleMouseDown, options)
      document.removeEventListener('mouseup', handleMouseUp, options)
    }
  }, [handleMouseDown, handleMouseUp, options])
}

export default useMouseDownUp
