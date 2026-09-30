import React from 'react'
import SkeletonForLLM from '../components/SkeletonForLLM'
import { type State } from '../store'
interface WordProps {
  data: { p: string; d: string }
  loading: boolean
  themeConfig: State['themeConfig']
}

const Word: React.FC<WordProps> = ({ data, loading = true, themeConfig }) => {
  const renderContent = () => (
    <div>
      <div className="py-[10px]">{data.p}</div>
      <div>{data.d}</div>
    </div>
  )

  return (
    <div>
      {loading ? (
        <SkeletonForLLM isWord={true}></SkeletonForLLM>
      ) : (
        renderContent()
      )}
    </div>
  )
}

export default Word
