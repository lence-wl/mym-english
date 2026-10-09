import PageShell from '../components/PageShell'
import EntryList from '../components/EntryList'

const Vocabulary = () => (
  <PageShell title="生词本">
    <EntryList isSentence={0} />
  </PageShell>
)

export default Vocabulary