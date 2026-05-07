export function normalizeUserId(value) {
  return String(value || '')
    .replace(/[^0-9A-Za-z_-]/g, '')
    .trim()
}

export function getCurrentUserId() {
  const selectors = [
    '.logout-subtitle.ng-binding.ng-scope',
    '.logout-subtitle',
  ]

  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector))
    for (const node of nodes) {
      const value = normalizeUserId(node.textContent || '')
      if (value) {
        return value
      }
    }
  }

  return ''
}

export function getCurrentUserDisplayName() {
  const selectors = [
    'span.capitalize.ng-binding.ng-scope',
    '[data-ng-if="headerCtrl.getAuthSession().displayName"]',
  ]

  for (const selector of selectors) {
    const nodes = Array.from(document.querySelectorAll(selector))
    for (const node of nodes) {
      const text = (node.textContent || '').trim()
      if (text) {
        return text
      }
    }
  }

  return ''
}
