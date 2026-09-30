/**
 * 计算弹窗相对于iframe内选中文本的最佳显示位置
 * @param {Selection} selection - iframe内的Selection对象（选中文本）
 * @param {HTMLIFrameElement} iframe - 包含选中文本的iframe元素
 * @param {number} popupWidth - 弹窗宽度
 * @param {number} popupHeight - 弹窗高度
 * @returns {Object} 最终弹窗位置信息 { top, left, direction }
 */
export function calculatePopupPosition(
  selection: any,
  iframe: any,
  popupWidth: any,
  popupHeight: any
) {
  // 1. 基础校验
  if (!selection || !iframe || !popupWidth || !popupHeight) {
    throw new Error(
      '参数不完整：需提供selection、iframe、popupWidth、popupHeight'
    )
  }

  // 2. 获取核心坐标
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect() // 选中文本在iframe内的相对坐标
  const iframeRect = iframe.frameElement!.getBoundingClientRect() // iframe在主窗口的绝对坐标

  // 选中文本在主窗口中的绝对坐标
  const selectionAbs = {
    top: rect.top + iframeRect.top,
    left: rect.left + iframeRect.left,
    width: rect.width,
    height: rect.height,
    bottom: rect.bottom + iframeRect.top,
    right: rect.right + iframeRect.left,
  }

  // 3. 获取当前视口范围（处理滚动）
  const viewport = {
    top: window.scrollY,
    left: window.scrollX,
    width: window.innerWidth,
    height: window.innerHeight,
    bottom: window.scrollY + window.innerHeight,
    right: window.scrollX + window.innerWidth,
  }

  // 4. 定义弹窗位置计算规则（按优先级）
  const positions = [
    {
      direction: 'bottom',
      getPosition: () => ({
        top: selectionAbs.bottom + 10,
        left: selectionAbs.left,
      }),
    },
    {
      direction: 'top',
      getPosition: () => ({
        top: selectionAbs.top - popupHeight - 10,
        left: selectionAbs.left,
      }),
    },
    {
      direction: 'right',
      getPosition: () => ({
        top: selectionAbs.top,
        left: selectionAbs.right + 10,
      }),
    },
    {
      direction: 'left',
      getPosition: () => ({
        top: selectionAbs.top,
        left: selectionAbs.left - popupWidth - 10,
      }),
    },
  ]

  // 5. 查找第一个完全在视口内的位置
  let finalPosition = null
  for (const pos of positions) {
    const { top, left } = pos.getPosition()
    const isInViewport =
      top >= viewport.top &&
      left >= viewport.left &&
      top + popupHeight <= viewport.bottom &&
      left + popupWidth <= viewport.right

    if (isInViewport) {
      finalPosition = {
        width: rect.width,
        height: rect.height,
        top,
        left,
        direction: pos.direction,
      }
      break
    }
  }

  // 6. 降级处理：所有方向都超出时使用默认底部
  if (!finalPosition) {
    finalPosition = {
      ...positions[0].getPosition(),
      width: rect.width,
      height: rect.height,
      direction: 'bottom',
    }
  }

  // 7. 边界优化：确保左右不超出视口
  if (finalPosition.left < viewport.left) {
    finalPosition.left = viewport.left + 10
  }
  if (finalPosition.left + popupWidth > viewport.right) {
    finalPosition.left = viewport.right - popupWidth - 10
  }

  return finalPosition
}
