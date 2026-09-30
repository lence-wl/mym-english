import React, { useState, useEffect } from 'react'

// 定义与 Dart 代码中 WebViewJsBridge 对应的接口
interface JsBridge {
  postMessage: (message: string) => void
  showToast: (message: string) => void
  getLocation: () => void
  getNetworkStatus: () => void
  takePicture: () => void
  recordVideo: () => void
  closePage: () => void
  // 用于接收来自 Dart 的消息
  onMessage?: (message: string) => void
}

// 扩展 window 对象，添加 jsBridge 属性
declare global {
  interface Window {
    jsBridge: JsBridge
  }
}

const WebViewJsBridgeTest: React.FC = () => {
  const [status, setStatus] = useState('就绪')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // 监听页面加载完成事件
    window.addEventListener('DOMContentLoaded', handlePageLoaded)

    // 清理函数
    return () => {
      window.removeEventListener('DOMContentLoaded', handlePageLoaded)
      // 移除可能添加的 jsBridge.onMessage 监听器
      if (window.jsBridge) {
        window.jsBridge.onMessage = undefined
      }
    }
  }, [])

  const handlePageLoaded = () => {
    setStatus('页面已加载')

    // 检查 jsBridge 是否存在
    if (window.jsBridge) {
      setStatus('JS Bridge 已就绪')

      // 设置消息处理函数
      window.jsBridge.onMessage = (message) => {
        return
        try {
          const response = JSON.parse(message)
          setLoading(false)

          if (response.data.error) {
            setResult(`操作失败: ${response.data.error}`)
          } else {
            // 根据 requestId 前缀判断响应类型
            const requestType = response.requestId?.split('_')[0]
            switch (requestType) {
              case 'loc':
                setResult(
                  `位置信息:\n纬度: ${response.data.latitude}\n经度: ${response.data.longitude}`
                )
                break
              case 'net':
                setResult(
                  `网络状态:\n状态: ${response.data.status}\n描述: ${response.data.description}`
                )
                break
              case 'pic':
                setResult(
                  `拍照成功:\n路径: ${
                    response.data.imagePath
                  }\n大小: ${formatFileSize(response.data.fileSize)}`
                )
                break
              case 'vid':
                setResult(
                  `录制视频成功:\n路径: ${
                    response.data.videoPath
                  }\n大小: ${formatFileSize(response.data.fileSize)}`
                )
                break
              default:
                setResult(`未知响应类型: ${JSON.stringify(response)}`)
            }
          }
        } catch (error) {
          console.error('解析消息失败:', error)
          setResult(`解析消息失败: ${error}`)
        }
      }
    } else {
      setStatus('JS Bridge 未找到，请确保 WebView 已正确初始化')
    }
  }

  // 辅助函数：格式化文件大小
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 测试函数
  const testTakePicture = () => {
    setLoading(true)
    setResult('')
    setStatus('正在调用拍照功能...')
    window.jsBridge.takePicture()
  }

  const testRecordVideo = () => {
    setLoading(true)
    setResult('')
    setStatus('正在调用录制视频功能...')
    window.jsBridge.recordVideo()
  }

  const testGetLocation = () => {
    setLoading(true)
    setResult('')
    setStatus('正在获取位置信息...')
    window.jsBridge.getLocation()
  }

  const testGetNetworkStatus = () => {
    setLoading(true)
    setResult('')
    setStatus('正在获取网络状态...')
    window.jsBridge.getNetworkStatus()
  }

  const testShowToast = () => {
    window.jsBridge.showToast('这是一个测试 Toast 消息')
    setResult('已发送 Toast 请求')
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <h1 className="text-2xl font-bold mb-6 text-center">
        WebView JSBridge 测试页面
      </h1>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">状态</h2>
        <p className="bg-gray-100 p-4 rounded-lg min-h-[60px]">
          {loading ? <span className="animate-pulse">加载中...</span> : status}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">结果</h2>
        <pre className="bg-gray-100 p-4 rounded-lg min-h-[120px] overflow-auto">
          {result || '暂无结果'}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={testTakePicture}
          disabled={loading}
        >
          拍照
        </button>

        <button
          className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={testRecordVideo}
          disabled={loading}
        >
          录制视频
        </button>

        <button
          className="bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={testGetLocation}
          disabled={loading}
        >
          获取位置
        </button>

        <button
          className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={testGetNetworkStatus}
          disabled={loading}
        >
          获取网络状态
        </button>

        <button
          className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={testShowToast}
          disabled={loading}
        >
          显示 Toast
        </button>

        <button
          className="bg-red-500 hover:bg-red-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105"
          onClick={() => window.jsBridge.closePage()}
          disabled={loading}
        >
          关闭页面
        </button>
      </div>
    </div>
  )
}

export default WebViewJsBridgeTest
