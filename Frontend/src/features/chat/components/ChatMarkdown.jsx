import React from 'react'

const headingPattern = /^(#{1,6})\s+(.+)$/
const unorderedListPattern = /^[-*+]\s+(.+)$/
const orderedListPattern = /^\d+\.\s+(.+)$/
const blockquotePattern = /^>\s?(.+)$/

const isTableSeparator = (line) => /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(line.trim())

const splitTableCells = (line) =>
  line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim())

const renderInline = (text, keyPrefix = 'inline') => {
  const tokens = []
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_)/g
  let lastIndex = 0
  let match
  let key = 0

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(text.slice(lastIndex, match.index))
    }

    const token = match[0]
    const tokenKey = `${keyPrefix}-${key}`

    if (token.startsWith('`')) {
      tokens.push(<code key={tokenKey}>{token.slice(1, -1)}</code>)
    } else if (token.startsWith('**') || token.startsWith('__')) {
      tokens.push(<strong key={tokenKey}>{token.slice(2, -2)}</strong>)
    } else {
      tokens.push(<em key={tokenKey}>{token.slice(1, -1)}</em>)
    }

    lastIndex = pattern.lastIndex
    key += 1
  }

  if (lastIndex < text.length) {
    tokens.push(text.slice(lastIndex))
  }

  return tokens.length > 0 ? tokens : [text]
}

const parseBlocks = (content) => {
  const lines = String(content || '')
    .replace(/\r/g, '')
    .split('\n')
  const blocks = []

  for (let index = 0; index < lines.length; ) {
    const line = lines[index]
    const trimmed = line.trim()

    if (!trimmed) {
      index += 1
      continue
    }

    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const codeLines = []
      index += 1

      while (index < lines.length && !lines[index].trim().startsWith('```')) {
        codeLines.push(lines[index])
        index += 1
      }

      if (index < lines.length) {
        index += 1
      }

      blocks.push({ type: 'code', language, content: codeLines.join('\n') })
      continue
    }

    const headingMatch = trimmed.match(headingPattern)

    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        content: headingMatch[2],
      })
      index += 1
      continue
    }

    if (trimmed.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1])) {
      const headers = splitTableCells(trimmed)
      const rows = []
      index += 2

      while (index < lines.length && lines[index].trim().includes('|')) {
        rows.push(splitTableCells(lines[index]))
        index += 1
      }

      blocks.push({ type: 'table', headers, rows })
      continue
    }

    const unorderedMatch = trimmed.match(unorderedListPattern)

    if (unorderedMatch) {
      const items = []

      while (index < lines.length) {
        const match = lines[index].trim().match(unorderedListPattern)

        if (!match) {
          break
        }

        items.push(match[1])
        index += 1
      }

      blocks.push({ type: 'list', ordered: false, items })
      continue
    }

    const orderedMatch = trimmed.match(orderedListPattern)

    if (orderedMatch) {
      const items = []

      while (index < lines.length) {
        const match = lines[index].trim().match(orderedListPattern)

        if (!match) {
          break
        }

        items.push(match[1])
        index += 1
      }

      blocks.push({ type: 'list', ordered: true, items })
      continue
    }

    const blockquoteMatch = trimmed.match(blockquotePattern)

    if (blockquoteMatch) {
      const quotes = []

      while (index < lines.length) {
        const match = lines[index].trim().match(blockquotePattern)

        if (!match) {
          break
        }

        quotes.push(match[1])
        index += 1
      }

      blocks.push({ type: 'blockquote', content: quotes.join(' ') })
      continue
    }

    const paragraphLines = []

    while (index < lines.length) {
      const currentLine = lines[index]
      const currentTrimmed = currentLine.trim()

      if (
        !currentTrimmed ||
        currentTrimmed.startsWith('```') ||
        headingPattern.test(currentTrimmed) ||
        unorderedListPattern.test(currentTrimmed) ||
        orderedListPattern.test(currentTrimmed) ||
        blockquotePattern.test(currentTrimmed) ||
        (currentTrimmed.includes('|') && index + 1 < lines.length && isTableSeparator(lines[index + 1]))
      ) {
        break
      }

      paragraphLines.push(currentTrimmed)
      index += 1
    }

    if (paragraphLines.length > 0) {
      blocks.push({ type: 'paragraph', content: paragraphLines.join(' ') })
      continue
    }

    index += 1
  }

  return blocks
}

const renderBlock = (block, index) => {
  if (block.type === 'heading') {
    const HeadingTag = `h${Math.min(block.level, 6)}`
    return <HeadingTag key={`heading-${index}`}>{renderInline(block.content, `heading-${index}`)}</HeadingTag>
  }

  if (block.type === 'code') {
    return (
      <pre className="chat-markdown__pre" key={`code-${index}`}>
        <code>{block.content}</code>
      </pre>
    )
  }

  if (block.type === 'list') {
    const ListTag = block.ordered ? 'ol' : 'ul'
    return (
      <ListTag key={`list-${index}`}>
        {block.items.map((item, itemIndex) => (
          <li key={`list-${index}-${itemIndex}`}>{renderInline(item, `list-${index}-${itemIndex}`)}</li>
        ))}
      </ListTag>
    )
  }

  if (block.type === 'blockquote') {
    return <blockquote key={`quote-${index}`}>{renderInline(block.content, `quote-${index}`)}</blockquote>
  }

  if (block.type === 'table') {
    return (
      <div className="chat-markdown__table-wrap" key={`table-${index}`}>
        <table>
          <thead>
            <tr>
              {block.headers.map((header, headerIndex) => (
                <th key={`table-head-${index}-${headerIndex}`}>{renderInline(header, `table-head-${index}-${headerIndex}`)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`table-row-${index}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`table-cell-${index}-${rowIndex}-${cellIndex}`}>
                    {renderInline(cell, `table-cell-${index}-${rowIndex}-${cellIndex}`)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return <p key={`paragraph-${index}`}>{renderInline(block.content, `paragraph-${index}`)}</p>
}

/**
 * Lightweight markdown renderer for AI responses without adding a new dependency.
 */
function ChatMarkdown({ content }) {
  const blocks = parseBlocks(content)

  return <div className="chat-markdown">{blocks.map(renderBlock)}</div>
}

export default ChatMarkdown
