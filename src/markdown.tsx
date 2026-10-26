import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

// Raw HTML in markdown is deliberately not rendered; only CommonMark plus GFM
// (tables, task lists, strikethrough, autolinks) becomes markup.
export function Markdown({ source }: { source: string }) {
  return (
    <div className="prose">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{source}</ReactMarkdown>
    </div>
  )
}
