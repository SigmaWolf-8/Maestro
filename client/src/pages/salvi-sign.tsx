import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PenTool, ExternalLink, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

const SALVISIGN_URL = "https://SalviSign.replit.app";

export default function SalviSignPage() {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`flex flex-col ${isFullscreen ? "fixed inset-0 z-50 bg-background" : "h-full"}`} data-testid="page-salvi-sign">
      <div className="flex items-center justify-between gap-2 p-3 border-b flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <PenTool className="h-5 w-5" />
          <h1 className="text-lg font-semibold" data-testid="text-salvisign-title">Sign Here</h1>
          <Badge variant="secondary" className="text-[10px]" data-testid="badge-salvisign-type">E-Signatures</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-toggle-fullscreen"
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <a
            href={SALVISIGN_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="button-open-external"
            title="Open in new tab"
          >
            <Button variant="ghost" size="icon" asChild>
              <span><ExternalLink className="h-4 w-4" /></span>
            </Button>
          </a>
        </div>
      </div>

      <div className="flex-1 min-h-0">
        <iframe
          src={SALVISIGN_URL}
          className="w-full h-full border-0"
          title="Sign Here - Electronic Signatures"
          allow="clipboard-read; clipboard-write; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-downloads"
          data-testid="iframe-salvisign"
        />
      </div>
    </div>
  );
}
