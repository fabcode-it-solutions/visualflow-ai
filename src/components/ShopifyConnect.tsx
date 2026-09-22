import { useState } from 'react'
import { motion } from 'framer-motion'
import { Store } from 'lucide-react'
import { Card } from '@ui/Card'
import { Input } from '@ui/Input'
import { Button } from '@ui/Button'
import { cn } from '@utils/cn'
import { Logo } from '@/components/shared/Logo'

function normalizeDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  if (!trimmed) return ''
  // Strip protocol/path if pasted as full URL
  const stripped = trimmed.replace(/^https?:\/\//, '').split('/')[0]
  // Remove .myshopify.com suffix if already present so we can re-add cleanly
  const slug = stripped.replace(/\.myshopify\.com$/, '')
  return `${slug}.myshopify.com`
}

function validateDomain(raw: string): string | null {
  if (!raw.trim()) return 'Store domain is required'
  const normalized = normalizeDomain(raw)
  // slug must be 3–60 chars, alphanumeric + hyphens, no leading/trailing hyphen
  const slug = normalized.replace(/\.myshopify\.com$/, '')
  if (!/^[a-z0-9][a-z0-9-]{1,58}[a-z0-9]$/.test(slug)) {
    return 'Enter a valid store name (e.g. my-store or my-store.myshopify.com)'
  }
  return null
}

export function ShopifyConnect() {
  const [value, setValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const validationError = validateDomain(value)
    if (validationError) {
      setError(validationError)
      return
    }
    setError(null)
    setLoading(true)
    const shop = normalizeDomain(value)
    window.location.href = `/api/shopify/auth?shop=${shop}`
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setValue(e.target.value)
    if (error) setError(null)
  }

  return (
    <div
      className={cn(
        'min-h-screen bg-surface-50 flex items-center justify-center',
        'px-4 py-8 safe-top safe-bottom',
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-sm"
      >
        {/* Logo / brand mark */}
        <div className="flex flex-col items-center gap-3 mb-8">
          <Logo size="xl" showText={false} />
          <div className="text-center">
            <Logo size="md" showText={true} textColor="dark" className="justify-center mb-1" />
            <p className="text-sm text-zinc-500 mt-0.5">
              Connect your Shopify store to get started
            </p>
          </div>
        </div>

        <Card padding="lg">
          <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-1">
              <h2 className="font-display font-semibold text-base text-zinc-800">
                Enter your store domain
              </h2>
              <p className="text-sm text-zinc-500">
                You can enter just your store name or the full{' '}
                <span className="text-zinc-700 font-medium">.myshopify.com</span> address.
              </p>
            </div>

            <Input
              label="Shopify store"
              placeholder="your-store or your-store.myshopify.com"
              value={value}
              onChange={handleChange}
              error={error ?? undefined}
              helperText={
                value && !error
                  ? `Will connect to: ${normalizeDomain(value)}`
                  : undefined
              }
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              disabled={loading}
              leftIcon={
                <Store className="w-4 h-4" />
              }
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              loading={loading}
              className="w-full"
            >
              {loading ? 'Connecting…' : 'Connect Store'}
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-zinc-400 mt-6">
          You'll be redirected to Shopify to authorise access.
        </p>
      </motion.div>
    </div>
  )
}
