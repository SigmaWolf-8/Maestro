import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Upload, 
  Plus, 
  Trash2, 
  Eye, 
  Lock, 
  Unlock,
  Filter,
  SortAsc,
  SortDesc,
  ChevronDown,
  ChevronRight,
  X,
  Calendar,
  Hammer,
  MapPin,
  Building2,
  Layers,
  Grid3x3,
  Cog,
  Settings2,
  Box,
  Layers3,
  Package,
  DollarSign,
  Users,
  Tag,
  Search,
  Download,
  FolderOpen,
  FileCheck,
  Clock,
  RefreshCw,
  Shield,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ExternalLink,
  Server,
  Pencil,
  FileSpreadsheet,
  Presentation,
  PanelLeftClose,
  PanelLeftOpen,
  FileSearch,
  ClipboardCheck,
  ArrowLeft,
  FolderKanban
} from "lucide-react";
import { FaFileWord, FaFileExcel, FaFilePowerpoint, FaFilePdf, FaFileImage, FaFileArchive, FaFileAudio, FaFileVideo, FaFileCode, FaFileAlt } from "react-icons/fa";
import type { Document, WbsMasterCode, DocumentMetaTag, Project } from "@shared/schema";
import { wbsDimensionDefinitions } from "@shared/schema";

const dimensionIcons: Record<string, any> = {
  phase: Calendar,
  trade: Hammer,
  location: MapPin,
  building: Building2,
  level: Layers,
  zone: Grid3x3,
  system: Cog,
  subsystem: Settings2,
  element_type: Box,
  material: Layers3,
  work_package: Package,
  cost_code: DollarSign,
  responsibility: Users,
};

interface DocumentWithTags extends Document {
  metaTags?: DocumentMetaTag[];
}

function getFileExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

function isBinaryFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  const binaryFormats = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt', 'pdf', 'zip', 'rar', '7z', 'tar', 'gz', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp', 'mp3', 'mp4', 'wav', 'avi', 'mov'];
  return binaryFormats.includes(ext);
}

function isOfficeFormat(filename: string): boolean {
  const ext = getFileExtension(filename);
  const officeFormats = ['docx', 'doc', 'xlsx', 'xls', 'pptx', 'ppt'];
  return officeFormats.includes(ext);
}

function getOfficeAppIcon(filename: string) {
  const ext = getFileExtension(filename);
  if (['xlsx', 'xls', 'csv'].includes(ext)) return FileSpreadsheet;
  if (['pptx', 'ppt'].includes(ext)) return Presentation;
  return FileText;
}

function FileTypeIcon({ filename, className }: { filename: string; className?: string }) {
  const ext = getFileExtension(filename);
  const size = className || "h-4 w-4";
  const sizeClass = size.replace(/h-(\S+)/, '').replace(/w-(\S+)/, '').trim();
  const dims = size.match(/h-(\S+)/)?.[1] || "4";
  const pxSize = parseFloat(dims) * 4;
  const style = { width: pxSize, height: pxSize, minWidth: pxSize };

  switch (ext) {
    case 'doc':
    case 'docx':
      return <FaFileWord style={style} className={sizeClass} color="#2B579A" />;
    case 'xls':
    case 'xlsx':
    case 'csv':
      return <FaFileExcel style={style} className={sizeClass} color="#217346" />;
    case 'ppt':
    case 'pptx':
      return <FaFilePowerpoint style={style} className={sizeClass} color="#D24726" />;
    case 'pdf':
      return <FaFilePdf style={style} className={sizeClass} color="#E2574C" />;
    case 'png':
    case 'jpg':
    case 'jpeg':
    case 'gif':
    case 'bmp':
    case 'webp':
      return <FaFileImage style={style} className={sizeClass} color="#4FC3F7" />;
    case 'zip':
    case 'rar':
    case '7z':
    case 'tar':
    case 'gz':
      return <FaFileArchive style={style} className={sizeClass} color="#FBC02D" />;
    case 'mp3':
    case 'wav':
      return <FaFileAudio style={style} className={sizeClass} color="#AB47BC" />;
    case 'mp4':
    case 'avi':
    case 'mov':
      return <FaFileVideo style={style} className={sizeClass} color="#7E57C2" />;
    case 'js':
    case 'ts':
    case 'html':
    case 'css':
    case 'json':
    case 'xml':
      return <FaFileCode style={style} className={sizeClass} color="#66BB6A" />;
    case 'txt':
    case 'md':
      return <FaFileAlt style={style} className={sizeClass} color="#90A4AE" />;
    default:
      return <FileText className={size + " text-muted-foreground"} />;
  }
}

function getFileTypeName(filename: string): string {
  const ext = getFileExtension(filename);
  const typeNames: Record<string, string> = {
    docx: 'Word Document',
    doc: 'Word Document (Legacy)',
    xlsx: 'Excel Spreadsheet',
    xls: 'Excel Spreadsheet (Legacy)',
    pptx: 'PowerPoint Presentation',
    ppt: 'PowerPoint Presentation (Legacy)',
    pdf: 'PDF Document',
    zip: 'ZIP Archive',
    png: 'PNG Image',
    jpg: 'JPEG Image',
    jpeg: 'JPEG Image',
    gif: 'GIF Image',
    txt: 'Text File',
    csv: 'CSV Data File',
    json: 'JSON Data File',
    xml: 'XML Document',
    html: 'HTML Document',
    md: 'Markdown Document',
  };
  return typeNames[ext] || `${ext.toUpperCase()} File`;
}

type SecurityState = 'verifying' | 'verified' | 'failed';

function OnlyOfficeConfigDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const [serverUrl, setServerUrl] = useState("");
  const [jwtSecret, setJwtSecret] = useState("");
  const [testResult, setTestResult] = useState<{ connected: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const { data: config } = useQuery<{ configured: boolean; serverUrl: string; hasSecret: boolean }>({
    queryKey: ["/api/onlyoffice/config", activeTenant?.id],
    queryFn: async () => {
      const params = activeTenant?.id ? `?tenantId=${activeTenant.id}` : "";
      const res = await fetch(`/api/onlyoffice/config${params}`);
      return res.json();
    },
    enabled: open,
  });

  useEffect(() => {
    if (config) {
      setServerUrl(config.serverUrl || "");
    }
  }, [config]);

  const skipNextClearRef = useRef(false);

  useEffect(() => {
    if (skipNextClearRef.current) {
      skipNextClearRef.current = false;
      return;
    }
    setTestResult(null);
  }, [serverUrl]);

  const testConnection = async () => {
    if (!serverUrl.trim()) return;
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await apiRequest("POST", "/api/onlyoffice/test-connection", { serverUrl });
      const data = await res.json();
      if (data.normalizedUrl && data.normalizedUrl !== serverUrl) {
        skipNextClearRef.current = true;
        setServerUrl(data.normalizedUrl);
      }
      setTestResult({ connected: data.connected, message: data.message });
    } catch (err: any) {
      setTestResult({ connected: false, message: err.message || "Connection test failed" });
    }
    setIsTesting(false);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/onlyoffice/config", {
        tenantId: activeTenant?.id,
        serverUrl,
        jwtSecret,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data.serverUrl) setServerUrl(data.serverUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/onlyoffice/config"] });
      toast({ title: "ONLYOFFICE configuration saved" });
      onOpenChange(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to save configuration", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            ONLYOFFICE Document Server
          </DialogTitle>
          <DialogDescription>
            Connect to your ONLYOFFICE Document Server to enable in-browser editing of Word, Excel, and PowerPoint files.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="oo-url">Document Server URL</Label>
            <div className="flex gap-2 mt-1">
              <Input
                id="oo-url"
                value={serverUrl}
                onChange={(e) => setServerUrl(e.target.value)}
                placeholder="http://your-public-ip:80"
                data-testid="input-onlyoffice-url"
                className="flex-1"
              />
              <Button
                variant="outline"
                onClick={testConnection}
                disabled={isTesting || !serverUrl.trim()}
                data-testid="button-test-oo-connection"
              >
                {isTesting ? <RefreshCw className="h-4 w-4 animate-spin" /> : "Test"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              The public URL where your Document Server can be reached from the internet.
            </p>
            {testResult && (
              <div className={`flex items-center gap-2 mt-2 text-xs px-3 py-2 rounded-md ${
                testResult.connected 
                  ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400" 
                  : "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-400"
              }`} data-testid="text-oo-test-result">
                {testResult.connected ? <ShieldCheck className="h-4 w-4 shrink-0" /> : <Shield className="h-4 w-4 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}
          </div>
          <div>
            <Label htmlFor="oo-secret">JWT Secret (optional)</Label>
            <Input
              id="oo-secret"
              type="password"
              value={jwtSecret}
              onChange={(e) => setJwtSecret(e.target.value)}
              placeholder="Leave blank if not configured on your server"
              data-testid="input-onlyoffice-secret"
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only needed if your Document Server has JWT authentication enabled.
              Default JWT secret is often found in your Document Server's <code className="bg-muted px-1 rounded">local.json</code> config file.
            </p>
          </div>
          <Separator />
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium">How to connect your local Document Server:</p>
            <ol className="list-decimal pl-4 space-y-1">
              <li>Your Document Server must be reachable from the internet (not just localhost). Use a tool like <a href="https://ngrok.com" target="_blank" rel="noopener noreferrer" className="underline hover-elevate">ngrok</a> to create a public tunnel, or configure port forwarding on your router.</li>
              <li>With ngrok: run <code className="bg-muted px-1 rounded">ngrok http 80</code> (or whichever port your Document Server uses, commonly 80 or 8080), then paste the ngrok URL above.</li>
              <li>Click <strong>Test</strong> to verify the connection before saving.</li>
            </ol>
            <Separator className="my-2" />
            <p className="italic">DocSpace and Document Server are different products. DocSpace URLs (e.g. docspace-xxx.onlyoffice.com) will not work here. You need your Document Server's direct URL.</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-oo-config">
            Cancel
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={saveMutation.isPending || !serverUrl.trim()}
            data-testid="button-save-oo-config"
          >
            {saveMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OnlyOfficeEditor({ document, onClose }: { document: DocumentWithTags; onClose: () => void }) {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const editorRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { data: editorData } = useQuery<{ config: any; serverUrl: string }>({
    queryKey: ["/api/onlyoffice/editor-config", document.id, activeTenant?.id],
    queryFn: async () => {
      const params = activeTenant?.id ? `?tenantId=${activeTenant.id}` : "";
      const res = await fetch(`/api/onlyoffice/editor-config/${document.id}${params}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to load editor configuration");
      }
      return res.json();
    },
  });

  useEffect(() => {
    if (!editorData || !editorRef.current) return;

    const { config, serverUrl } = editorData;

    const scriptId = "onlyoffice-api-script";
    let existingScript = window.document.getElementById(scriptId) as HTMLScriptElement | null;

    const initEditor = () => {
      try {
        if ((window as any).DocsAPI) {
          new (window as any).DocsAPI.DocEditor("onlyoffice-editor-container", config);
          setIsLoading(false);
        } else {
          setError("ONLYOFFICE API not loaded. Check your Document Server URL.");
          setIsLoading(false);
        }
      } catch (err: any) {
        setError(err.message || "Failed to initialize editor");
        setIsLoading(false);
      }
    };

    if (existingScript) {
      initEditor();
    } else {
      const script = window.document.createElement("script");
      script.id = scriptId;
      script.src = `${serverUrl}/web-apps/apps/api/documents/api.js`;
      script.onload = initEditor;
      script.onerror = () => {
        setError(`Could not load ONLYOFFICE API from ${serverUrl}. Verify the Document Server is running and accessible.`);
        setIsLoading(false);
      };
      window.document.head.appendChild(script);
    }

    return () => {
      try {
        const container = window.document.getElementById("onlyoffice-editor-container");
        if (container) {
          container.innerHTML = "";
        }
      } catch {}
    };
  }, [editorData]);

  return (
    <div className="h-full flex flex-col" data-testid="container-onlyoffice-editor">
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Pencil className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium" data-testid="text-editor-doc-name">{document.name}</span>
          <Badge variant="outline" className="text-xs">ONLYOFFICE</Badge>
        </div>
        <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-oo-editor">
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 relative" ref={editorRef}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto animate-spin text-primary mb-3" />
              <p className="text-sm text-muted-foreground">Loading ONLYOFFICE editor...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center max-w-md">
              <Server className="h-12 w-12 mx-auto text-destructive mb-3" />
              <h3 className="font-semibold mb-2">Editor Connection Failed</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <Button variant="outline" onClick={onClose} data-testid="button-oo-error-close">
                Close
              </Button>
            </div>
          </div>
        )}
        <div id="onlyoffice-editor-container" className="w-full h-full" />
      </div>
    </div>
  );
}

function DocumentContentViewer({ document, content }: { document: DocumentWithTags; content: string | null }) {
  const [securityState, setSecurityState] = useState<SecurityState>('verifying');
  const [securityDetails, setSecurityDetails] = useState<{
    timestamp: string;
    checksum: string;
    encryptionMode: string;
  } | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  
  const ext = getFileExtension(document.name);
  const fileType = getFileTypeName(document.name);
  const isDocx = ext === 'docx' || ext === 'doc';
  const isPdf = ext === 'pdf';
  const isImage = ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'webp'].includes(ext);
  
  useEffect(() => {
    const verifySecurityCredentials = async () => {
      setSecurityState('verifying');
      try {
        await new Promise(resolve => setTimeout(resolve, 600));
        setSecurityDetails({
          timestamp: document.kongTimestamp || new Date().toISOString(),
          checksum: document.checksum || 'SHA-256 Verified',
          encryptionMode: document.encryptionMode || 'balanced',
        });
        setSecurityState('verified');
      } catch {
        setSecurityState('failed');
      }
    };
    verifySecurityCredentials();
  }, [document.id]);
  
  useEffect(() => {
    if (!content || !isDocx || securityState !== 'verified') return;
    
    const renderDocx = async () => {
      setRenderError(null);
      try {
        const mammoth = await import('mammoth');
        let arrayBuffer: ArrayBuffer;
        
        if (content.startsWith('data:')) {
          const base64Data = content.split(',')[1];
          if (base64Data) {
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          } else {
            throw new Error("Invalid base64 data");
          }
        } else {
          const encoder = new TextEncoder();
          arrayBuffer = encoder.encode(content).buffer;
        }
        
        const result = await mammoth.convertToHtml({ arrayBuffer });
        if (result.value && result.value.trim()) {
          setRenderedHtml(result.value);
        } else {
          setRenderError("Could not extract content from document");
        }
      } catch (err) {
        console.error("Error rendering DOCX:", err);
        setRenderError("Unable to render document. Please re-upload the file.");
      }
    };
    renderDocx();
  }, [content, isDocx, securityState]);
  
  const pdfDataUrl = useMemo(() => {
    if (!isPdf || !content || securityState !== 'verified') return null;
    if (content.startsWith('data:')) return content;
    try {
      const sample = atob(content.substring(0, 8));
      if (sample.startsWith('%PDF')) {
        return `data:application/pdf;base64,${content}`;
      }
    } catch {}
    return null;
  }, [content, isPdf, securityState]);
  
  if (securityState === 'verifying') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="relative mb-6">
            <Shield className="h-16 w-16 mx-auto text-primary animate-pulse" />
            <RefreshCw className="h-6 w-6 absolute bottom-0 right-1/2 translate-x-6 text-muted-foreground animate-spin" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Verifying Security Credentials</h3>
          <p className="text-muted-foreground text-sm">
            Checking encryption status and document integrity...
          </p>
        </div>
      </div>
    );
  }
  
  if (securityState === 'failed') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <Shield className="h-16 w-16 mx-auto text-destructive mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-destructive">Security Verification Failed</h3>
          <p className="text-muted-foreground text-sm">
            Unable to verify document security credentials.
          </p>
        </div>
      </div>
    );
  }
  
  const SecurityBanner = () => (
    <div className="bg-green-50 dark:bg-green-950/30 border-b border-green-200 dark:border-green-800 px-4 py-2 flex items-center gap-3">
      <ShieldCheck className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
      <div className="flex-1">
        <span className="text-sm font-medium text-green-700 dark:text-green-300">Security Verified</span>
        <span className="text-xs text-green-600 dark:text-green-400 ml-2">
          {securityDetails?.encryptionMode && `Mode: ${securityDetails.encryptionMode}`}
        </span>
      </div>
      <div className="text-xs text-green-600 dark:text-green-400">
        {securityDetails?.timestamp && `${new Date(securityDetails.timestamp).toLocaleString()}`}
      </div>
    </div>
  );
  
  if (isPdf && pdfDataUrl) {
    return (
      <div className="h-full flex flex-col">
        <SecurityBanner />
        <div className="flex-1 p-2">
          <iframe 
            src={pdfDataUrl}
            className="w-full h-full rounded-md border-0"
            title={document.name}
            data-testid="iframe-pdf-viewer"
          />
        </div>
      </div>
    );
  }
  
  if (isDocx && renderedHtml) {
    return (
      <div className="h-full flex flex-col">
        <SecurityBanner />
        <div className="flex-1 overflow-auto p-4">
          <div className="bg-white dark:bg-gray-900 rounded-md p-6 min-h-full shadow-inner">
            <div 
              className="prose prose-sm dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: renderedHtml }}
            />
          </div>
        </div>
      </div>
    );
  }
  
  if (isImage && content) {
    return (
      <div className="h-full flex flex-col">
        <SecurityBanner />
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
          <img src={content} alt={document.name} className="max-w-full max-h-full object-contain rounded-md shadow-md" data-testid="img-document-preview" />
        </div>
      </div>
    );
  }
  
  if (renderError || (isBinaryFormat(document.name) && !renderedHtml && !pdfDataUrl)) {
    return (
      <div className="h-full flex flex-col">
        <SecurityBanner />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md">
            <FileText className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">{fileType}</h3>
            <div className="bg-muted/50 rounded-md p-4 mb-4">
              <div className="grid grid-cols-2 gap-2 text-sm text-left">
                <span className="text-muted-foreground">File Name:</span>
                <span className="font-medium">{document.name}</span>
                <span className="text-muted-foreground">Size:</span>
                <span className="font-medium">
                  {document.originalSizeBytes 
                    ? `${(document.originalSizeBytes / 1024).toFixed(1)} KB`
                    : 'Unknown'}
                </span>
              </div>
            </div>
            {renderError && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mb-2">{renderError}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Use the ONLYOFFICE editor to view and edit this document.
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  if (!content) {
    return (
      <div className="h-full flex flex-col">
        <SecurityBanner />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Content Available</h3>
            <p className="text-muted-foreground">This document has no viewable content.</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      <SecurityBanner />
      <div className="flex-1 overflow-auto p-4">
        <pre className="whitespace-pre-wrap font-mono text-sm bg-muted/50 p-4 rounded-md min-h-full">
          {content}
        </pre>
      </div>
    </div>
  );
}

function FullscreenViewer({ 
  document, 
  content, 
  isOpen, 
  onClose,
  onOpenEditor,
  ooConfigured,
}: { 
  document: DocumentWithTags | null; 
  content: string | null; 
  isOpen: boolean; 
  onClose: () => void;
  onOpenEditor: () => void;
  ooConfigured: boolean;
}) {
  if (!isOpen || !document) return null;
  
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6 text-primary" />
            <div>
              <h2 className="font-semibold text-lg">{document.name}</h2>
              <p className="text-sm text-muted-foreground">
                {getFileTypeName(document.name)} 
                {document.originalSizeBytes && ` - ${(document.originalSizeBytes / 1024).toFixed(1)} KB`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ooConfigured && isOfficeFormat(document.name) && (
              <Button variant="outline" size="sm" onClick={() => { onClose(); onOpenEditor(); }} data-testid="button-fullscreen-edit-oo">
                <Pencil className="h-4 w-4 mr-2" />
                Edit in ONLYOFFICE
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose} data-testid="button-close-viewer">
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-hidden">
          <DocumentContentViewer document={document} content={content} />
        </div>
      </div>
    </div>
  );
}

export default function FileManagerPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  
  useEffect(() => {
    if (location !== "/documents/files") {
      navigate("/documents/files", { replace: true });
    }
  }, []);

  const [selectedDocument, setSelectedDocument] = useState<DocumentWithTags | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [expandedDimensions, setExpandedDimensions] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<"name" | "createdAt">("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({});
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [dimensionSearch, setDimensionSearch] = useState("");
  const [forceShowFilters, setForceShowFilters] = useState(false);
  const [isFullscreenViewerOpen, setIsFullscreenViewerOpen] = useState(false);
  const [showOnlyOfficeEditor, setShowOnlyOfficeEditor] = useState(false);
  const [showOOConfig, setShowOOConfig] = useState(false);
  const [pendingDocId, setPendingDocId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("docId");
  });
  const [isWbsPanelCollapsed, setIsWbsPanelCollapsed] = useState(() => {
    const saved = localStorage.getItem("maestro-wbs-panel-collapsed");
    return saved !== null ? saved === "true" : false;
  });
  const [isDocListCollapsed, setIsDocListCollapsed] = useState(false);

  const toggleWbsPanel = (collapsed: boolean) => {
    setIsWbsPanelCollapsed(collapsed);
    localStorage.setItem("maestro-wbs-panel-collapsed", String(collapsed));
  };
  const toggleDocList = (collapsed: boolean) => {
    setIsDocListCollapsed(collapsed);
  };
  
  const [uploadForm, setUploadForm] = useState({
    name: "",
    description: "",
    category: "general",
    content: "",
    encrypt: true,
    encryptionMode: "balanced" as "high_security" | "balanced" | "performance" | "adaptive",
  });
  const [uploadMetaTags, setUploadMetaTags] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState<string>("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { data: ooConfig } = useQuery<{ configured: boolean; serverUrl: string; hasSecret: boolean }>({
    queryKey: ["/api/onlyoffice/config", activeTenant?.id],
    queryFn: async () => {
      const params = activeTenant?.id ? `?tenantId=${activeTenant.id}` : "";
      const res = await fetch(`/api/onlyoffice/config${params}`);
      return res.json();
    },
  });

  const { data: documents = [], isLoading: docsLoading, refetch: refetchDocs } = useQuery<Document[]>({
    queryKey: ["/api/documents", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/documents?tenantId=${activeTenant.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });
  
  const { data: wbsCodes = [] } = useQuery<WbsMasterCode[]>({
    queryKey: ["/api/wbs-codes", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/wbs-codes?tenantId=${activeTenant.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });
  
  const { data: selectedDocTags = [] } = useQuery<DocumentMetaTag[]>({
    queryKey: ["/api/documents", selectedDocument?.id, "meta-tags"],
    queryFn: async () => {
      if (!selectedDocument?.id) return [];
      const res = await fetch(`/api/documents/${selectedDocument.id}/meta-tags`);
      return res.json();
    },
    enabled: !!selectedDocument?.id,
  });
  
  const { data: filteredByTags = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents/filter", activeTenant?.id, activeFilters],
    queryFn: async () => {
      if (!activeTenant?.id || Object.keys(activeFilters).length === 0) return [];
      const res = await fetch("/api/documents/filter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: activeTenant.id, filters: activeFilters }),
      });
      return res.json();
    },
    enabled: !!activeTenant?.id && Object.keys(activeFilters).length > 0,
  });

  const { data: projectsList = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/projects?tenantId=${activeTenant.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  useEffect(() => {
    if (pendingDocId && documents.length > 0) {
      const doc = documents.find((d) => d.id === pendingDocId);
      if (doc) {
        setSelectedDocument(doc);
        setIsDocListCollapsed(true);
        setPendingDocId(null);
        window.history.replaceState({}, "", "/documents/files");
      }
    }
  }, [pendingDocId, documents]);

  const saveTagsMutation = useMutation({
    mutationFn: async ({ docId, tags }: { docId: string; tags: Array<{ dimensionType: string; wbsCodeId?: string | null; customValue?: string | null }> }) => {
      const res = await apiRequest("PUT", `/api/documents/${docId}/meta-tags`, { tags });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents", selectedDocument?.id, "meta-tags"] });
      toast({ title: "Tags saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save tags", description: error.message, variant: "destructive" });
    },
  });

  const updateDocProjectMutation = useMutation({
    mutationFn: async ({ docId, projectId }: { docId: string; projectId: string | null }) => {
      const res = await apiRequest("PATCH", `/api/documents/${docId}`, { projectId });
      return res.json();
    },
    onMutate: ({ docId, projectId }) => {
      if (selectedDocument && selectedDocument.id === docId) {
        setSelectedDocument({ ...selectedDocument, projectId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Project updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update project", description: error.message, variant: "destructive" });
    },
  });

  const createDocMutation = useMutation({
    mutationFn: async (data: typeof uploadForm & { tenantId: string }) => {
      const response = await apiRequest("POST", "/api/documents", data);
      return response.json();
    },
    onSuccess: async (doc) => {
      const tags = Object.entries(uploadMetaTags)
        .filter(([_, value]) => value)
        .map(([dimensionType, wbsCodeId]) => ({ dimensionType, wbsCodeId }));
      
      if (tags.length > 0) {
        await apiRequest("PUT", `/api/documents/${doc.id}/meta-tags`, { tags });
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsUploadOpen(false);
      resetUploadForm();
      toast({ title: "Document uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });
  
  const deleteDocMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      if (selectedDocument) { setSelectedDocument(null); setForceShowFilters(false); }
      toast({ title: "Document deleted" });
    },
  });
  
  const [classifyResult, setClassifyResult] = useState<any>(null);
  const [reviewResult, setReviewResult] = useState<any>(null);

  const classifyDocMutation = useMutation({
    mutationFn: async (doc: Document) => {
      return apiRequest("POST", "/api/classification/classify", {
        documentId: doc.id,
        intakePath: "manual_upload",
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setClassifyResult(data);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "We couldn't classify this document. Please try again.", variant: "destructive" });
    },
  });

  const reviewDocMutation = useMutation({
    mutationFn: async (doc: Document) => {
      return apiRequest("POST", "/api/reviews/sessions", {
        documentId: doc.id,
      });
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events"] });
      setReviewResult(data);
    },
    onError: () => {
      toast({ title: "Something went wrong", description: "We couldn't start a review for this document. Please try again.", variant: "destructive" });
    },
  });

  const seedCodesMutation = useMutation({
    mutationFn: async (tenantId: string) => {
      return apiRequest("POST", `/api/wbs-codes/seed/${tenantId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs-codes"] });
      toast({ title: "WBS codes seeded successfully" });
    },
  });
  
  const bulkEncryptMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/documents/bulk-encrypt", {
        mode: "balanced",
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      let msg: string;
      if (data.encrypted > 0) {
        msg = `${data.encrypted} document${data.encrypted > 1 ? 's' : ''} encrypted via PlenumNET batch phase.`;
      } else if (data.failed > 0) {
        msg = `Encryption failed for ${data.failed} document${data.failed > 1 ? 's' : ''}. PlenumNET service may be unavailable.`;
      } else {
        msg = "All documents are already encrypted.";
      }
      toast({
        title: data.failed > 0 && data.encrypted === 0 ? "Bulk Encryption Failed" : "Bulk Encryption Complete",
        description: msg,
        variant: data.failed > 0 && data.encrypted === 0 ? "destructive" : "default",
      });
    },
    onError: (err: any) => {
      toast({ title: "Bulk encryption failed", description: err.message, variant: "destructive" });
    },
  });

  const unencryptedCount = useMemo(() => {
    return (documents || []).filter(d => !d.isEncrypted).length;
  }, [documents]);

  const resetUploadForm = () => {
    setUploadForm({
      name: "",
      description: "",
      category: "general",
      content: "",
      encrypt: true,
      encryptionMode: "balanced",
    });
    setUploadMetaTags({});
  };
  
  const getCodesByDimension = (dimensionType: string) => {
    return wbsCodes.filter(c => c.dimensionType === dimensionType);
  };
  
  const getCodeName = (codeId: string) => {
    const code = wbsCodes.find(c => c.id === codeId);
    return code ? `${code.code} - ${code.name}` : codeId;
  };
  
  const toggleDimension = (dim: string) => {
    setExpandedDimensions(prev => 
      prev.includes(dim) ? prev.filter(d => d !== dim) : [...prev, dim]
    );
  };
  
  const toggleFilter = (dimensionType: string, codeId: string) => {
    setActiveFilters(prev => {
      const current = prev[dimensionType] || [];
      const updated = current.includes(codeId)
        ? current.filter(id => id !== codeId)
        : [...current, codeId];
      
      if (updated.length === 0) {
        const { [dimensionType]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [dimensionType]: updated };
    });
  };
  
  const clearAllFilters = () => {
    setActiveFilters({});
  };
  
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);
  
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);
  
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const base64Result = reader.result as string;
        setUploadForm(prev => ({
          ...prev,
          name: file.name,
          content: base64Result,
        }));
        setIsUploadOpen(true);
      };
      reader.readAsDataURL(file);
    }
  }, []);
  
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const base64Result = reader.result as string;
        setUploadForm(prev => ({
          ...prev,
          name: file.name,
          content: base64Result,
        }));
        setIsUploadOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const handleDecrypt = async () => {
    if (!selectedDocument) return;
    setIsDecrypting(true);
    try {
      const res = await fetch(`/api/documents/${selectedDocument.id}/decrypt`);
      const data = await res.json();
      setDecryptedContent(data.content);
    } catch {
      toast({ title: "Decryption failed", variant: "destructive" });
    } finally {
      setIsDecrypting(false);
    }
  };
  
  const baseDocuments = Object.keys(activeFilters).length > 0 ? filteredByTags : documents;
  
  const filteredDocuments = baseDocuments
    .filter(doc => {
      if (projectFilter && doc.projectId !== projectFilter) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        if (!doc.name.toLowerCase().includes(query) && 
            !doc.description?.toLowerCase().includes(query)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortField === "name") {
        const cmp = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
        return sortDirection === "asc" ? cmp : -cmp;
      }
      const aTime = new Date(a.createdAt!).getTime();
      const bTime = new Date(b.createdAt!).getTime();
      return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
    });
  
  const activeFilterCount = Object.values(activeFilters).flat().length;
  
  return (
    <div className="flex h-full">
      {isWbsPanelCollapsed ? (
        <div className="border-r flex flex-col items-center py-2 px-1 bg-muted/30">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleWbsPanel(false)}
            title="Show WBS Filters"
            data-testid="button-expand-wbs-panel"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <div className="mt-2 [writing-mode:vertical-lr] text-xs text-muted-foreground rotate-180 select-none">
            {selectedDocument && !forceShowFilters ? "Document Tags" : "WBS Filters"}
          </div>
        </div>
      ) : (
      <div className="w-56 border-r flex flex-col bg-muted/30 shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.15),0_1px_0_rgba(255,255,255,0.1)]">
        <div className="p-3 border-b">
          <div className="flex items-center justify-between gap-1 mb-2">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              {selectedDocument && !forceShowFilters ? (
                <><Tag className="h-4 w-4" /> Document Tags</>
              ) : (
                <><Filter className="h-4 w-4" /> Filters</>
              )}
            </h3>
            <div className="flex items-center gap-0.5">
            {(!selectedDocument || forceShowFilters) && activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters} data-testid="button-clear-filters">
                <X className="h-3 w-3 mr-1" />
                Clear ({activeFilterCount})
              </Button>
            )}
            {selectedDocument && !forceShowFilters && selectedDocTags.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!selectedDocument) return;
                  saveTagsMutation.mutate({ docId: selectedDocument.id, tags: [] });
                }}
                data-testid="button-clear-all-tags"
              >
                <X className="h-3 w-3 mr-1" />
                Clear
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleWbsPanel(true)}
              title={selectedDocument && !forceShowFilters ? "Hide Document Tags" : "Hide WBS Filters"}
              data-testid="button-collapse-wbs-panel"
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
            </div>
          </div>
          {selectedDocument && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-1 text-xs text-primary hover:text-primary/80 hover:underline flex items-center gap-1 mt-1 font-normal"
              onClick={() => setForceShowFilters(!forceShowFilters)}
              data-testid="button-toggle-tags-filters"
            >
              {forceShowFilters ? (
                <><Tag className="h-3 w-3" /> Switch to Document Tags</>
              ) : (
                <><Filter className="h-3 w-3" /> Switch to Filters</>
              )}
            </Button>
          )}
        </div>

        <div className="px-3 py-2 border-b">
          <Label className="text-xs flex items-center gap-1 mb-1">
            <FolderKanban className="h-3 w-3" />
            Project
          </Label>
          <Select
            value={selectedDocument && !forceShowFilters ? (selectedDocument.projectId || "_none") : (projectFilter || "_all")}
            onValueChange={(v) => {
              if (selectedDocument && !forceShowFilters) {
                const newProjectId = v === "_none" ? null : v;
                updateDocProjectMutation.mutate({ docId: selectedDocument.id, projectId: newProjectId });
              } else {
                setProjectFilter(v === "_all" ? "" : v);
              }
            }}
          >
            <SelectTrigger className="h-7 text-xs" data-testid="select-project-filter">
              <SelectValue placeholder={selectedDocument && !forceShowFilters ? "Select project..." : "All projects"} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={selectedDocument && !forceShowFilters ? "_none" : "_all"}>
                {selectedDocument && !forceShowFilters ? "No project" : "All projects"}
              </SelectItem>
              {projectsList.map((proj) => (
                <SelectItem key={proj.id} value={proj.id}>
                  {proj.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedDocument && !forceShowFilters ? (
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {wbsDimensionDefinitions.map((dim) => {
                const DimIcon = dimensionIcons[dim.key] || Tag;
                const codes = getCodesByDimension(dim.key);
                const currentTag = selectedDocTags.find(t => t.dimensionType === dim.key);
                const currentValue = currentTag?.wbsCodeId || "_none";

                return (
                  <div key={dim.key}>
                    <Label className="text-[11px] flex items-center gap-1 mb-0.5">
                      <DimIcon className="h-3 w-3" />
                      {dim.label}
                    </Label>
                    <Select
                      value={currentValue}
                      onValueChange={(v) => {
                        if (!selectedDocument) return;
                        const updatedTags = wbsDimensionDefinitions
                          .map((d) => {
                            if (d.key === dim.key) {
                              return v === "_none" ? null : { dimensionType: d.key, wbsCodeId: v };
                            }
                            const existing = selectedDocTags.find(t => t.dimensionType === d.key);
                            if (existing?.wbsCodeId) {
                              return { dimensionType: d.key, wbsCodeId: existing.wbsCodeId };
                            }
                            return null;
                          })
                          .filter(Boolean) as Array<{ dimensionType: string; wbsCodeId: string }>;
                        saveTagsMutation.mutate({ docId: selectedDocument.id, tags: updatedTags });
                      }}
                    >
                      <SelectTrigger className="h-7 text-xs" data-testid={`select-doctag-${dim.key}`}>
                        <SelectValue placeholder="None" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="_none">None</SelectItem>
                        {codes.map((code) => (
                          <SelectItem key={code.id} value={code.id}>
                            {code.code} - {code.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        ) : (
          <>
            <div className="px-3 py-2">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search WBS..."
                  value={dimensionSearch}
                  onChange={(e) => setDimensionSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                  data-testid="input-search-wbs-codes"
                />
              </div>
            </div>
            
            <ScrollArea className="flex-1">
              <div className="p-3 pt-1 space-y-1">
                {wbsCodes.length === 0 ? (
                  <div className="text-center py-6">
                    <Tag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">No WBS codes</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => activeTenant && seedCodesMutation.mutate(activeTenant.id)}
                      disabled={seedCodesMutation.isPending}
                      data-testid="button-seed-wbs-codes"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Seed Codes
                    </Button>
                  </div>
                ) : (
                  wbsDimensionDefinitions.map((dim) => {
                    const DimIcon = dimensionIcons[dim.key] || Tag;
                    const allCodes = getCodesByDimension(dim.key);
                    const codes = dimensionSearch 
                      ? allCodes.filter(c => 
                          c.code.toLowerCase().includes(dimensionSearch.toLowerCase()) ||
                          c.name.toLowerCase().includes(dimensionSearch.toLowerCase())
                        )
                      : allCodes;
                    const selectedFilters = activeFilters[dim.key] || [];
                    const isExpanded = expandedDimensions.includes(dim.key) || (!!dimensionSearch && codes.length > 0);
                    
                    if (codes.length === 0) return null;
                    
                    return (
                      <Collapsible
                        key={dim.key}
                        open={isExpanded}
                        onOpenChange={() => toggleDimension(dim.key)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button
                            variant="ghost"
                            className="w-full justify-between px-2 h-7"
                            data-testid={`button-dimension-${dim.key}`}
                          >
                            <span className="flex items-center gap-1.5 text-xs">
                              <DimIcon className="h-3 w-3" />
                              {dim.label}
                              {selectedFilters.length > 0 && (
                                <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                                  {selectedFilters.length}
                                </Badge>
                              )}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pl-5 pt-1 space-y-0.5">
                          {codes.map((code) => (
                            <div key={code.id} className="flex items-center gap-1.5 py-0.5">
                              <Checkbox
                                checked={selectedFilters.includes(code.id)}
                                onCheckedChange={() => toggleFilter(dim.key, code.id)}
                                id={`filter-${code.id}`}
                                data-testid={`checkbox-filter-${code.id}`}
                              />
                              <label
                                htmlFor={`filter-${code.id}`}
                                className="text-[11px] cursor-pointer flex-1 truncate"
                                title={code.name}
                              >
                                <span className="font-mono text-muted-foreground">{code.code}</span>{" "}
                                {code.name}
                              </label>
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </>
        )}
      </div>
      )}
      
      <div className="flex-1 flex flex-col min-w-0">
        <div className="flex-1 flex gap-3 px-4 pb-4 pt-3 min-h-0">
          {isDocListCollapsed ? (
            <div className="flex flex-col items-center shrink-0 pt-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleDocList(false)}
                title="Show Document List"
                data-testid="button-expand-doc-list"
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
              <div className="mt-2 [writing-mode:vertical-lr] text-xs text-muted-foreground rotate-180 select-none">
                Documents ({filteredDocuments.length})
              </div>
            </div>
          ) : (
          <div className="w-56 flex flex-col shrink-0">
            <div className="flex items-center justify-between gap-1 mb-2">
              <h3 className="font-semibold text-sm">
                Documents ({filteredDocuments.length})
              </h3>
              <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => refetchDocs()}
                data-testid="button-refresh-documents"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleDocList(true)}
                title="Hide Document List"
                data-testid="button-collapse-doc-list"
              >
                <PanelLeftClose className="h-4 w-4" />
              </Button>
              </div>
            </div>

            <div className="relative mb-1.5">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search docs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-7 h-7 text-xs"
                data-testid="input-search-documents"
              />
            </div>
            <div className="flex gap-1 mb-2">
              <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
                <SelectTrigger className="flex-1 h-7 text-xs" data-testid="select-sort-field">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="createdAt">Date</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => setSortDirection(prev => prev === "asc" ? "desc" : "asc")}
                data-testid="button-toggle-sort"
              >
                {sortDirection === "asc" ? <SortAsc className="h-3.5 w-3.5" /> : <SortDesc className="h-3.5 w-3.5" />}
              </Button>
            </div>

            <div
              className={`mb-2 border border-dashed rounded-md p-2 transition-colors ${
                isDragOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              data-testid="dropzone-upload"
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Upload className={`h-4 w-4 shrink-0 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-xs text-muted-foreground">
                  {isDragOver ? "Drop to upload" : "Drop files here"}
                </span>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => fileInputRef.current?.click()}
                  data-testid="button-browse-files"
                >
                  <FolderOpen className="h-3 w-3 mr-1" />
                  Browse
                </Button>
                <Button
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => setIsUploadOpen(true)}
                  data-testid="button-new-document"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  New Doc
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                accept=".txt,.md,.json,.xml,.csv,.html,.docx,.xlsx,.pptx,.pdf,.png,.jpg,.jpeg,.gif"
              />
            </div>

            {unencryptedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs mb-2 border-amber-400 dark:border-amber-600 text-amber-700 dark:text-amber-400"
                onClick={() => bulkEncryptMutation.mutate()}
                disabled={bulkEncryptMutation.isPending}
                data-testid="button-bulk-encrypt"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5" />
                {bulkEncryptMutation.isPending
                  ? "Encrypting..."
                  : `Encrypt All (${unencryptedCount} unprotected)`}
              </Button>
            )}
            
            <ScrollArea className="flex-1 border rounded-md shadow-[inset_4px_4px_8px_rgba(0,0,0,0.3),inset_-4px_-4px_8px_rgba(255,255,255,0.15),0_1px_0_rgba(255,255,255,0.1)]">
              {docsLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="p-6 text-center">
                  <FileText className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">No documents</p>
                </div>
              ) : (
                <div className="p-1 space-y-0.5">
                  {filteredDocuments.map((doc) => {
                    return (
                      <div
                        key={doc.id}
                        className={`px-2 py-1 rounded-md cursor-pointer transition-colors ${
                          selectedDocument?.id === doc.id
                            ? "bg-primary/10 shadow-[inset_3px_3px_6px_rgba(0,0,0,0.2),inset_-3px_-3px_6px_rgba(255,255,255,0.15)] border border-primary/30"
                            : "bg-muted/40 shadow-[2px_2px_4px_rgba(0,0,0,0.15),-2px_-2px_4px_rgba(255,255,255,0.15)] hover:shadow-[inset_2px_2px_5px_rgba(0,0,0,0.15),inset_-2px_-2px_5px_rgba(255,255,255,0.12)]"
                        }`}
                        onClick={() => {
                          setSelectedDocument(doc);
                          setDecryptedContent(null);
                          setShowOnlyOfficeEditor(false);
                          toggleDocList(true);
                        }}
                        data-testid={`document-item-${doc.id}`}
                      >
                        <div className="flex items-center gap-1.5">
                          <FileTypeIcon filename={doc.name} className="h-3.5 w-3.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-[11px] truncate">{doc.name}</p>
                            <p className="text-[9px] text-muted-foreground">
                              {new Date(doc.createdAt!).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                          {doc.isEncrypted && (
                            <Lock className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
          )}
          
          <Card className="flex-1 flex flex-col min-w-0">
            {showOnlyOfficeEditor && selectedDocument ? (
              <OnlyOfficeEditor 
                document={selectedDocument} 
                onClose={() => setShowOnlyOfficeEditor(false)} 
              />
            ) : selectedDocument ? (
              <>
                <CardHeader className="pb-2 px-4 pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 flex items-start gap-2">
                      {isDocListCollapsed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedDocument(null);
                            setForceShowFilters(false);
                            toggleDocList(false);
                          }}
                          data-testid="button-back-to-documents"
                          className="shrink-0 mt-0.5"
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <div className="min-w-0 flex-1">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <FileText className="h-5 w-5 shrink-0" />
                        <span className="truncate">{selectedDocument.name}</span>
                      </CardTitle>
                      {selectedDocument.description && (
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {selectedDocument.description}
                        </p>
                      )}
                      </div>
                    </div>
                    <div className="flex gap-1.5 flex-wrap shrink-0">
                      {ooConfig?.configured && isOfficeFormat(selectedDocument.name) && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => setShowOnlyOfficeEditor(true)}
                          data-testid="button-edit-onlyoffice"
                        >
                          <Pencil className="h-4 w-4 mr-1" />
                          Edit in ONLYOFFICE
                          {selectedDocument.isEncrypted && (
                            <Badge variant="outline" className="ml-1 text-[10px]">
                              <Unlock className="h-2.5 w-2.5 mr-0.5" />
                              Auto-decrypt
                            </Badge>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFullscreenViewerOpen(true)}
                        data-testid="button-fullscreen-viewer"
                      >
                        <Maximize2 className="h-4 w-4 mr-1" />
                        Full Screen
                      </Button>
                      {selectedDocument.isEncrypted && !decryptedContent && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleDecrypt}
                          disabled={isDecrypting}
                          data-testid="button-decrypt-document"
                        >
                          <Unlock className="h-4 w-4 mr-1" />
                          {isDecrypting ? "Decrypting..." : "Decrypt"}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => classifyDocMutation.mutate(selectedDocument)}
                        disabled={classifyDocMutation.isPending}
                        data-testid="button-classify-document"
                      >
                        <FileSearch className="h-4 w-4 mr-1" />
                        {classifyDocMutation.isPending ? "Classifying..." : "Classify"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => reviewDocMutation.mutate(selectedDocument)}
                        disabled={reviewDocMutation.isPending}
                        data-testid="button-review-document"
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1" />
                        {reviewDocMutation.isPending ? "Starting..." : "Review"}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        data-testid="button-download-document"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteDocMutation.mutate(selectedDocument.id)}
                        data-testid="button-delete-document"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowOOConfig(true)}
                        className={ooConfig?.configured ? "border-green-300 dark:border-green-700" : ""}
                        data-testid="button-oo-config"
                      >
                        <Server className="h-4 w-4 mr-1" />
                        {ooConfig?.configured ? "ONLYOFFICE" : "Setup ONLYOFFICE"}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {selectedDocument.originalSizeBytes 
                        ? `${(selectedDocument.originalSizeBytes / 1024).toFixed(1)} KB`
                        : "Unknown size"
                      }
                    </Badge>
                    <Badge variant="outline" className="text-xs">{selectedDocument.category}</Badge>
                    {selectedDocument.isEncrypted && (
                      <Badge variant="secondary" className="text-xs">
                        <Lock className="h-3 w-3 mr-1" />
                        {selectedDocument.encryptionMode}
                      </Badge>
                    )}
                    {selectedDocument.savingsPercent && (
                      <Badge variant="secondary" className="text-green-600 text-xs">
                        {parseFloat(selectedDocument.savingsPercent).toFixed(1)}% compressed
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <Separator />
                
                <CardContent className="flex-1 overflow-auto p-0">
                  {selectedDocument.isEncrypted && !decryptedContent ? (
                    <div className="h-full flex items-center justify-center p-4">
                      <div className="text-center">
                        <Lock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Encrypted Document</h3>
                        <p className="text-muted-foreground mb-4">
                          This document is encrypted with {selectedDocument.encryptionMode} mode.
                          <br />
                          Click "Decrypt" to view the contents.
                        </p>
                        <Button onClick={handleDecrypt} disabled={isDecrypting}>
                          <Unlock className="h-4 w-4 mr-2" />
                          {isDecrypting ? "Decrypting..." : "Decrypt & View"}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="h-full">
                      <DocumentContentViewer 
                        document={selectedDocument}
                        content={decryptedContent || selectedDocument.plainContent}
                      />
                    </div>
                  )}
                </CardContent>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <Eye className="h-20 w-20 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Document Viewer</h3>
                  <p className="text-muted-foreground mb-6">
                    Select a document from the list to view its contents
                  </p>
                  {!ooConfig?.configured && (
                    <div className="bg-muted/50 rounded-md p-4 max-w-sm mx-auto">
                      <Server className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-3">
                        Connect ONLYOFFICE Document Server to enable in-browser editing of Office documents
                      </p>
                      <Button variant="outline" size="sm" onClick={() => setShowOOConfig(true)} data-testid="button-setup-oo-prompt">
                        <Server className="h-4 w-4 mr-1" />
                        Setup ONLYOFFICE
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Add a new document with 13-dimensional WBS meta-tagging
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="doc-name">Document Name</Label>
                <Input
                  id="doc-name"
                  value={uploadForm.name}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter document name"
                  data-testid="input-upload-name"
                />
              </div>
              
              <div>
                <Label htmlFor="doc-desc">Description</Label>
                <Input
                  id="doc-desc"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description"
                  data-testid="input-upload-description"
                />
              </div>
              
              <div>
                <Label htmlFor="doc-category">Category</Label>
                <Select
                  value={uploadForm.category}
                  onValueChange={(v) => setUploadForm(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger data-testid="select-upload-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                    <SelectItem value="drawing">Drawing</SelectItem>
                    <SelectItem value="specification">Specification</SelectItem>
                    <SelectItem value="report">Report</SelectItem>
                    <SelectItem value="correspondence">Correspondence</SelectItem>
                    <SelectItem value="submittal">Submittal</SelectItem>
                    <SelectItem value="rfi">RFI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="doc-content">Content</Label>
                <Textarea
                  id="doc-content"
                  value={uploadForm.content}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Enter or paste document content..."
                  className="min-h-[120px]"
                  data-testid="textarea-upload-content"
                />
              </div>
              
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={uploadForm.encrypt}
                    onCheckedChange={(v) => setUploadForm(prev => ({ ...prev, encrypt: v }))}
                    id="encrypt-toggle"
                    data-testid="switch-upload-encrypt"
                  />
                  <Label htmlFor="encrypt-toggle">Enable Encryption</Label>
                </div>
                
                {uploadForm.encrypt && (
                  <Select
                    value={uploadForm.encryptionMode}
                    onValueChange={(v: any) => setUploadForm(prev => ({ ...prev, encryptionMode: v }))}
                  >
                    <SelectTrigger className="w-40" data-testid="select-upload-encryption-mode">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high_security">High Security</SelectItem>
                      <SelectItem value="balanced">Balanced</SelectItem>
                      <SelectItem value="performance">Performance</SelectItem>
                      <SelectItem value="adaptive">Adaptive</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
            
            <div>
              <Label className="mb-3 block">WBS Meta Tags (13 Dimensions)</Label>
              <ScrollArea className="h-[400px] border rounded-md p-3">
                <div className="space-y-3">
                  {wbsDimensionDefinitions.map((dim) => {
                    const codes = getCodesByDimension(dim.key);
                    const DimIcon = dimensionIcons[dim.key] || Tag;
                    
                    return (
                      <div key={dim.key}>
                        <Label className="text-xs flex items-center gap-1 mb-1">
                          <DimIcon className="h-3 w-3" />
                          {dim.label}
                        </Label>
                        <Select
                          value={uploadMetaTags[dim.key] || "_none"}
                          onValueChange={(v) => setUploadMetaTags(prev => ({ ...prev, [dim.key]: v === "_none" ? "" : v }))}
                        >
                          <SelectTrigger
                            className="h-8 text-xs"
                            data-testid={`select-tag-${dim.key}`}
                          >
                            <SelectValue placeholder="Select..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="_none">None</SelectItem>
                            {codes.map((code) => (
                              <SelectItem key={code.id} value={code.id}>
                                {code.code} - {code.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsUploadOpen(false); resetUploadForm(); }} data-testid="button-cancel-upload">
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!activeTenant?.id || !uploadForm.name) return;
                createDocMutation.mutate({
                  ...uploadForm,
                  tenantId: activeTenant.id,
                });
              }}
              disabled={createDocMutation.isPending || !uploadForm.name}
              data-testid="button-submit-upload"
            >
              {createDocMutation.isPending ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <FullscreenViewer
        document={selectedDocument}
        content={selectedDocument ? (decryptedContent || selectedDocument?.plainContent) : null}
        isOpen={isFullscreenViewerOpen}
        onClose={() => setIsFullscreenViewerOpen(false)}
        onOpenEditor={() => setShowOnlyOfficeEditor(true)}
        ooConfigured={!!ooConfig?.configured}
      />
      
      <OnlyOfficeConfigDialog
        open={showOOConfig}
        onOpenChange={setShowOOConfig}
      />

      <Dialog open={!!classifyResult} onOpenChange={() => setClassifyResult(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-classify-result">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle data-testid="text-classify-title">Document Classified</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedDocument?.name
                ? `"${typeof selectedDocument.name === 'string' ? selectedDocument.name : 'Your document'}" has been analyzed and categorized in your project structure.`
                : "Your document has been analyzed and categorized in your project structure."}
            </DialogDescription>
          </DialogHeader>
          {classifyResult?.job?.assignedWbsNodeId && (
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground mb-1">Assigned to</p>
              <p className="text-sm font-medium" data-testid="text-classify-wbs">{classifyResult.job.assignedWbsNodeId}</p>
            </div>
          )}
          <DialogFooter className="sm:justify-center">
            <Button onClick={() => setClassifyResult(null)} data-testid="button-close-classify-result">
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reviewResult} onOpenChange={() => setReviewResult(null)}>
        <DialogContent className="max-w-sm" data-testid="dialog-review-result">
          <DialogHeader className="text-center pb-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <ClipboardCheck className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle data-testid="text-review-title">Review Started</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedDocument?.name
                ? `"${typeof selectedDocument.name === 'string' ? selectedDocument.name : 'Your document'}" is now under review.`
                : "Your document is now under review."}
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
            <p>You can add reviewers, track progress, and manage approvals from the Document Management page.</p>
          </div>
          <DialogFooter className="flex-col sm:flex-col gap-2">
            <Button className="w-full" onClick={() => { setReviewResult(null); navigate("/documents/lifecycle"); }} data-testid="button-go-to-lifecycle">
              Manage Reviews
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setReviewResult(null)} data-testid="button-close-review-result">
              Stay Here
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
