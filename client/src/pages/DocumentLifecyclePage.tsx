import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Activity,
  FileSearch,
  Upload,
  ClipboardCheck,
  Archive,
  AlertTriangle,
  Plus,
  Play,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString() + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatConfidence(val: number | string | null | undefined): string {
  if (val === null || val === undefined) return "—";
  return `${(Number(val) * 100).toFixed(1)}%`;
}

function shortRef(id: string | null | undefined): string {
  if (!id) return "—";
  if (id.length <= 12) return id;
  return id.substring(0, 8) + "\u2026";
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  "document.captured": "Captured",
  "document.classified": "Classified",
  "document.uploaded": "Uploaded",
  "document.reviewed": "Reviewed",
  "document.approved": "Approved",
  "document.rejected": "Rejected",
  "document.archived": "Archived",
  "document.reclassified": "Reclassified",
  captured: "Captured",
  classified: "Classified",
  uploaded: "Uploaded",
  reviewed: "Reviewed",
  approved: "Approved",
  rejected: "Rejected",
  archived: "Archived",
  reclassified: "Reclassified",
};

function friendlyEventType(raw: string): string {
  return EVENT_TYPE_LABELS[raw] || raw.replace(/^document\./, "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

const INTAKE_PATH_LABELS: Record<string, string> = {
  manual_upload: "Manual Upload",
  field_capture: "Field Photo / Capture",
  bulk_zip: "Bulk ZIP Import",
  email: "Email Attachment",
  api_upload: "Automated Import",
  legacy_migration: "Historical Import",
  onlyoffice_output: "Office Document Export",
};

const PRIORITY_LABELS: Record<string, string> = {
  general: "Standard",
  safety: "Safety Critical",
};

const ARCHIVE_TYPE_LABELS: Record<string, string> = {
  closeout: "Project Closeout",
  periodic: "Periodic Backup",
  on_demand: "On Demand",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  needs_review: "Needs Review",
  queued: "In Queue",
  uploading: "Uploading",
  uploaded: "Uploaded",
  verified: "Verified",
  staged: "Ready",
  in_review: "Under Review",
  approved: "Approved",
  rejected: "Rejected",
  escalated: "Escalated",
  assembling: "Assembling",
  sealed: "Sealed",
  witnessed: "Witnessed",
  signing: "Awaiting Signature",
};

function friendlyStatus(raw: string): string {
  return STATUS_LABELS[raw] || raw.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}

function StatCard({ title, value, icon, loading }: { title: string; value: string | number; icon: React.ReactNode; loading?: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-1 space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-7 w-16" data-testid={`skeleton-stat-${title.toLowerCase().replace(/\s+/g, "-")}`} />
        ) : (
          <div className="text-2xl font-bold" data-testid={`stat-${title.toLowerCase().replace(/\s+/g, "-")}`}>{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingTable({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {Array.from({ length: cols }).map((_, i) => (
            <TableHead key={i}><Skeleton className="h-4 w-20" /></TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {Array.from({ length: rows }).map((_, r) => (
          <TableRow key={r}>
            {Array.from({ length: cols }).map((_, c) => (
              <TableCell key={c}><Skeleton className="h-4 w-full" /></TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function useDocumentNames() {
  const { data: docs = [] } = useQuery<any[]>({
    queryKey: ["/api/documents"],
    staleTime: 60000,
  });
  const nameMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const doc of docs) {
      if (doc.id && doc.name) map[doc.id] = doc.name;
    }
    return map;
  }, [docs]);
  return (id: string | null | undefined): string => {
    if (!id) return "—";
    return nameMap[id] || shortRef(id);
  };
}

const EVENT_TYPE_COLORS: Record<string, string> = {
  captured: "bg-blue-600",
  classified: "bg-green-600",
  uploaded: "bg-purple-600",
  reviewed: "bg-amber-600",
  approved: "bg-emerald-600",
  rejected: "bg-red-600",
  archived: "bg-slate-600",
  reclassified: "bg-teal-600",
};

function eventBadgeColor(eventType: string): string {
  const key = eventType.replace(/^document\./, "");
  return EVENT_TYPE_COLORS[key] || "bg-gray-500";
}

const CLASSIFICATION_STATUS_VARIANTS: Record<string, { className: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending: { className: "bg-gray-500", variant: "secondary" },
  processing: { className: "bg-blue-600", variant: "default" },
  completed: { className: "bg-green-600", variant: "default" },
  failed: { className: "bg-red-600", variant: "destructive" },
  needs_review: { className: "bg-yellow-500 text-black", variant: "default" },
};

const UPLOAD_STATUS_VARIANTS: Record<string, string> = {
  queued: "bg-gray-500",
  uploading: "bg-blue-600",
  uploaded: "bg-green-600",
  verified: "bg-emerald-600",
  failed: "bg-red-600",
};

const REVIEW_STATUS_VARIANTS: Record<string, string> = {
  staged: "bg-gray-500",
  in_review: "bg-blue-600",
  approved: "bg-green-600",
  rejected: "bg-red-600",
  escalated: "bg-amber-600",
};

const ARCHIVE_STATUS_VARIANTS: Record<string, string> = {
  pending: "bg-gray-500",
  assembling: "bg-blue-600",
  sealed: "bg-green-600",
  witnessed: "bg-emerald-600",
  failed: "bg-red-600",
};

function EventLogTab() {
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const docName = useDocumentNames();

  const { data: events = [], isLoading } = useQuery<any[]>({
    queryKey: ["/api/events?limit=50"],
  });

  const filteredEvents = eventTypeFilter === "all"
    ? events
    : events.filter((e: any) => e.eventType === eventTypeFilter);

  const eventTypes = [...new Set(events.map((e: any) => e.eventType))];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
          <SelectTrigger className="w-[200px]" data-testid="select-event-type-filter">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activity</SelectItem>
            {eventTypes.map((type) => (
              <SelectItem key={type} value={type}>{friendlyEventType(type)}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="text-sm text-muted-foreground" data-testid="text-event-count">
          {filteredEvents.length} {filteredEvents.length === 1 ? "event" : "events"}
        </span>
      </div>

      {isLoading ? (
        <LoadingTable rows={8} cols={5} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Action</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Project</TableHead>
                <TableHead>By</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEvents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No recent activity to show
                  </TableCell>
                </TableRow>
              ) : (
                filteredEvents.map((event: any, idx: number) => (
                  <TableRow key={event.id || idx} data-testid={`row-event-${event.id || idx}`}>
                    <TableCell>
                      <Badge className={eventBadgeColor(event.eventType)} data-testid={`badge-event-type-${event.id || idx}`}>
                        {friendlyEventType(event.eventType)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{docName(event.documentId)}</TableCell>
                    <TableCell className="text-sm font-mono">{shortRef(event.projectId)}</TableCell>
                    <TableCell className="text-sm">{shortRef(event.userId || event.actorId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(event.createdAt || event.timestamp)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ClassificationTab() {
  const { toast } = useToast();
  const docName = useDocumentNames();
  const [isClassifyOpen, setIsClassifyOpen] = useState(false);
  const [classifyDocId, setClassifyDocId] = useState("");
  const [classifyProjectId, setClassifyProjectId] = useState("");
  const [classifyIntakePath, setClassifyIntakePath] = useState("manual_upload");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/classification/stats"],
  });

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<any[]>({
    queryKey: ["/api/classification/jobs?limit=20"],
  });

  const classifyMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/classification/classify", body);
    },
    onSuccess: () => {
      toast({ title: "Document sorting started" });
      queryClient.invalidateQueries({ queryKey: ["/api/classification/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/classification/jobs?limit=20"] });
      setIsClassifyOpen(false);
      setClassifyDocId("");
      setClassifyProjectId("");
      setClassifyIntakePath("manual_upload");
    },
    onError: (error: Error) => {
      toast({ title: "Sorting failed", description: error.message, variant: "destructive" });
    },
  });

  const completedCount = stats?.byStatus?.completed ?? 0;
  const failedCount = stats?.byStatus?.failed ?? 0;
  const totalCount = stats?.totalJobs ?? 0;
  const inProgressCount = (stats?.byStatus?.pending ?? 0) + (stats?.byStatus?.processing ?? 0) + (stats?.byStatus?.in_progress ?? 0);
  const processingCount = inProgressCount > 0 ? inProgressCount : Math.max(0, totalCount - completedCount - failedCount);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid gap-4 md:grid-cols-4 flex-1">
          <StatCard title="Documents Sorted" value={totalCount} icon={<FileSearch className="h-4 w-4 text-muted-foreground" />} loading={statsLoading} />
          <StatCard title="Completed" value={completedCount} icon={<CheckCircle className="h-4 w-4 text-green-600" />} loading={statsLoading} />
          <StatCard title="In Progress" value={processingCount > 0 ? processingCount : 0} icon={<RefreshCw className="h-4 w-4 text-blue-600" />} loading={statsLoading} />
          <StatCard title="Issues" value={failedCount} icon={<XCircle className="h-4 w-4 text-red-600" />} loading={statsLoading} />
        </div>
        <Dialog open={isClassifyOpen} onOpenChange={setIsClassifyOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-classify-document">
              <Plus className="h-4 w-4 mr-1.5" />
              Sort Document
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-classify-document">
            <DialogHeader>
              <DialogTitle>Sort a Document</DialogTitle>
              <DialogDescription>Submit a document to be automatically sorted and categorized.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="classify-doc-id">Document *</Label>
                <Input
                  id="classify-doc-id"
                  value={classifyDocId}
                  onChange={(e) => setClassifyDocId(e.target.value)}
                  placeholder="e.g. invoice-2024-001 or paste reference"
                  data-testid="input-classify-document-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="classify-project-id">Project</Label>
                <Input
                  id="classify-project-id"
                  value={classifyProjectId}
                  onChange={(e) => setClassifyProjectId(e.target.value)}
                  placeholder="Link to a project (optional)"
                  data-testid="input-classify-project-id"
                />
              </div>
              <div className="space-y-2">
                <Label>How was this document received?</Label>
                <Select value={classifyIntakePath} onValueChange={setClassifyIntakePath}>
                  <SelectTrigger data-testid="select-classify-intake-path">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manual_upload">Manual Upload</SelectItem>
                    <SelectItem value="field_capture">Field Photo / Capture</SelectItem>
                    <SelectItem value="bulk_zip">Bulk ZIP Import</SelectItem>
                    <SelectItem value="email">Email Attachment</SelectItem>
                    <SelectItem value="api_upload">Automated Import</SelectItem>
                    <SelectItem value="legacy_migration">Historical Import</SelectItem>
                    <SelectItem value="onlyoffice_output">Office Document Export</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => classifyMutation.mutate({ documentId: classifyDocId, projectId: classifyProjectId || undefined, intakePath: classifyIntakePath })}
                disabled={!classifyDocId.trim() || classifyMutation.isPending}
                data-testid="button-submit-classify"
              >
                {classifyMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                Start Sorting
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {jobsLoading ? (
        <LoadingTable rows={6} cols={7} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Accuracy</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No documents have been sorted yet
                  </TableCell>
                </TableRow>
              ) : (
                jobs.map((job: any, idx: number) => {
                  const statusConfig = CLASSIFICATION_STATUS_VARIANTS[job.status] || { className: "bg-gray-500", variant: "secondary" as const };
                  return (
                    <TableRow key={job.id || idx} data-testid={`row-classification-${job.id || idx}`}>
                      <TableCell className="text-sm font-medium">{docName(job.documentId)}</TableCell>
                      <TableCell>
                        <Badge className={statusConfig.className} data-testid={`badge-classification-status-${job.id || idx}`}>
                          {friendlyStatus(job.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{INTAKE_PATH_LABELS[job.intakePath] || job.intakePath || "—"}</TableCell>
                      <TableCell className="text-sm">{formatConfidence(job.confidenceScore)}</TableCell>
                      <TableCell className="text-sm font-mono">{shortRef(job.assignedWbsNodeId || job.wbsNodeId)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(job.createdAt)}</TableCell>
                      <TableCell>
                        {job.status === "failed" ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => classifyMutation.mutate({ documentId: job.documentId, intakePath: job.intakePath || "manual_upload" })}
                            disabled={classifyMutation.isPending}
                            data-testid={`button-retry-classification-${job.id || idx}`}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Try Again
                          </Button>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function UploadQueueTab() {
  const { toast } = useToast();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadFileName, setUploadFileName] = useState("");
  const [uploadFileType, setUploadFileType] = useState("");
  const [uploadFileSize, setUploadFileSize] = useState("");
  const [uploadProjectId, setUploadProjectId] = useState("");
  const [uploadWbsPath, setUploadWbsPath] = useState("");
  const [uploadPriority, setUploadPriority] = useState("general");
  const [uploadChunkCount, setUploadChunkCount] = useState("1");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/uploads/stats"],
  });

  const { data: uploads = [], isLoading: uploadsLoading } = useQuery<any[]>({
    queryKey: ["/api/uploads?limit=20"],
  });

  const queueUploadMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/uploads", body);
    },
    onSuccess: () => {
      toast({ title: "File added to upload queue" });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads?limit=20"] });
      setIsUploadOpen(false);
      setUploadFileName("");
      setUploadFileType("");
      setUploadFileSize("");
      setUploadProjectId("");
      setUploadWbsPath("");
      setUploadPriority("general");
      setUploadChunkCount("1");
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const completeUploadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/uploads/${id}/complete`);
    },
    onSuccess: () => {
      toast({ title: "Upload marked as complete" });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not complete upload", description: error.message, variant: "destructive" });
    },
  });

  const retryUploadMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/uploads/${id}/retry`);
    },
    onSuccess: () => {
      toast({ title: "Retrying upload" });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/uploads?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Retry failed", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid gap-4 md:grid-cols-4 flex-1">
          <StatCard title="Total Files" value={stats?.total ?? 0} icon={<Upload className="h-4 w-4 text-muted-foreground" />} loading={statsLoading} />
          <StatCard title="Waiting" value={(stats?.byStatus?.queued ?? 0) + (stats?.byStatus?.pending ?? 0)} icon={<Upload className="h-4 w-4 text-gray-500" />} loading={statsLoading} />
          <StatCard title="Uploading Now" value={stats?.byStatus?.uploading ?? 0} icon={<Upload className="h-4 w-4 text-blue-600" />} loading={statsLoading} />
          <StatCard title="Done" value={stats?.byStatus?.uploaded ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-600" />} loading={statsLoading} />
        </div>
        <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-queue-upload">
              <Plus className="h-4 w-4 mr-1.5" />
              Add File
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-queue-upload">
            <DialogHeader>
              <DialogTitle>Add File to Upload Queue</DialogTitle>
              <DialogDescription>Add a new file to be uploaded and processed.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="upload-file-name">File Name *</Label>
                <Input
                  id="upload-file-name"
                  value={uploadFileName}
                  onChange={(e) => setUploadFileName(e.target.value)}
                  placeholder="e.g. site-inspection-report.pdf"
                  data-testid="input-upload-file-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="upload-file-type">File Type</Label>
                  <Input
                    id="upload-file-type"
                    value={uploadFileType}
                    onChange={(e) => setUploadFileType(e.target.value)}
                    placeholder="e.g. pdf, docx"
                    data-testid="input-upload-file-type"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-file-size">File Size</Label>
                  <Input
                    id="upload-file-size"
                    type="number"
                    value={uploadFileSize}
                    onChange={(e) => setUploadFileSize(e.target.value)}
                    placeholder="Optional"
                    data-testid="input-upload-file-size"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-project-id">Project</Label>
                <Input
                  id="upload-project-id"
                  value={uploadProjectId}
                  onChange={(e) => setUploadProjectId(e.target.value)}
                  placeholder="Link to a project (optional)"
                  data-testid="input-upload-project-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="upload-wbs-path">Destination Folder</Label>
                <Input
                  id="upload-wbs-path"
                  value={uploadWbsPath}
                  onChange={(e) => setUploadWbsPath(e.target.value)}
                  placeholder="Where should this file be stored? (optional)"
                  data-testid="input-upload-wbs-path"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={uploadPriority} onValueChange={setUploadPriority}>
                    <SelectTrigger data-testid="select-upload-priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Standard</SelectItem>
                      <SelectItem value="safety">Safety Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="upload-chunk-count">Parts</Label>
                  <Input
                    id="upload-chunk-count"
                    type="number"
                    value={uploadChunkCount}
                    onChange={(e) => setUploadChunkCount(e.target.value)}
                    min={1}
                    data-testid="input-upload-chunk-count"
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => queueUploadMutation.mutate({
                  fileName: uploadFileName,
                  fileType: uploadFileType || undefined,
                  fileSizeBytes: uploadFileSize ? Number(uploadFileSize) : undefined,
                  projectId: uploadProjectId || undefined,
                  wbsDestinationPath: uploadWbsPath || undefined,
                  priority: uploadPriority,
                  chunkCount: Number(uploadChunkCount) || 1,
                })}
                disabled={!uploadFileName.trim() || queueUploadMutation.isPending}
                data-testid="button-submit-upload"
              >
                {queueUploadMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Upload className="h-4 w-4 mr-1.5" />}
                Add to Queue
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {uploadsLoading ? (
        <LoadingTable rows={6} cols={8} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>File Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {uploads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No files in the upload queue
                  </TableCell>
                </TableRow>
              ) : (
                uploads.map((entry: any, idx: number) => (
                  <TableRow key={entry.id || idx} data-testid={`row-upload-${entry.id || idx}`}>
                    <TableCell className="text-sm font-medium">{entry.fileName || "—"}</TableCell>
                    <TableCell>
                      <Badge className={UPLOAD_STATUS_VARIANTS[entry.status] || "bg-gray-500"} data-testid={`badge-upload-status-${entry.id || idx}`}>
                        {friendlyStatus(entry.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={entry.priority === "safety" ? "bg-red-600" : "bg-gray-500"}
                        data-testid={`badge-upload-priority-${entry.id || idx}`}
                      >
                        {PRIORITY_LABELS[entry.priority] || "Standard"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.chunksUploaded !== undefined && entry.chunkCount
                        ? `${entry.chunksUploaded} of ${entry.chunkCount}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{formatBytes(entry.fileSizeBytes)}</TableCell>
                    <TableCell className="text-sm">{shortRef(entry.userId)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(entry.createdAt)}</TableCell>
                    <TableCell>
                      {entry.status === "uploading" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => completeUploadMutation.mutate(entry.id)}
                          disabled={completeUploadMutation.isPending}
                          data-testid={`button-complete-upload-${entry.id || idx}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Mark Done
                        </Button>
                      )}
                      {entry.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => retryUploadMutation.mutate(entry.id)}
                          disabled={retryUploadMutation.isPending}
                          data-testid={`button-retry-upload-${entry.id || idx}`}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Try Again
                        </Button>
                      )}
                      {entry.status !== "uploading" && entry.status !== "failed" && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ReviewPipelineTab() {
  const { toast } = useToast();
  const docName = useDocumentNames();
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewDocId, setReviewDocId] = useState("");
  const [reviewProjectId, setReviewProjectId] = useState("");
  const [reviewWindowHours, setReviewWindowHours] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/reviews/stats"],
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery<any[]>({
    queryKey: ["/api/reviews/sessions?limit=20"],
  });

  const { data: overdue = [] } = useQuery<any[]>({
    queryKey: ["/api/reviews/overdue"],
  });

  const createReviewMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/reviews/sessions", body);
    },
    onSuccess: () => {
      toast({ title: "Review created" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/sessions?limit=20"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/overdue"] });
      setIsReviewOpen(false);
      setReviewDocId("");
      setReviewProjectId("");
      setReviewWindowHours("");
    },
    onError: (error: Error) => {
      toast({ title: "Could not create review", description: error.message, variant: "destructive" });
    },
  });

  const startReviewMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/reviews/sessions/${id}/start`);
    },
    onSuccess: () => {
      toast({ title: "Review started" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/sessions?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not start review", description: error.message, variant: "destructive" });
    },
  });

  const assignReviewersMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/reviews/sessions/${id}/assign`);
    },
    onSuccess: () => {
      toast({ title: "Reviewers assigned" });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/sessions?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not assign reviewers", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      await apiRequest("PATCH", `/api/reviews/sessions/${id}/status`, { status });
    },
    onSuccess: (_data, variables) => {
      const label = variables.status === "approved" ? "approved" : variables.status === "rejected" ? "rejected" : "updated";
      toast({ title: `Review ${label}` });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/sessions?limit=20"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/overdue"] });
      queryClient.invalidateQueries({ queryKey: ["/api/events?limit=50"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not update review", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      {overdue.length > 0 && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 rounded-md" data-testid="alert-overdue-reviews">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
            {overdue.length} overdue {overdue.length !== 1 ? "reviews need" : "review needs"} your attention
          </span>
          <Badge className="bg-amber-600 ml-auto" data-testid="badge-overdue-count">{overdue.length}</Badge>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid gap-4 md:grid-cols-4 flex-1">
          <StatCard title="Total Reviews" value={stats?.totalSessions ?? 0} icon={<ClipboardCheck className="h-4 w-4 text-muted-foreground" />} loading={statsLoading} />
          <StatCard title="Under Review" value={(stats?.byStatus?.in_review ?? 0) + (stats?.byStatus?.staged ?? 0)} icon={<ClipboardCheck className="h-4 w-4 text-blue-600" />} loading={statsLoading} />
          <StatCard title="Approved" value={stats?.byStatus?.approved ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-600" />} loading={statsLoading} />
          <StatCard title="Rejected" value={stats?.byStatus?.rejected ?? 0} icon={<XCircle className="h-4 w-4 text-red-600" />} loading={statsLoading} />
        </div>
        <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-review-session">
              <Plus className="h-4 w-4 mr-1.5" />
              New Review
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-new-review-session">
            <DialogHeader>
              <DialogTitle>Start a New Review</DialogTitle>
              <DialogDescription>Create a review for a document that needs approval.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="review-doc-id">Document *</Label>
                <Input
                  id="review-doc-id"
                  value={reviewDocId}
                  onChange={(e) => setReviewDocId(e.target.value)}
                  placeholder="e.g. change-order-042 or paste reference"
                  data-testid="input-review-document-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-project-id">Project</Label>
                <Input
                  id="review-project-id"
                  value={reviewProjectId}
                  onChange={(e) => setReviewProjectId(e.target.value)}
                  placeholder="Link to a project (optional)"
                  data-testid="input-review-project-id"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-window-hours">Review Deadline (hours)</Label>
                <Input
                  id="review-window-hours"
                  type="number"
                  value={reviewWindowHours}
                  onChange={(e) => setReviewWindowHours(e.target.value)}
                  placeholder="72 (default 3 days)"
                  data-testid="input-review-window-hours"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createReviewMutation.mutate({
                  documentId: reviewDocId,
                  projectId: reviewProjectId || undefined,
                  reviewWindowHours: reviewWindowHours ? Number(reviewWindowHours) : undefined,
                })}
                disabled={!reviewDocId.trim() || createReviewMutation.isPending}
                data-testid="button-submit-review"
              >
                {createReviewMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Play className="h-4 w-4 mr-1.5" />}
                Create Review
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {sessionsLoading ? (
        <LoadingTable rows={6} cols={7} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Revision</TableHead>
                <TableHead>Reviewers</TableHead>
                <TableHead>Due By</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No reviews have been started yet
                  </TableCell>
                </TableRow>
              ) : (
                sessions.map((session: any, idx: number) => (
                  <TableRow key={session.id || idx} data-testid={`row-review-${session.id || idx}`}>
                    <TableCell className="text-sm font-medium">{docName(session.documentId)}</TableCell>
                    <TableCell>
                      <Badge className={REVIEW_STATUS_VARIANTS[session.status] || "bg-gray-500"} data-testid={`badge-review-status-${session.id || idx}`}>
                        {friendlyStatus(session.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{session.currentRevision ?? session.revision ?? "—"}</TableCell>
                    <TableCell className="text-sm">{session.reviewerCount ?? session.reviewers?.length ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(session.deadline || session.reviewDeadline)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(session.createdAt)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        {session.status === "staged" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startReviewMutation.mutate(session.id)}
                            disabled={startReviewMutation.isPending}
                            data-testid={`button-start-review-${session.id || idx}`}
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Begin Review
                          </Button>
                        )}
                        {session.status === "in_review" && (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => updateStatusMutation.mutate({ id: session.id, status: "approved" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-approve-review-${session.id || idx}`}
                            >
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatusMutation.mutate({ id: session.id, status: "rejected" })}
                              disabled={updateStatusMutation.isPending}
                              data-testid={`button-reject-review-${session.id || idx}`}
                            >
                              <XCircle className="h-3 w-3 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {(session.status === "approved" || session.status === "rejected") && (
                          <Badge className={session.status === "approved" ? "bg-green-600" : "bg-red-600"}>
                            {session.status === "approved" ? "Approved" : "Rejected"}
                          </Badge>
                        )}
                        {session.status !== "staged" && session.status !== "in_review" && session.status !== "approved" && session.status !== "rejected" && (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function ArchivesTab() {
  const { toast } = useToast();
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveProjectId, setArchiveProjectId] = useState("");
  const [archiveType, setArchiveType] = useState("closeout");

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/archives/stats"],
  });

  const { data: archives = [], isLoading: archivesLoading } = useQuery<any[]>({
    queryKey: ["/api/archives?limit=20"],
  });

  const createArchiveMutation = useMutation({
    mutationFn: async (body: any) => {
      await apiRequest("POST", "/api/archives", body);
    },
    onSuccess: () => {
      toast({ title: "Archive created" });
      queryClient.invalidateQueries({ queryKey: ["/api/archives/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archives?limit=20"] });
      setIsArchiveOpen(false);
      setArchiveProjectId("");
      setArchiveType("closeout");
    },
    onError: (error: Error) => {
      toast({ title: "Could not create archive", description: error.message, variant: "destructive" });
    },
  });

  const assembleMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/archives/${id}/assemble`);
    },
    onSuccess: () => {
      toast({ title: "Building archive package" });
      queryClient.invalidateQueries({ queryKey: ["/api/archives/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archives?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not build archive", description: error.message, variant: "destructive" });
    },
  });

  const sealMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/archives/${id}/seal`);
    },
    onSuccess: () => {
      toast({ title: "Archive sealed and locked" });
      queryClient.invalidateQueries({ queryKey: ["/api/archives/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/archives?limit=20"] });
    },
    onError: (error: Error) => {
      toast({ title: "Could not seal archive", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="grid gap-4 md:grid-cols-4 flex-1">
          <StatCard title="Total Archives" value={stats?.totalArchives ?? 0} icon={<Archive className="h-4 w-4 text-muted-foreground" />} loading={statsLoading} />
          <StatCard title="Pending" value={stats?.byStatus?.pending ?? 0} icon={<Archive className="h-4 w-4 text-gray-500" />} loading={statsLoading} />
          <StatCard title="Building" value={stats?.byStatus?.assembling ?? 0} icon={<Archive className="h-4 w-4 text-blue-600" />} loading={statsLoading} />
          <StatCard title="Sealed" value={stats?.byStatus?.sealed ?? 0} icon={<CheckCircle className="h-4 w-4 text-green-600" />} loading={statsLoading} />
        </div>
        <Dialog open={isArchiveOpen} onOpenChange={setIsArchiveOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-archive">
              <Plus className="h-4 w-4 mr-1.5" />
              Create Archive
            </Button>
          </DialogTrigger>
          <DialogContent data-testid="dialog-new-archive">
            <DialogHeader>
              <DialogTitle>Create an Archive</DialogTitle>
              <DialogDescription>Package project documents into a permanent archive.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="archive-project-id">Project *</Label>
                <Input
                  id="archive-project-id"
                  value={archiveProjectId}
                  onChange={(e) => setArchiveProjectId(e.target.value)}
                  placeholder="e.g. riverside-tower or paste reference"
                  data-testid="input-archive-project-id"
                />
              </div>
              <div className="space-y-2">
                <Label>Archive Reason</Label>
                <Select value={archiveType} onValueChange={setArchiveType}>
                  <SelectTrigger data-testid="select-archive-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="closeout">Project Closeout</SelectItem>
                    <SelectItem value="periodic">Periodic Backup</SelectItem>
                    <SelectItem value="on_demand">On Demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => createArchiveMutation.mutate({ projectId: archiveProjectId, archiveType: archiveType })}
                disabled={!archiveProjectId.trim() || createArchiveMutation.isPending}
                data-testid="button-submit-archive"
              >
                {createArchiveMutation.isPending ? <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" /> : <Archive className="h-4 w-4 mr-1.5" />}
                Create Archive
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {archivesLoading ? (
        <LoadingTable rows={6} cols={8} />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Documents</TableHead>
                <TableHead>Locked</TableHead>
                <TableHead>Sealed On</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {archives.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No archives have been created yet
                  </TableCell>
                </TableRow>
              ) : (
                archives.map((archive: any, idx: number) => (
                  <TableRow key={archive.id || idx} data-testid={`row-archive-${archive.id || idx}`}>
                    <TableCell className="text-sm font-medium">{shortRef(archive.projectId)}</TableCell>
                    <TableCell>
                      <Badge className={ARCHIVE_STATUS_VARIANTS[archive.status] || "bg-gray-500"} data-testid={`badge-archive-status-${archive.id || idx}`}>
                        {friendlyStatus(archive.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">{ARCHIVE_TYPE_LABELS[archive.archiveType || archive.type] || archive.archiveType || archive.type || "—"}</TableCell>
                    <TableCell className="text-sm">{archive.documentCount ?? archive.documentIds?.length ?? "—"}</TableCell>
                    <TableCell className="text-sm">{archive.versionLocked ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(archive.sealedAt)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(archive.createdAt)}</TableCell>
                    <TableCell>
                      {archive.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => assembleMutation.mutate(archive.id)}
                          disabled={assembleMutation.isPending}
                          data-testid={`button-assemble-archive-${archive.id || idx}`}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Build Package
                        </Button>
                      )}
                      {archive.status === "signing" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => sealMutation.mutate(archive.id)}
                          disabled={sealMutation.isPending}
                          data-testid={`button-seal-archive-${archive.id || idx}`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Seal Archive
                        </Button>
                      )}
                      {archive.status !== "pending" && archive.status !== "signing" && (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

export default function DocumentLifecyclePage() {
  return (
    <div className="p-6 space-y-6" data-testid="page-document-lifecycle">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight" data-testid="text-page-title">Document Management</h1>
        <p className="text-muted-foreground" data-testid="text-page-description">
          Track, sort, review, and archive your project documents in one place.
        </p>
      </div>

      <Tabs defaultValue="events" className="space-y-4" data-testid="tabs-document-lifecycle">
        <TabsList data-testid="tabs-list-document-lifecycle">
          <TabsTrigger value="events" data-testid="tab-events">
            <Activity className="h-4 w-4 mr-1.5" />
            Activity
          </TabsTrigger>
          <TabsTrigger value="classification" data-testid="tab-classification">
            <FileSearch className="h-4 w-4 mr-1.5" />
            Sorting
          </TabsTrigger>
          <TabsTrigger value="uploads" data-testid="tab-uploads">
            <Upload className="h-4 w-4 mr-1.5" />
            Uploads
          </TabsTrigger>
          <TabsTrigger value="reviews" data-testid="tab-reviews">
            <ClipboardCheck className="h-4 w-4 mr-1.5" />
            Reviews
          </TabsTrigger>
          <TabsTrigger value="archives" data-testid="tab-archives">
            <Archive className="h-4 w-4 mr-1.5" />
            Archives
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" data-testid="tab-content-events">
          <EventLogTab />
        </TabsContent>
        <TabsContent value="classification" data-testid="tab-content-classification">
          <ClassificationTab />
        </TabsContent>
        <TabsContent value="uploads" data-testid="tab-content-uploads">
          <UploadQueueTab />
        </TabsContent>
        <TabsContent value="reviews" data-testid="tab-content-reviews">
          <ReviewPipelineTab />
        </TabsContent>
        <TabsContent value="archives" data-testid="tab-content-archives">
          <ArchivesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
