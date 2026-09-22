/**
 * Format amount as ₹1,49,999 (Indian currency with comma formatting)
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Format large amounts as ₹1.5L, ₹2.3Cr for compact display
 */
export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount}`
}

/**
 * Format price range for display: "₹300 – ₹1,000/day"
 */
export function formatINRRange(min: number, max: number): string {
  return `${formatINR(min)} – ${formatINR(max)}/day`
}

/**
 * Parse raw input string to number, removing all non-digits
 */
export function parseINRInput(value: string): number {
  const num = value.replace(/[^0-9]/g, '')
  return num ? parseInt(num, 10) : 0
}

/**
 * Format user input as they type (with currency formatting)
 */
export function formatINRInput(value: string): string {
  const num = parseINRInput(value)
  if (!num) return ''
  return formatINR(num)
}

/**
 * Apply Indian pricing psychology: 1000 → 999, 2000 → 1999, etc.
 * Rounds down to nearest 9 for amounts ending in 00
 */
export function toPsychologyPrice(amount: number): number {
  // Only apply psychology pricing to amounts ending in 00 and > 100
  if (amount % 100 === 0 && amount > 100) {
    return amount - 1
  }
  return amount
}
