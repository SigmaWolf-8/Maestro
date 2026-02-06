import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ExternalLink, FileText, X, Maximize2, Minimize2 } from "lucide-react";

interface OfficeOnlineEmbedProps {
  documentId: string;
  documentName: string;
  onClose?: () => void;
}

interface WopiTokenResponse {
  accessToken: string;
  tokenTtl: number;
  wopiSrc: string;
}

function getDocIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["docx", "doc"].includes(ext)) return "Word";
  if (["xlsx", "xls"].includes(ext)) return "Excel";
  if (["pptx", "ppt"].includes(ext)) return "PowerPoint";
  return "Office";
}

export function OfficeOnlineEmbed({ documentId, documentName, onClose }: OfficeOnlineEmbedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const tokenMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/wopi/token/${documentId}`, {});
      return (await res.json()) as WopiTokenResponse;
    },
  });

  const tokenData = tokenMutation.data;
  const docType = getDocIcon(documentName);
  const ext = documentName.split(".").pop()?.toLowerCase() || "";
  const isOffice = ["docx", "doc", "xlsx", "xls", "pptx", "ppt"].includes(ext);

  if (!isOffice) {
    return (
      <Card data-testid="card-office-unsupported">
        <CardContent className="p-6 text-center">
          <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            This file format is not supported for in-browser Office editing.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: .docx, .xlsx, .pptx
          </p>
        </CardContent>
      </Card>
    );
  }

  const containerClass = isFullscreen
    ? "fixed inset-0 z-50 bg-background"
    : "relative";

  const hasToken = tokenMutation.isSuccess && tokenData;
  const isInitializing = tokenMutation.isPending;
  const hasError = tokenMutation.isError;
  const isIdle = tokenMutation.isIdle;

  return (
    <div className={containerClass} data-testid="container-office-embed">
      <div className="flex items-center justify-between gap-2 p-2 border-b">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate" data-testid="text-doc-name">{documentName}</span>
          <Badge variant="outline" className="text-[10px]" data-testid="badge-doc-type">{docType}</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setIsFullscreen(!isFullscreen)}
            data-testid="button-toggle-fullscreen"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          {hasToken && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => window.open(tokenData.wopiSrc, "_blank")}
              data-testid="button-open-external"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-editor">
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className={`flex items-center justify-center ${isFullscreen ? "h-[calc(100vh-3rem)]" : "h-[600px]"}`}>
        {isInitializing ? (
          <div className="flex flex-col items-center gap-2" data-testid="loading-office-editor">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Preparing Office editor...</p>
          </div>
        ) : hasToken ? (
          <div className="w-full h-full flex flex-col items-center justify-center border rounded-md bg-muted/20 p-6">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2" data-testid="text-editor-ready">Office Online Editor Ready</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
              {docType} editor is configured for <strong>{documentName}</strong>. 
              Once Microsoft 365 credentials are connected, this document will open
              directly in the Office Online editor.
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Badge variant="secondary" className="text-[10px]">WOPI Token Active</Badge>
              <Badge variant="outline" className="text-[10px]">Edit Mode</Badge>
            </div>
          </div>
        ) : (
          <div className="text-center p-6" data-testid={hasError ? "error-office-editor" : "idle-office-editor"}>
            <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              {hasError
                ? "Unable to initialize the Office editor. Please ensure Microsoft 365 is configured."
                : `Click below to open ${documentName} in the Office Online editor.`}
            </p>
            <Button
              variant="outline"
              onClick={() => tokenMutation.mutate()}
              data-testid="button-open-editor"
            >
              {hasError ? "Retry" : "Open Editor"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
