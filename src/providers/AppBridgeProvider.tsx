import { useEffect, useState } from "react";
import { setTokenGetter } from "@services/api";

type BridgeState = "loading" | "ready" | "install";

declare global {
  interface Window {
    shopify?: {
      idToken?: () => Promise<string>;
    };
  }
}

function InstallScreen() {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function normaliseShop(value: string): string {
    let v = value.trim().toLowerCase();
    if (v && !v.includes(".")) v = `${v}.myshopify.com`;
    return v;
  }

  function isValidShop(value: string): boolean {
    return /^[a-zA-Z0-9][a-zA-Z0-9-]*\.myshopify\.com$/.test(value.trim());
  }

  function handleInstall() {
    if (loading) return;
    const shop = normaliseShop(input);
    if (!isValidShop(shop)) {
      setError("Enter a valid store — e.g. mystore or mystore.myshopify.com");
      return;
    }
    setError("");
    setLoading(true);

    const timeout = setTimeout(() => {
      setLoading(false);
      setError("Redirect timed out. Please try again.");
    }, 5000);

    try {
      window.location.href = `/api/shopify/auth?shop=${encodeURIComponent(shop)}`;
      clearTimeout(timeout);
    } catch {
      clearTimeout(timeout);
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") handleInstall();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-8 flex flex-col gap-6 animate-fade-in">
        {/* Logo + App name */}
        <div className="flex items-center gap-3">
          <img
            src="/logo.jpeg"
            alt="VisualFlow AI"
            className="w-10 h-10 rounded-xl object-contain"
          />
          <div>
            <p className="font-display font-bold text-zinc-900 text-base leading-tight">
              VisualFlow AI
            </p>
            <p className="text-xs text-zinc-400">AI Social Manager</p>
          </div>
        </div>

        {/* Heading */}
        <div>
          <h1 className="font-display font-bold text-xl text-zinc-900 mb-1">
            Install on your store
          </h1>
          <p className="text-sm text-zinc-500 leading-relaxed">
            Enter your Shopify store domain and we'll take care of the rest.
          </p>
        </div>

        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-zinc-700">
            Shopify store
          </label>
          <input
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            onKeyDown={handleKey}
            placeholder="your-store or your-store.myshopify.com"
            disabled={loading}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="w-full px-4 py-3 rounded-xl border border-zinc-200 text-sm text-zinc-900 bg-surface-50 placeholder:text-zinc-400 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-[48px]"
          />
          {error && (
            <p className="text-xs text-red-500 flex items-center gap-1">
              <span>⚠</span> {error}
            </p>
          )}
        </div>

        {/* Button */}
        <button
          onClick={handleInstall}
          disabled={!input.trim() || loading}
          className="w-full min-h-[48px] bg-brand-600 text-white font-semibold text-sm rounded-xl hover:bg-brand-700 active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Redirecting…
            </>
          ) : (
            "Install App →"
          )}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-zinc-100" />
          <span className="text-xs text-zinc-400">already installed?</span>
          <div className="flex-1 h-px bg-zinc-100" />
        </div>

        {/* Secondary link */}
        <a
          href="https://admin.shopify.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-sm font-medium text-brand-600 hover:text-brand-700 hover:underline transition-colors"
        >
          Open Shopify Admin →
        </a>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-white/40 text-center">
        By installing you agree to our Terms of Service
      </p>
    </div>
  );
}

function resolveInitialState(): BridgeState {
  const params = new URLSearchParams(window.location.search);
  const host = params.get("host");
  const shop = params.get("shop");

  if (shop && !host) return "loading";
  if (host) return "ready";
  return "install";
}

function CompleteInstallScreen({ url }: { url: string }) {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-modal w-full max-w-md p-8 flex flex-col gap-6 animate-fade-in text-center">
        <img src="/logo.jpeg" alt="VisualFlow AI" className="w-12 h-12 rounded-xl object-contain mx-auto" />
        <div>
          <h1 className="font-display font-bold text-xl text-zinc-900 mb-2">Complete Installation</h1>
          <p className="text-sm text-zinc-500">Your app was installed but needs one more step to activate.</p>
        </div>
        {/* anchor with target="_top" navigates the top frame — allowed on user click */}
        <a
          href={url}
          target="_top"
          rel="noopener noreferrer"
          className="w-full min-h-12 bg-brand-600 text-white font-semibold text-sm rounded-xl hover:bg-brand-700 transition-all flex items-center justify-center"
        >
          Activate VisualFlow AI →
        </a>
      </div>
    </div>
  );
}

export function AppBridgeProvider({ children }: { children: React.ReactNode }) {
  const [state] = useState<BridgeState>(resolveInitialState);
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const url = (e as CustomEvent<{ url: string }>).detail.url
      setAuthUrl(url)
    }
    window.addEventListener('shopify:needs-auth', handler)
    return () => window.removeEventListener('shopify:needs-auth', handler)
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const host = params.get("host");
    const shop = params.get("shop");

    if (shop && !host) {
      window.location.href = `/api/shopify/auth?shop=${shop}`;
      return;
    }

    if (!host) return;

    // App Bridge loads async — poll until window.shopify.idToken is ready (max 3s)
    let attempts = 0;
    const interval = setInterval(() => {
      if (typeof window.shopify?.idToken === "function") {
        setTokenGetter(() => window.shopify!.idToken!());
        clearInterval(interval);
      } else if (++attempts > 30) {
        clearInterval(interval);
        console.warn("App Bridge idToken not available after 3s");
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  if (authUrl) {
    return <CompleteInstallScreen url={authUrl} />;
  }

  if (state === "loading") {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-4">
        <img
          src="/logo.jpg"
          alt="VisualFlow AI"
          className="w-12 h-12 rounded-xl object-contain"
        />
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-zinc-400 animate-pulse">
            Preparing VisualFlow AI...
          </p>
        </div>
      </div>
    );
  }

  if (state === "install") {
    return <InstallScreen />;
  }

  return <>{children}</>;
}

export default AppBridgeProvider;
