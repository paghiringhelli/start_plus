function normalizeNameText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

function tokenizeName(value) {
  return normalizeNameText(value)
    .split(/\s+/)
    .filter(Boolean)
}

export function findBestMatchingDatasetItem(dataset, userDisplayName) {
  const userTokens = tokenizeName(userDisplayName)
  if (userTokens.length === 0) {
    return null
  }

  const userTokenSet = new Set(userTokens)
  const normalizedUser = normalizeNameText(userDisplayName)
  const sortedUserTokens = [...userTokenSet].sort().join(' ')
  let bestMatch = null

  for (const item of dataset) {
    const labelTokens = tokenizeName(item.label)
    if (labelTokens.length === 0) {
      continue
    }

    const labelTokenSet = new Set(labelTokens)
    const commonCount = [...userTokenSet].filter((token) => labelTokenSet.has(token)).length
    if (commonCount === 0) {
      continue
    }

    const userCoverage = commonCount / userTokenSet.size
    const labelCoverage = commonCount / labelTokenSet.size
    let score = (userCoverage * 0.7) + (labelCoverage * 0.3)
    const normalizedLabel = normalizeNameText(item.label)
    const sortedLabelTokens = [...labelTokenSet].sort().join(' ')

    if (normalizedLabel === normalizedUser) {
      score += 1
    } else if (sortedLabelTokens === sortedUserTokens) {
      score += 0.5
    }

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        item,
        score,
        commonCount,
        userCoverage,
        labelCoverage,
      }
    }
  }

  if (!bestMatch) {
    return null
  }

  const isStrongMatch = (
    (bestMatch.commonCount >= 2 && bestMatch.userCoverage >= 0.66 && bestMatch.score >= 0.75) ||
    (bestMatch.userCoverage === 1 && bestMatch.labelCoverage >= 0.5)
  )

  if (!isStrongMatch) {
    return null
  }

  return bestMatch.item
}

export function findDatasetItemByLabel(dataset, rawLabel) {
  const normalizedLabel = normalizeNameText(rawLabel)
  if (!normalizedLabel) {
    return null
  }

  return dataset.find((item) => normalizeNameText(item.label) === normalizedLabel) || null
}
