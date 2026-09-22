import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useShopStore } from '@/store/shopStore'

interface SocialData {
  facebookConnected?: boolean
  facebookPageName?: string | null
  instagramConnected?: boolean
  instagramUsername?: string | null
  facebookAdAccountId?: string | null
  facebookAdAccountName?: string | null
}

interface Props {
  social: SocialData | undefined
  onDisconnect: () => void
  isDisconnecting: boolean
}

export function SocialConnectionsTab({ social, onDisconnect, isDisconnecting }: Props) {
  const shop = useShopStore(s => s.shop)

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display font-bold text-xl text-zinc-900 mb-1">Social Connections</h2>
        <p className="text-sm text-zinc-500 mb-6">Manage your Facebook and Instagram connections.</p>
        <div className="border-b border-surface-100 mb-6" />
      </div>

      <div className="space-y-3">
        {/* Facebook */}
        <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">📘</span>
            <div>
              <p className="text-sm font-medium text-zinc-700">Facebook</p>
              {social?.facebookConnected && social.facebookPageName ? (
                <p className="text-xs text-zinc-500">{social.facebookPageName}</p>
              ) : (
                <p className="text-xs text-zinc-400">Not connected</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {social?.facebookConnected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
            {social?.facebookConnected ? (
              <Button variant="secondary" size="sm" onClick={onDisconnect} loading={isDisconnecting} className="min-h-11">
                Disconnect
              </Button>
            ) : (
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  const appUrl = import.meta.env.VITE_APP_URL ?? ''
                  const url = `${appUrl}/api/auth/facebook?shop=${encodeURIComponent(shop?.shopDomain ?? '')}&source=settings`
                  const target = window.top ?? window
                  target.location.href = url
                }}
                className="min-h-11"
              >
                Connect
              </Button>
            )}
          </div>
        </div>

        {/* Instagram */}
        <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">📸</span>
            <div>
              <p className="text-sm font-medium text-zinc-700">Instagram</p>
              {social?.instagramConnected && social.instagramUsername ? (
                <p className="text-xs text-zinc-500">@{social.instagramUsername}</p>
              ) : (
                <p className="text-xs text-zinc-400">Connects via Facebook</p>
              )}
            </div>
          </div>
          {social?.instagramConnected && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>

        {/* Facebook Ads */}
        <div className="flex items-center justify-between p-3 bg-surface-50 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-xl">💰</span>
            <div>
              <p className="text-sm font-medium text-zinc-700">Facebook Ads</p>
              {social?.facebookAdAccountId && social.facebookAdAccountName ? (
                <p className="text-xs text-zinc-500">{social.facebookAdAccountName}</p>
              ) : social?.facebookConnected ? (
                <p className="text-xs text-zinc-400">No ad account detected</p>
              ) : (
                <p className="text-xs text-zinc-400">Connects via Facebook</p>
              )}
            </div>
          </div>
          {social?.facebookAdAccountId && <CheckCircle2 className="h-4 w-4 text-green-500" />}
        </div>
      </div>
    </div>
  )
}
