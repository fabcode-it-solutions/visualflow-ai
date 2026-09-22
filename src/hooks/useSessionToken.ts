export function useSessionToken() {
  const getToken = async (): Promise<string> => {
    if (typeof window.shopify?.idToken === 'function') {
      return await window.shopify.idToken()
    }
    throw new Error('App Bridge not available')
  }

  return { getToken }
}
