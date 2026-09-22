# India-Specific Patterns — visualflow_frontend

## Price Formatting

```ts
// src/utils/indianFormat.ts

export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
  // → ₹1,49,999
}

export function formatINRCompact(amount: number): string {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`
  return `₹${amount}`
  // → ₹2.3Cr, ₹1.5L, ₹45K
}

export function formatINRInput(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return formatINR(Number(num))
}
```

## PriceDisplay Component

```tsx
interface PriceDisplayProps {
  price: number
  compareAtPrice?: number
  size?: 'sm' | 'md' | 'lg'
}

export function PriceDisplay({ price, compareAtPrice, size = 'md' }: PriceDisplayProps) {
  const isOnSale = compareAtPrice && compareAtPrice > price
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className={cn(
        'font-semibold text-zinc-900',
        size === 'sm' && 'text-sm',
        size === 'md' && 'text-base',
        size === 'lg' && 'text-xl',
      )}>
        {formatINR(price)}
      </span>
      {isOnSale && (
        <span className="text-xs text-zinc-400 line-through">
          {formatINR(compareAtPrice)}
        </span>
      )}
      {isOnSale && (
        <Badge variant="success" size="sm">
          {Math.round((1 - price / compareAtPrice) * 100)}% off
        </Badge>
      )}
    </div>
  )
}
```

## IST Date Utilities

```ts
// src/utils/dateUtils.ts
import { format, formatDistanceToNow } from 'date-fns'

const IST_OFFSET = 5.5 * 60 * 60 * 1000

export function toIST(date: Date | string): Date {
  const d = new Date(date)
  return new Date(d.getTime() + IST_OFFSET)
}

export function formatIST(date: Date | string, fmt = 'dd MMM yyyy, hh:mm a'): string {
  return format(toIST(date), fmt)
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
```

## Trust Signals Component

```tsx
const TRUST_SIGNALS = [
  { icon: '🚚', text: 'Free Delivery Across India' },
  { icon: '💳', text: 'COD Available' },
  { icon: '↩️', text: 'Easy 7-Day Returns' },
  { icon: '🇮🇳', text: 'Made in India' },
] as const

export function TrustSignals({ selected }: { selected: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {TRUST_SIGNALS.filter(s => selected.includes(s.text)).map(signal => (
        <span key={signal.text}
          className="flex items-center gap-1 text-xs bg-surface-100 
            text-zinc-600 px-2 py-1 rounded-full">
          {signal.icon} {signal.text}
        </span>
      ))}
    </div>
  )
}
```
