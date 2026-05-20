interface AccountItem {
  code: string
  nameKo: string
  nameRu: string
  type: string
  keywords: string
}

export function classify(description: string, items: AccountItem[]): AccountItem | null {
  if (!description.trim()) return null

  const lower = description.toLowerCase()
  const expenseItems = items.filter(i => i.type === 'expense')

  let bestMatch: AccountItem | null = null
  let bestScore = 0

  for (const item of expenseItems) {
    let keywords: string[] = []
    try { keywords = JSON.parse(item.keywords) } catch { continue }

    let score = 0
    for (const kw of keywords) {
      if (lower.includes(kw.toLowerCase())) score += kw.length
    }
    if (score > bestScore) {
      bestScore = score
      bestMatch = item
    }
  }

  return bestScore > 0 ? bestMatch : null
}
