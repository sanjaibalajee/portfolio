// Assign IDs at compile time, including unique suffixes for repeated headings.
export default function headingIds() {
  return tree => {
    const used = new Map()
    const text = node => node.type === 'text' || node.type === 'inlineCode' ? node.value : (node.children ?? []).map(text).join('')
    function visit(node) {
      if (node.type === 'heading' && node.depth > 1) {
        const base = text(node).toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-') || 'section'
        let id = base
        let suffix = 1
        while (used.has(id)) id = `${base}-${suffix++}`
        used.set(id, true)
        node.data = { ...node.data, hProperties: { ...node.data?.hProperties, id } }
      }
      node.children?.forEach(visit)
    }
    visit(tree)
  }
}
