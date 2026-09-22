# Shopify App Bridge — visualflow_frontend

## What App Bridge Does
Connects our React app (running in iframe) to the Shopify Admin shell.
Provides: session tokens, navigation, toast, loading bar.

## AppBridgeProvider Setup

Read host from URL params — Shopify passes it on every load:

```tsx
// src/providers/AppBridgeProvider.tsx
import { AppProvider } from '@shopify/app-bridge-react'
import { useSearchParams } from 'react-router-dom'

interface Props { children: React.ReactNode }

export function AppBridgeProvider({ children }: Props) {
  const [searchParams] = useSearchParams()
  const host = searchParams.get('host') ?? ''
  
  return (
    <AppProvider
      config={{
        apiKey: import.meta.env.VITE_SHOPIFY_API_KEY,
        host,
        forceRedirect: true,
      }}
      i18n={{}}
    >
      {children}
    </AppProvider>
  )
}
```

CRITICAL: host changes on every navigation. Always read from URL.
Must be inside Router (needs useSearchParams).

## Session Token Hook

```tsx
// src/hooks/useSessionToken.ts
import { useAppBridge } from '@shopify/app-bridge-react'
import { getSessionToken } from '@shopify/app-bridge-utils'

export function useSessionToken() {
  const app = useAppBridge()
  
  const getToken = async (): Promise<string> => {
    return await getSessionToken(app)
  }
  
  return { getToken }
}
```

Tokens expire in 60 seconds. NEVER cache. Always call getToken() fresh.

## Connecting to api.ts (module-level token getter)

```ts
// src/services/api.ts pattern
let _tokenGetter: (() => Promise<string>) | null = null

export function setTokenGetter(fn: () => Promise<string>): void {
  _tokenGetter = fn
}
```

Call setTokenGetter() from AppBridgeProvider after init.
Request interceptor calls _tokenGetter() on every request.

## Common Mistakes
- DO NOT use window.location for navigation inside embedded app
- DO NOT cache session tokens
- DO NOT forget to pass host param to AppProvider
- DO NOT use App Bridge outside of AppBridgeProvider tree
