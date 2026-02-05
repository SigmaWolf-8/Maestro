import { useState, useEffect, useRef } from "react";
import { X, ExternalLink, RefreshCw, ArrowLeft, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface WebViewerProps {
  initialUrl: string;
  onClose: () => void;
}

export function WebViewer({ initialUrl, onClose }: WebViewerProps) {
  const [url, setUrl] = useState(initialUrl);
  const [inputUrl, setInputUrl] = useState(initialUrl);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

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
      iframeRef.current.src = url;
    }
  };

  const handleOpenExternal = () => {
    window.open(url, "_blank");
  };

  const handleGoHome = () => {
    setUrl(initialUrl);
    setInputUrl(initialUrl);
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col" data-testid="web-viewer-container">
      <div className="flex items-center gap-2 p-2 border-b bg-card">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-web-viewer"
        >
          <X className="h-5 w-5" />
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

      <div className="flex-1 relative">
        {url ? (
          <iframe
            ref={iframeRef}
            src={url}
            className="absolute inset-0 w-full h-full border-0"
            title="Web Viewer"
            sandbox="allow-scripts allow-forms allow-popups"
            referrerPolicy="no-referrer"
            data-testid="iframe-web-viewer"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Enter a URL to view</p>
          </div>
        )}
      </div>
    </div>
  );
}
