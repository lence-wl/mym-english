import ReactDOM from 'react-dom/client'
import '@ant-design/v5-patch-for-react-19'
import zhCN from 'antd/locale/zh_CN'
import { ConfigProvider } from 'antd'
import 'antd/dist/reset.css'
import './index.css'
import App from './App'
import { registerSW } from 'virtual:pwa-register'

// 注册 Service Worker：仅缓存应用外壳，离线可打开但不缓存书籍内容
registerSW({ immediate: true })

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <ConfigProvider locale={zhCN}>
    <App />
  </ConfigProvider>,
)