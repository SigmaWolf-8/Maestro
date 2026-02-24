import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Lock, 
  Unlock, 
  Plus, 
  Trash2, 
  Eye, 
  Shield, 
  Zap, 
  Clock, 
  HardDrive,
  Activity,
  Server,
  CheckCircle2,
  Archive,
  Database,
  Layers,
  FileSearch,
  ClipboardCheck
} from "lucide-react";
import type { Document } from "@shared/schema";

interface KongStats {
  totalRuns: number;
  avgSavings: string;
  totalDataProcessed: number;
  totalSavings: number;
}

interface KongTimestamp {
  success: boolean;
  timestamp: {
    humanReadable: string;
    isoDate: string;
  };
}

export default function DocumentsPage() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewDocument, setViewDocument] = useState<Document | null>(null);
  const [decryptedContent, setDecryptedContent] = useState<string | null>(null);

  const [newDoc, setNewDoc] = useState({
    name: "",
    description: "",
    category: "general",
    content: "",
    encrypt: false,
    encryptionMode: "balanced" as "high_security" | "balanced" | "performance" | "adaptive",
  });

  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/documents?tenantId=${activeTenant.id}`);
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: kongStats } = useQuery<KongStats>({
    queryKey: ["/api/kong/stats"],
  });

  const { data: kongTimestamp } = useQuery<KongTimestamp>({
    queryKey: ["/api/kong/timestamp"],
    refetchInterval: 60000,
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newDoc & { tenantId: string }) => {
      return apiRequest("POST", "/api/documents", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setIsCreateOpen(false);
      setNewDoc({
        name: "",
        description: "",
        category: "general",
        content: "",
        encrypt: false,
        encryptionMode: "balanced",
      });
      toast({ title: "Document created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Error creating document", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Document deleted" });
    },
  });

  const classifyMutation = useMutation({
    mutationFn: async (doc: Document) => {
      return apiRequest("POST", "/api/classification/classify", {
        documentId: doc.id,
        intakePath: "manual_upload",
      });
    },
    onSuccess: (_data, doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/classification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classification/jobs?limit=20"] });
      toast({ title: `Classification started for ${doc.name}` });
    },
    onError: (error: Error) => {
      toast({ title: "Classification failed", description: error.message, variant: "destructive" });
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (doc: Document) => {
      return apiRequest("POST", "/api/reviews/sessions", {
        documentId: doc.id,
      });
    },
    onSuccess: (_data, doc) => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/sessions?limit=20"] });
      toast({ title: `Review session created for ${doc.name}` });
    },
    onError: (error: Error) => {
      toast({ title: "Review session failed", description: error.message, variant: "destructive" });
    },
  });

  const handleDecrypt = async (doc: Document) => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/decrypt`);
      const data = await res.json();
      setDecryptedContent(data.content);
      setViewDocument(doc);
    } catch (error) {
      toast({ title: "Decryption failed", variant: "destructive" });
    }
  };

  const handleCreate = () => {
    if (!activeTenant?.id) return;
    createMutation.mutate({
      ...newDoc,
      tenantId: activeTenant.id,
    });
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getStatusBadge = (status: string, isEncrypted: boolean) => {
    if (isEncrypted) {
      return <Badge variant="default" className="bg-green-600"><Lock className="w-3 h-3 mr-1" />Encrypted</Badge>;
    }
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "approved":
        return <Badge variant="default" className="bg-blue-600">Approved</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getEncryptionModeLabel = (mode: string) => {
    switch (mode) {
      case "high_security":
        return "High Security";
      case "balanced":
        return "Balanced";
      case "performance":
        return "Performance";
      case "adaptive":
        return "Adaptive";
      default:
        return mode;
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Manager</h1>
          <p className="text-muted-foreground">Secure document storage with Kong-powered encryption</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-document">
              <Plus className="w-4 h-4 mr-2" />
              New Document
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create New Document</DialogTitle>
              <DialogDescription>
                Add a new document with optional encryption via Kong Phase API
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-name">Document Name</Label>
                  <Input
                    id="doc-name"
                    data-testid="input-document-name"
                    value={newDoc.name}
                    onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    placeholder="Enter document name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="doc-category">Category</Label>
                  <Select
                    value={newDoc.category}
                    onValueChange={(v) => setNewDoc({ ...newDoc, category: v })}
                  >
                    <SelectTrigger data-testid="select-document-category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="contracts">Contracts</SelectItem>
                      <SelectItem value="specifications">Specifications</SelectItem>
                      <SelectItem value="permits">Permits</SelectItem>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="reports">Reports</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-description">Description</Label>
                <Input
                  id="doc-description"
                  data-testid="input-document-description"
                  value={newDoc.description}
                  onChange={(e) => setNewDoc({ ...newDoc, description: e.target.value })}
                  placeholder="Brief description"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="doc-content">Content</Label>
                <Textarea
                  id="doc-content"
                  data-testid="textarea-document-content"
                  value={newDoc.content}
                  onChange={(e) => setNewDoc({ ...newDoc, content: e.target.value })}
                  placeholder="Document content to encrypt and store..."
                  rows={6}
                />
              </div>
              <Card className="bg-muted/50">
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-medium">Enable Encryption</p>
                        <p className="text-sm text-muted-foreground">
                          Encrypt using Kong Phase API with ~56% compression
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={newDoc.encrypt}
                      onCheckedChange={(c) => setNewDoc({ ...newDoc, encrypt: c })}
                      data-testid="switch-enable-encryption"
                    />
                  </div>
                  {newDoc.encrypt && (
                    <div className="mt-4 space-y-2">
                      <Label>Encryption Mode</Label>
                      <Select
                        value={newDoc.encryptionMode}
                        onValueChange={(v: any) => setNewDoc({ ...newDoc, encryptionMode: v })}
                      >
                        <SelectTrigger data-testid="select-encryption-mode">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high_security">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4" />
                              High Security - Maximum protection
                            </div>
                          </SelectItem>
                          <SelectItem value="balanced">
                            <div className="flex items-center gap-2">
                              <Zap className="w-4 h-4" />
                              Balanced - Security + Performance
                            </div>
                          </SelectItem>
                          <SelectItem value="performance">
                            <div className="flex items-center gap-2">
                              <Activity className="w-4 h-4" />
                              Performance - Speed optimized
                            </div>
                          </SelectItem>
                          <SelectItem value="adaptive">
                            <div className="flex items-center gap-2">
                              <Server className="w-4 h-4" />
                              Adaptive - Auto-adjusting
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCreate} 
                disabled={!newDoc.name || createMutation.isPending}
                data-testid="button-save-document"
              >
                {createMutation.isPending ? "Creating..." : "Create Document"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Encrypted</CardTitle>
            <Lock className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {documents.filter(d => d.isEncrypted).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">.tern Format</CardTitle>
            <Archive className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-tern-count">
              {documents.filter(d => d.ternEnabled).length}
            </div>
            <p className="text-xs text-muted-foreground">Optimized storage</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Savings</CardTitle>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kongStats?.avgSavings || "56"}%</div>
            <p className="text-xs text-muted-foreground">Kong compression rate</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kong Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">Active</div>
            <p className="text-xs text-muted-foreground truncate">
              {kongTimestamp?.timestamp?.humanReadable?.slice(0, 19) || "Connected"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
          <CardDescription>
            All documents with encryption status and compression savings
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No documents yet</p>
              <p className="text-sm">Create your first encrypted document</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover-elevate"
                  data-testid={`document-row-${doc.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-muted rounded">
                      {doc.ternEnabled ? (
                        <Archive className="w-5 h-5 text-primary" />
                      ) : doc.isEncrypted ? (
                        <Lock className="w-5 h-5 text-green-600" />
                      ) : (
                        <FileText className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-medium">{doc.name}</h3>
                        {doc.ternEnabled && (
                          <Badge variant="outline" className="text-[10px]" data-testid={`badge-tern-${doc.id}`}>
                            <Archive className="w-2.5 h-2.5 mr-1" />.tern
                          </Badge>
                        )}
                        {doc.ternEncrypted && (
                          <Badge variant="outline" className="text-[10px] border-green-600/30 text-green-600" data-testid={`badge-tern-encrypted-${doc.id}`}>
                            <Lock className="w-2.5 h-2.5 mr-1" />Phase
                          </Badge>
                        )}
                        {doc.ternShardIndex !== null && doc.ternShardIndex !== undefined && (
                          <Badge variant="secondary" className="text-[10px]" data-testid={`badge-shard-${doc.id}`}>
                            <Database className="w-2.5 h-2.5 mr-1" />Shard {doc.ternShardIndex}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>{doc.category}</span>
                        {doc.originalSizeBytes && (
                          <>
                            <span>•</span>
                            <span>{formatBytes(doc.originalSizeBytes)}</span>
                          </>
                        )}
                        {doc.savingsPercent && Number(doc.savingsPercent) > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-600">
                              {Number(doc.savingsPercent).toFixed(1)}% saved
                            </span>
                          </>
                        )}
                        {doc.ternEnabled && doc.ternHeader && (
                          <>
                            <span>•</span>
                            <span className="text-primary">
                              {(() => {
                                const header = doc.ternHeader as Record<string, unknown>;
                                const ratio = Number(header?.compressionRatio ?? 0);
                                return ratio > 0 ? `${ratio.toFixed(1)}% compressed` : "Ternary encoded";
                              })()}
                            </span>
                          </>
                        )}
                        {doc.encryptionMode && (
                          <>
                            <span>•</span>
                            <span>{getEncryptionModeLabel(doc.encryptionMode)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {getStatusBadge(doc.status, doc.isEncrypted || false)}
                    {doc.ternEnabled && (
                      <Badge variant="default" className="bg-primary/90" data-testid={`badge-tern-active-${doc.id}`}>
                        <Layers className="w-3 h-3 mr-1" />Ternary
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => classifyMutation.mutate(doc)}
                      disabled={classifyMutation.isPending}
                      data-testid={`button-classify-${doc.id}`}
                    >
                      <FileSearch className="w-4 h-4 mr-1" />
                      Classify
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => reviewMutation.mutate(doc)}
                      disabled={reviewMutation.isPending}
                      data-testid={`button-review-${doc.id}`}
                    >
                      <ClipboardCheck className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    {doc.isEncrypted ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDecrypt(doc)}
                        data-testid={`button-decrypt-${doc.id}`}
                      >
                        <Unlock className="w-4 h-4 mr-1" />
                        Decrypt
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDecryptedContent(doc.plainContent);
                          setViewDocument(doc);
                        }}
                        data-testid={`button-view-${doc.id}`}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(doc.id)}
                      data-testid={`button-delete-${doc.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!viewDocument} onOpenChange={() => { setViewDocument(null); setDecryptedContent(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {viewDocument?.isEncrypted && <Lock className="w-5 h-5 text-green-600" />}
              {viewDocument?.name}
            </DialogTitle>
            <DialogDescription>
              {viewDocument?.description || "No description"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {viewDocument?.isEncrypted && (
              <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg text-sm">
                <Shield className="w-4 h-4 text-green-600" />
                <span>Decrypted using Kong Phase API - {getEncryptionModeLabel(viewDocument.encryptionMode || "balanced")} mode</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Document Content</Label>
              <div className="p-4 bg-muted rounded-lg font-mono text-sm whitespace-pre-wrap max-h-96 overflow-auto">
                {decryptedContent || "No content available"}
              </div>
            </div>
            {viewDocument && (
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Category:</span>
                  <p className="font-medium">{viewDocument.category}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Original Size:</span>
                  <p className="font-medium">{formatBytes(viewDocument.originalSizeBytes)}</p>
                </div>
                {viewDocument.savingsPercent && Number(viewDocument.savingsPercent) > 0 && (
                  <div>
                    <span className="text-muted-foreground">Compression:</span>
                    <p className="font-medium text-green-600">
                      {Number(viewDocument.savingsPercent).toFixed(1)}% saved
                    </p>
                  </div>
                )}
              </div>
            )}
            {viewDocument?.ternEnabled && (
              <div className="p-3 bg-muted/50 rounded-lg space-y-2" data-testid="tern-info-panel">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Archive className="w-4 h-4 text-primary" />
                  PlenumNET .tern Format
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Storage:</span>
                    <p className="font-medium text-primary">Ternary Encoded</p>
                  </div>
                  {viewDocument.ternShardIndex !== null && viewDocument.ternShardIndex !== undefined && (
                    <div>
                      <span className="text-muted-foreground">Shard Index:</span>
                      <p className="font-medium">{viewDocument.ternShardIndex} / 28</p>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">Phase Encrypted:</span>
                    <p className="font-medium">{viewDocument.ternEncrypted ? "Yes" : "No"}</p>
                  </div>
                </div>
                {viewDocument.ternHeader && (() => {
                  const h = viewDocument.ternHeader as Record<string, unknown>;
                  const origSize = Number(h?.originalSize ?? 0);
                  const compSize = Number(h?.compressedSize ?? 0);
                  const ratio = Number(h?.compressionRatio ?? 0);
                  return (
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Original:</span>
                        <p className="font-medium">{formatBytes(origSize)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Compressed:</span>
                        <p className="font-medium">{formatBytes(compSize)}</p>
                      </div>
                      {ratio > 0 && (
                        <div>
                          <span className="text-muted-foreground">Ratio:</span>
                          <p className="font-medium text-primary">
                            {ratio.toFixed(1)}%
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
            {viewDocument?.kongTimestamp && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                Kong Timestamp: {viewDocument.kongTimestamp}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => { setViewDocument(null); setDecryptedContent(null); }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
