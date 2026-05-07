export function isElementVisible(element) {
  if (!(element instanceof HTMLElement)) {
    return false
  }

  const style = window.getComputedStyle(element)
  if (style.display === 'none' || style.visibility === 'hidden') {
    return false
  }

  return element.getClientRects().length > 0
}

export function getInputValues(selector) {
  return Array.from(document.querySelectorAll(selector))
    .filter((input) => input instanceof HTMLInputElement)
    .sort((a, b) => {
      const aVisible = isElementVisible(a)
      const bVisible = isElementVisible(b)
      if (aVisible === bVisible) {
        return 0
      }
      return aVisible ? -1 : 1
    })
    .map((input) => input.value.trim())
    .filter(Boolean)
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
