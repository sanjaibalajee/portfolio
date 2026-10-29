import { createProcessor } from '@mdx-js/mdx'
import { toMarkdown } from 'mdast-util-to-markdown'
import type { Root } from 'mdast'

type Expression = {
  type: string
  value?: unknown
  body?: Expression[]
  expression?: Expression
  elements?: Expression[]
  children?: Expression[]
  expressions?: Expression[]
  quasis?: { value: { cooked?: string; raw: string } }[]
}

type Node = {
  type: string
  name?: string | null
  value?: string
  url?: string
  children?: Node[]
  attributes?: { name?: string; value?: string | null | { data?: { estree?: Expression } } }[]
  data?: { estree?: Expression }
  [key: string]: unknown
}

export type ComponentRenderer = (props: Record<string, unknown>, children: string) => string

// Read literal MDX values only. Imports, calls and interpolated code are never run.
function literal(node: Expression | undefined): unknown {
  if (!node) return undefined
  if (node.type === 'Program') return literal(node.body?.[0]?.expression)
  if (node.type === 'Literal' || node.type === 'JSXText') return node.value
  if (node.type === 'ArrayExpression') return node.elements?.map(literal)
  if (node.type === 'TemplateLiteral' && !node.expressions?.length) return node.quasis?.map(part => part.value.cooked ?? part.value.raw).join('')
  if (node.type === 'JSXExpressionContainer') return literal(node.expression)
  if (node.type === 'JSXFragment' || node.type === 'JSXElement') return node.children?.map(literal).filter(value => typeof value === 'string').join(' ').replace(/\s+/g, ' ').trim()
  return undefined
}

const blockTypes = new Set(['paragraph', 'heading', 'blockquote', 'list', 'code', 'thematicBreak', 'definition'])

function blocks(nodes: Node[]) {
  const result: Node[] = []
  let inline: Node[] = []
  function flush() {
    if (inline.some(node => node.type !== 'text' || node.value?.trim())) result.push({ type: 'paragraph', children: inline })
    inline = []
  }
  for (const node of nodes) {
    if (blockTypes.has(node.type)) { flush(); result.push(node) }
    else inline.push(node)
  }
  flush()
  return result
}

export function mdxMarkdown(source: string, baseUrl: URL, components: Record<string, ComponentRenderer> = {}) {
  const parser = createProcessor()
  const absolute = (url: string) => new URL(url, baseUrl).href
  const print = (nodes: Node[]) => toMarkdown({ type: 'root', children: blocks(nodes) } as Root, { fences: true, bullet: '-' })
  const inline = (nodes: Node[]): Node[] => nodes.flatMap(node => node.type === 'paragraph' ? node.children ?? [] : [node])

  function convert(node: Node): Node[] {
    if (node.type === 'mdxjsEsm') return []
    if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression') {
      const value = literal(node.data?.estree)
      return typeof value === 'string' ? [{ type: 'text', value }] : []
    }
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const props: Record<string, unknown> = {}
      for (const attribute of node.attributes ?? []) {
        if (!attribute.name) continue
        props[attribute.name] = attribute.value === null ? true : typeof attribute.value === 'string' ? attribute.value : literal(attribute.value?.data?.estree)
      }
      const children = (node.children ?? []).flatMap(convert)
      const name = node.name ?? ''
      if (name === 'script' || name === 'style') return []
      if (components[name]) {
        const replacement = components[name](props, print(children))
        return (parser.parse(replacement).children as unknown as Node[]).flatMap(convert)
      }
      if (name === 'DiffBlock') return [{ type: 'code', lang: 'diff', value: children.map(child => child.value ?? '').join('') }]
      if (name === 'BigQuote') return [{ type: 'blockquote', children: blocks(children) }]
      if (name === 'Image' || name === 'img') return typeof props.src === 'string' ? [{ type: 'image', url: absolute(props.src), alt: String(props.alt ?? '') }] : []
      if (name === 'a' && typeof props.href === 'string') return [{ type: 'link', url: absolute(props.href), children: inline(children) }]
      if (name === 'br') return [{ type: 'break' }]
      if (name === 'hr') return [{ type: 'thematicBreak' }]
      if (name === 'strong' || name === 'b') return [{ type: 'strong', children: inline(children) }]
      if (name === 'em' || name === 'i') return [{ type: 'emphasis', children: inline(children) }]
      if (name === 'p' || name === 'figcaption' || name === 'div' || name === 'figure' || name === 'aside') return blocks(children)
      if (/^[A-Z]/.test(name) && !children.length) throw new Error(`Missing Markdown renderer for ${name}`)
      return children
    }
    const result = { ...node }
    if (node.children) result.children = node.children.flatMap(convert)
    if (node.url) result.url = absolute(node.url)
    return [result]
  }

  const tree = parser.parse(source)
  return print((tree.children as unknown as Node[]).flatMap(convert))
}
