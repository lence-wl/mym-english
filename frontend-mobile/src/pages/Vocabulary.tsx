import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RiPlayCircleLine } from '@remixicon/react'
import PageShell from '../components/PageShell'
import EntryList from '../components/EntryList'

const Vocabulary = () => {
  const navigate = useNavigate()
  /** 列表当前选中的词书，进入循环播放时带上同一本书 */
  const [bookId, setBookId] = useState<number | undefined>(undefined)

  return (
    <PageShell
      title="生词本"
      extra={
        <button
          className="p-2 no-select"
          aria-label="循环播放"
          onClick={() =>
            navigate(
              bookId ? `/vocabulary/play?bookId=${bookId}` : '/vocabulary/play',
            )
          }
        >
          <RiPlayCircleLine size={24} />
        </button>
      }
    >
      <EntryList isSentence={0} onBookChange={setBookId} />
    </PageShell>
  )
}

export default Vocabulary