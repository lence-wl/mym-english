import PageShell from '../components/PageShell'
import EntryList from '../components/EntryList'

const Sentence = () => (
  <PageShell title="句子本">
    <EntryList isSentence={1} />
  </PageShell>
)

export default Sentence