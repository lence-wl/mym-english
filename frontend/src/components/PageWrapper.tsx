import chroma from 'chroma-js'
import { readingColorConfig } from '../theme/themeConfig'
import useStore from '../store'
const PageWrapper = ({ children }: any) => {
  const state = useStore()
  return (
    <div
      style={{
        backgroundColor: chroma(
          readingColorConfig[state.themeConfig.theme].colorBgContainer
        )
          .alpha(0.8)
          .css('rgb'),
      }}
      className="p-7 box-border h-full w-full overflow-y-auto"
    >
      {children}
    </div>
  )
}

export default PageWrapper
