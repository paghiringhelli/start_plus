let dismissedByUser = false

export function isOverlayDismissed() {
  return dismissedByUser
}

export function setOverlayDismissed(value) {
  dismissedByUser = Boolean(value)
}
