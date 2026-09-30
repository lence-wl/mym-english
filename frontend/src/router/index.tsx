import {
  lazy,
  type LazyExoticComponent,
  type ReactElement,
  type FC,
} from 'react'

// 动态导入组件（使用 React.lazy）
const Login = lazy(() => import('../views/Login'))
const BaseReader = lazy(() => import('../views/BaseReader'))
const Vocabulary = lazy(() => import('../views/Vocabulary'))
const Sentence = lazy(() => import('../views/Sentence'))
const UserInfo = lazy(() => import('../views/UserInfo'))
const Bookshelf = lazy(() => import('../views/Bookshelf'))
const AddBoox = lazy(() => import('../views/AddBook'))

// 调整 RouterData 接口定义，适配懒加载组件类型
export interface RouterData {
  path: string // 路由路径
  name: string
  notMenu?: boolean
  // 正确定义懒加载组件类型
  component: LazyExoticComponent<FC<{}> | (() => ReactElement)>
}

const routerData: Array<RouterData> = [
  {
    path: '/',
    name: '阅读',
    component: BaseReader,
  },
  // {
  //   path: '/test',
  //   name: 'test',
  //   component: lazy(() => import('../views/TestPage')),
  // },
  {
    path: '/vocabulary',
    name: '单词',
    component: Vocabulary,
  },
  {
    path: '/sentence',
    name: '句子',
    component: Sentence,
  },
  {
    path: '/bookshelf',
    name: '书架',
    component: Bookshelf,
  },
  {
    path: '/me',
    name: '我的',
    component: UserInfo,
  },
  {
    path: '/addBook',
    name: '上传',
    component: AddBoox,
  },
  {
    path: '/login',
    notMenu: true,
    name: '登录',
    component: Login,
  },
]

export default routerData
