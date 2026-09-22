import axios from "axios";

let _tokenGetter: (() => Promise<string>) | null = null;

export function setTokenGetter(fn: () => Promise<string>): void {
  _tokenGetter = fn;
}

export function isTokenGetterReady(): boolean {
  return _tokenGetter !== null || typeof window.shopify?.idToken === 'function'
}

const API_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  try {
    let token: string | null = null
    if (_tokenGetter) {
      token = await _tokenGetter()
    } else if (typeof window.shopify?.idToken === 'function') {
      token = await window.shopify.idToken()
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
  } catch (error) {
    console.warn('Could not get session token:', error)
  }
  return config
})

api.interceptors.response.use(
  (response) => {
    if (response.data?.success === true) {
      if ('meta' in response.data) {
        // Paginated response: keep { data, meta } so PaginatedResponse<T> types stay correct
        response.data = { data: response.data.data ?? [], meta: response.data.meta }
      } else if (response.data.data !== undefined) {
        // Single-object response: unwrap to the data payload directly
        response.data = response.data.data
      }
    }
    return response;
  },
  async (error) => {
    if (error.response?.status === 401) {
      const message = error.response?.data?.error ?? ''

      // Shop installed via custom distribution (no_redirect=true) — callback never fired,
      // shop not in DB. Redirect to standard OAuth to complete token exchange.
      // Must redirect the TOP frame — accounts.shopify.com blocks loading inside iframes.
      if (message === 'SHOP_NOT_INSTALLED') {
        const params = new URLSearchParams(window.location.search)
        const shop = params.get('shop')
        if (shop) {
          const authUrl = `${window.location.origin}/api/shopify/auth?shop=${encodeURIComponent(shop)}`
          // Chrome blocks programmatic cross-origin top-frame navigation without a
          // user gesture. Fire a custom event so the UI can render a visible button —
          // the user click provides the gesture Chrome requires.
          window.dispatchEvent(new CustomEvent('shopify:needs-auth', { detail: { url: authUrl } }))
          return new Promise(() => {})
        }
      }

      // Handle "Session token not yet valid" with clock skew retry
      if (message.includes('not yet valid')) {
        console.warn('Session token not yet valid, retrying after delay...', { message })
        await new Promise(r => setTimeout(r, 1000))
        return api.request(error.config)
      }
    }
    return Promise.reject(error);
  },
);

export default api;
