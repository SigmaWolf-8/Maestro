import { useState, useEffect, useRef, useCallback } from "react";
import { X, ExternalLink, RefreshCw, Home, Loader2, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WebViewerProps {
  initialUrl: string;
  onClose: () => void;
}

function proxyUrl(url: string): string {
  return `/api/proxy?url=${encodeURIComponent(url)}`;
}

export function WebViewer({ initialUrl, onClose }: WebViewerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [authHint, setAuthHint] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const checkAuthHeader = useCallback(async (targetUrl: string) => {
    try {
      const resp = await fetch(proxyUrl(targetUrl), { method: "HEAD" });
      if (resp.headers.get("X-Auth-Required") === "true") {
        setAuthHint(true);
      } else {
        setAuthHint(false);
      }
    } catch {
      setAuthHint(false);
    }
  }, []);

  useEffect(() => {
    setIsLoading(true);
    setLoadError(false);
    setHintDismissed(false);
    checkAuthHeader(url);

    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    loadTimerRef.current = setTimeout(() => {
      setIsLoading(false);
    }, 20000);

    return () => {
      if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
    };
  }, [url, checkAuthHeader]);

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    let navigateUrl = inputUrl.trim();
    if (navigateUrl && !navigateUrl.startsWith("http://") && !navigateUrl.startsWith("https://")) {
      navigateUrl = "https://" + navigateUrl;
    }
    setUrl(navigateUrl);
    setInputUrl(navigateUrl);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      setIsLoading(true);
      setLoadError(false);
      iframeRef.current.src = proxyUrl(url);
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  const handleGoHome = () => {
    setUrl(initialUrl);
    setInputUrl(initialUrl);
  };

  const handleIframeLoad = () => {
    setIsLoading(false);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  };

  const handleIframeError = () => {
    setIsLoading(false);
    setLoadError(true);
    if (loadTimerRef.current) clearTimeout(loadTimerRef.current);
  };

  const showHint = authHint && !hintDismissed;

  return (
    <div className="flex flex-col h-full w-full" data-testid="web-viewer-container">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-card shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-web-viewer"
          title="Close viewer"
        >
          <X className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleGoHome}
          title="Go to home URL"
          data-testid="button-home-url"
        >
          <Home className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleRefresh}
          title="Refresh"
          data-testid="button-refresh-iframe"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>

        <form onSubmit={handleNavigate} className="flex-1 flex gap-2">
          <Input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter URL..."
            className="flex-1"
            data-testid="input-web-viewer-url"
          />
          <Button type="submit" variant="secondary" data-testid="button-go-url">
            Go
          </Button>
        </form>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenExternal}
          title="Open in new tab"
          data-testid="button-open-external"
        >
          <ExternalLink className="h-4 w-4" />
        </Button>
      </div>

      {showHint && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-200 text-xs shrink-0" data-testid="auth-hint-bar">
          <Info className="h-3.5 w-3.5 shrink-0" />
          <span className="flex-1">This app may require sign-in. If it doesn't load properly, try</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenExternal}
            className="text-xs h-6 px-2 text-amber-800 dark:text-amber-200"
            data-testid="button-hint-open-external"
          >
            <ExternalLink className="h-3 w-3 mr-1" />
            opening in a new tab
          </Button>
          <button
            onClick={() => setHintDismissed(true)}
            className="text-amber-600 dark:text-amber-400 p-0.5"
            data-testid="button-dismiss-hint"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      <div className="flex-1 relative min-h-0">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10" data-testid="web-viewer-loading">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Loading application...</p>
            </div>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10" data-testid="web-viewer-error">
            <div className="flex flex-col items-center gap-3 text-center max-w-md px-6">
              <p className="text-sm text-muted-foreground">Could not load this application inline.</p>
              <Button variant="default" onClick={handleOpenExternal} data-testid="button-error-open-external">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in New Tab
              </Button>
            </div>
          </div>
        )}
        {url && (
          <iframe
            ref={iframeRef}
            src={proxyUrl(url)}
            className="absolute inset-0 w-full h-full border-0"
            title="Web Viewer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals allow-downloads"
            allow="camera; microphone; fullscreen; clipboard-read; clipboard-write"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            data-testid="iframe-web-viewer"
          />
        )}
      </div>
    </div>
  );
}
