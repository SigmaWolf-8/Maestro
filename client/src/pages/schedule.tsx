import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarDays,
  Search,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  Clock,
  ClipboardList,
  ClipboardCopy,
  ClipboardPaste,
  ChevronDown,
  FileText,
  Plus,
  AlertCircle,
  AlertTriangle,
  Settings2,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ScheduleTask, ScheduleTaskTemplate, Project, Vendor, EmployeeRole } from "@shared/schema";

interface StageInfo {
  key: string;
  label: string;
}

const STAGES: StageInfo[] = [
  { key: "all", label: "All" },
  { key: "pre_construction", label: "Pre-Con" },
  { key: "foundation", label: "Found" },
  { key: "framing", label: "Frame" },
  { key: "mechanicals", label: "Mech" },
  { key: "exterior", label: "Exter" },
  { key: "insulation", label: "Ins" },
  { key: "interior", label: "Inter" },
  { key: "flooring", label: "Floor" },
  { key: "closeout", label: "Close" },
  { key: "sitework", label: "Site" },
  { key: "seasonal", label: "Seasonal" },
  { key: "warranty", label: "Warranty" },
];

const STAGE_LABEL_MAP: Record<string, string> = {
  pre_construction: "Pre-Construction",
  foundation: "Foundation",
  framing: "Framing",
  mechanicals: "Mechanicals",
  exterior: "Exterior",
  insulation: "Insulation, Drywall & Taping",
  interior: "Interior Finishing",
  flooring: "Floorcoverings",
  closeout: "Close Out Pre-Occ | Turnover",
  sitework: "Site Work",
  seasonal: "Seasonal Deficiencies",
  warranty: "Warranty",
};

const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA");
};

const formatDateForInput = (date: string | Date | null | undefined) => {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0];
};

function templateToTask(tpl: ScheduleTaskTemplate, allTemplates: ScheduleTaskTemplate[]): ScheduleTask {
  return {
    id: tpl.id,
    tenantId: tpl.tenantId,
    projectId: "__master__",
    templateId: tpl.id,
    taskNumber: tpl.taskNumber,
    taskName: tpl.taskName,
    stage: tpl.stage,
    supplierTrade: tpl.supplierTrade,
    responsibility: tpl.responsibility,
    whosTask: tpl.whosTask,
    supervisor: tpl.supervisor,
    finListNumber: tpl.finListNumber,
    ref: tpl.ref,
    poRefNum: tpl.poRefNum,
    ktFlag: tpl.ktFlag ?? false,
    ktSort: tpl.ktSort,
    moneyCode: tpl.moneyCode,
    taskLenDays: tpl.taskLenDays,
    offsetDays: tpl.offsetDays ?? 0,
    prereqTaskId: tpl.prereqTemplateId || null,
    sqftDay: tpl.sqftDay,
    moneyDay: tpl.moneyDay,
    ordered: false,
    orderedDate: null,
    completed: false,
    completedDate: null,
    projectedStart: null,
    projectedFinish: null,
    actualStart: null,
    actualFinish: null,
    poNumber: null,
    naFlag: !(tpl.isActive ?? true),
    memo: tpl.memo,
    orderIndex: tpl.orderIndex,
    createdAt: tpl.createdAt,
    updatedAt: tpl.updatedAt,
  } as ScheduleTask;
}

const TEMPLATE_TO_TASK_FIELD_MAP: Record<string, string> = {
  naFlag: "isActive",
  prereqTaskId: "prereqTemplateId",
};

function InlineEditCell({
  value,
  field,
  taskId,
  onFieldChange,
  className = "",
  placeholder = "",
  testIdSuffix = "",
}: {
  value: string;
  field: string;
  taskId: string;
  onFieldChange: (taskId: string, field: string, value: any) => void;
  className?: string;
  placeholder?: string;
  testIdSuffix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const trimmed = editValue.trim();
    if (trimmed !== value) {
      onFieldChange(taskId, field, trimmed || null);
    }
  };

  if (!editing) {
    return (
      <div
        className={`cursor-text min-h-[24px] px-1.5 py-0.5 rounded-sm border border-transparent hover:border-muted-foreground/20 hover:bg-muted/40 transition-colors truncate text-[11px] flex items-center ${className}`}
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        data-testid={`inline-${testIdSuffix}-${taskId}`}
      >
        {value || <span className="text-muted-foreground/40 italic">{placeholder || "click to edit"}</span>}
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      value={editValue}
      onChange={(e) => setEditValue(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditValue(value);
          setEditing(false);
        }
        if (e.key === "Tab") {
          commit();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="text-[11px] h-6 border-primary/50 ring-1 ring-primary/20"
      data-testid={`input-inline-${testIdSuffix}-${taskId}`}
    />
  );
}

function VendorDropdownCell({
  value,
  taskId,
  tenantId,
  vendorsList,
  onFieldChange,
  onVendorNotFound,
}: {
  value: string;
  taskId: string;
  tenantId: string;
  vendorsList: { id: string; company: string }[];
  onFieldChange: (taskId: string, field: string, value: any) => void;
  onVendorNotFound: (vendorName: string, taskId: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      setSearchTerm(value || "");
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const trimmed = searchTermRef.current.trim();
        setEditing(false);
        if (!trimmed) {
          if (value) onFieldChange(taskId, "supplierTrade", null);
          return;
        }
        if (trimmed === value) return;
        const match = vendorsList.find(v => v.company.toLowerCase() === trimmed.toLowerCase());
        if (match) {
          onFieldChange(taskId, "supplierTrade", match.company);
        } else {
          onVendorNotFound(trimmed, taskId);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing, value, taskId, onFieldChange, onVendorNotFound, vendorsList]);

  const filteredVendors = useMemo(() => {
    if (!searchTerm) return vendorsList.slice(0, 20);
    const s = searchTerm.toLowerCase();
    return vendorsList.filter(v => v.company.toLowerCase().includes(s)).slice(0, 20);
  }, [vendorsList, searchTerm]);

  const handleCommit = () => {
    const trimmed = searchTerm.trim();
    setEditing(false);
    if (!trimmed) {
      if (value) onFieldChange(taskId, "supplierTrade", null);
      return;
    }
    if (trimmed === value) return;
    const match = vendorsList.find(v => v.company.toLowerCase() === trimmed.toLowerCase());
    if (match) {
      onFieldChange(taskId, "supplierTrade", match.company);
    } else {
      onVendorNotFound(trimmed, taskId);
    }
  };

  const selectVendor = (company: string) => {
    setEditing(false);
    if (company !== value) {
      onFieldChange(taskId, "supplierTrade", company);
    }
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer min-h-[24px] px-1.5 py-0.5 rounded-sm border border-transparent hover:border-muted-foreground/20 hover:bg-muted/40 transition-colors truncate text-muted-foreground flex items-center gap-1 text-[11px]"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        data-testid={`inline-vendor-${taskId}`}
      >
        <span className="truncate flex-1">{value || <span className="text-muted-foreground/40 italic">select vendor</span>}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-30" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommit();
          if (e.key === "Escape") { setSearchTerm(value || ""); setEditing(false); }
          if (e.key === "Tab") handleCommit();
        }}
        placeholder="Type to search vendors..."
        className="text-[11px] h-6 border-primary/50 ring-1 ring-primary/20"
        data-testid={`input-inline-vendor-${taskId}`}
      />
      {filteredVendors.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto min-w-[200px]" data-testid={`dropdown-vendor-${taskId}`}>
          {filteredVendors.map((v) => (
            <div
              key={v.id}
              className="px-2 py-1.5 text-[11px] cursor-pointer hover-elevate transition-colors"
              onMouseDown={(e) => { e.preventDefault(); selectVendor(v.company); }}
              data-testid={`vendor-option-${v.id}`}
            >
              {v.company}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RoleDropdownCell({
  value,
  taskId,
  rolesList,
  onFieldChange,
}: {
  value: string;
  taskId: string;
  rolesList: EmployeeRole[];
  onFieldChange: (taskId: string, field: string, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTermRef = useRef(searchTerm);
  searchTermRef.current = searchTerm;

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      setSearchTerm(value || "");
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        const trimmed = searchTermRef.current.trim();
        setEditing(false);
        if (trimmed !== value) {
          onFieldChange(taskId, "responsibility", trimmed || null);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editing, value, taskId, onFieldChange]);

  const filteredRoles = useMemo(() => {
    if (!searchTerm) return rolesList;
    const s = searchTerm.toLowerCase();
    return rolesList.filter(r => r.roleName.toLowerCase().includes(s));
  }, [rolesList, searchTerm]);

  const handleCommit = () => {
    const trimmed = searchTerm.trim();
    setEditing(false);
    if (trimmed !== value) {
      onFieldChange(taskId, "responsibility", trimmed || null);
    }
  };

  const selectRole = (roleName: string) => {
    setEditing(false);
    if (roleName !== value) {
      onFieldChange(taskId, "responsibility", roleName);
    }
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer min-h-[24px] px-1.5 py-0.5 rounded-sm border border-transparent hover:border-muted-foreground/20 hover:bg-muted/40 transition-colors truncate flex items-center gap-1 text-[11px]"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        data-testid={`inline-responsibility-${taskId}`}
      >
        <span className="truncate flex-1">{value || <span className="text-muted-foreground/40 italic">select role</span>}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-30" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative" onClick={(e) => e.stopPropagation()}>
      <Input
        ref={inputRef}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleCommit();
          if (e.key === "Escape") { setSearchTerm(value || ""); setEditing(false); }
          if (e.key === "Tab") handleCommit();
        }}
        placeholder="Type to search roles..."
        className="text-[11px] h-6 border-primary/50 ring-1 ring-primary/20"
        data-testid={`input-inline-responsibility-${taskId}`}
      />
      {filteredRoles.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-auto min-w-[180px]" data-testid={`dropdown-role-${taskId}`}>
          {filteredRoles.map((r) => (
            <div
              key={r.id}
              className="px-2 py-1.5 text-[11px] cursor-pointer hover-elevate transition-colors"
              onMouseDown={(e) => { e.preventDefault(); selectRole(r.roleName); }}
              data-testid={`role-option-${r.id}`}
            >
              {r.roleName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineDateCell({
  value,
  field,
  taskId,
  onFieldChange,
}: {
  value: string | Date | null | undefined;
  field: string;
  taskId: string;
  onFieldChange: (taskId: string, field: string, value: any) => void;
}) {
  const [editing, setEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      try { inputRef.current.showPicker?.(); } catch {}
    }
  }, [editing]);

  const commit = (dateStr: string) => {
    setEditing(false);
    const newVal = dateStr ? new Date(dateStr).toISOString() : null;
    const oldVal = value ? new Date(value as string).toISOString().split("T")[0] : "";
    if (dateStr !== oldVal) {
      onFieldChange(taskId, field, newVal);
    }
  };

  if (!editing) {
    return (
      <div
        className="cursor-pointer min-h-[24px] px-1.5 py-0.5 rounded-sm border border-transparent hover:border-muted-foreground/20 hover:bg-muted/40 transition-colors text-[10px] tabular-nums flex items-center"
        onClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
        data-testid={`inline-date-${field}-${taskId}`}
      >
        {formatDate(value) || <span className="text-muted-foreground/40 italic">set date</span>}
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="date"
      defaultValue={formatDateForInput(value)}
      onBlur={(e) => commit(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditing(false);
        if (e.key === "Tab") commit(e.currentTarget.value);
      }}
      onClick={(e) => e.stopPropagation()}
      className="text-[10px] h-6 border-primary/50 ring-1 ring-primary/20"
      data-testid={`input-date-${field}-${taskId}`}
    />
  );
}

export default function SchedulePage() {
  const { toast } = useToast();
  const { activeTenant } = useSettings();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeStage, setActiveStage] = useState<string>("all");
  const [hideCompleted, setHideCompleted] = useState(false);
  const [hideNA, setHideNA] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [focusedTaskId, setFocusedTaskId] = useState<string | null>(null);
  const [lastClickedTaskId, setLastClickedTaskId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<{ field: string; value: any; label: string } | null>(null);
  const [lastFocusedField, setLastFocusedField] = useState<string>("supplierTrade");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newTask, setNewTask] = useState({ taskName: "", stage: "pre_construction", supplierTrade: "", responsibility: "", memo: "" });
  const [vendorNotFound, setVendorNotFound] = useState<{ vendorName: string; taskId: string } | null>(null);
  const [newVendorData, setNewVendorData] = useState({ company: "", address: "", city: "", stateProvince: "", zipPostalCode: "" });
  const [showRolesManager, setShowRolesManager] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [showMasterTemplate, setShowMasterTemplate] = useState(false);
  const [pdfViewerPO, setPdfViewerPO] = useState<string | null>(null);

  const isMasterView = selectedProjectId === "__master__";
  const isMultiProjectView = selectedProjectId === "__all_active__" || selectedProjectId === "__all__";

  const { data: projects = [], isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/projects?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch projects");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: tasks = [], isLoading: tasksLoading, refetch: refetchTasks } = useQuery<ScheduleTask[]>({
    queryKey: ["/api/schedule/tasks", activeTenant?.id, selectedProjectId, activeStage, hideCompleted],
    queryFn: async () => {
      if (!activeTenant?.id || !selectedProjectId) return [];
      if (selectedProjectId === "__master__") return [];

      const params = new URLSearchParams({
        tenantId: activeTenant.id,
        projectId: selectedProjectId,
      });
      if (activeStage !== "all") params.set("stage", activeStage);
      if (hideCompleted) params.set("hideCompleted", "true");
      const res = await fetch(`/api/schedule/tasks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch tasks");
      return res.json();
    },
    enabled: !!activeTenant?.id && !!selectedProjectId && selectedProjectId !== "__master__",
  });

  const { data: templates = [], isLoading: templatesLoading } = useQuery<any[]>({
    queryKey: ["/api/schedule/templates", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/schedule/templates?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: !!activeTenant?.id && selectedProjectId === "__master__",
  });

  const { data: vendorsList = [] } = useQuery<{ id: string; company: string }[]>({
    queryKey: ["/api/schedule/vendors-list", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/schedule/vendors-list?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: rolesList = [], refetch: refetchRoles } = useQuery<EmployeeRole[]>({
    queryKey: ["/api/schedule/employee-roles", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/schedule/employee-roles?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch roles");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const { data: stats } = useQuery<{
    total: number;
    completed: number;
    ordered: number;
    na: number;
    active: number;
    stageStats: { stage: string; total: number; completed: number }[];
  }>({
    queryKey: ["/api/schedule/stats", activeTenant?.id, selectedProjectId],
    queryFn: async () => {
      if (!activeTenant?.id || !selectedProjectId || selectedProjectId === "__master__") return null;
      const res = await fetch(`/api/schedule/stats?tenantId=${activeTenant.id}&projectId=${selectedProjectId}`);
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!activeTenant?.id && !!selectedProjectId && selectedProjectId !== "__master__",
  });

  const updateField = useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      return apiRequest("PATCH", `/api/schedule/tasks/${taskId}/field`, { tenantId: activeTenant?.id, field, value });
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/stats", activeTenant?.id, selectedProjectId] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateTemplateField = useMutation({
    mutationFn: async ({ taskId, field, value }: { taskId: string; field: string; value: any }) => {
      const templateField = TEMPLATE_TO_TASK_FIELD_MAP[field] || field;
      let templateValue = value;
      if (field === "naFlag") templateValue = !value;
      if (field === "poNumber" || field === "ordered" || field === "completed" ||
          field === "projectedStart" || field === "projectedFinish" ||
          field === "actualStart" || field === "actualFinish") {
        return;
      }
      return apiRequest("PATCH", `/api/schedule/templates/${taskId}/field`, { tenantId: activeTenant?.id, field: templateField, value: templateValue });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/templates", activeTenant?.id] });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const applyTemplate = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/schedule/apply-template", {
        tenantId: activeTenant?.id,
        projectId: selectedProjectId,
      });
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/stats"] });
      toast({ title: "Template Applied", description: "Master task list has been applied to this project" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const addTask = useMutation({
    mutationFn: async () => {
      const maxNum = tasks.length > 0 ? Math.max(...tasks.map(t => t.taskNumber)) : 0;
      return apiRequest("POST", "/api/schedule/tasks", {
        tenantId: activeTenant?.id,
        projectId: selectedProjectId,
        taskNumber: maxNum + 10,
        taskName: newTask.taskName,
        stage: newTask.stage,
        supplierTrade: newTask.supplierTrade || undefined,
        responsibility: newTask.responsibility || undefined,
        memo: newTask.memo || undefined,
        orderIndex: maxNum + 10,
      });
    },
    onSuccess: () => {
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/stats"] });
      setShowAddDialog(false);
      setNewTask({ taskName: "", stage: "pre_construction", supplierTrade: "", responsibility: "", memo: "" });
      toast({ title: "Task Added", description: "New task has been added to the schedule" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createVendor = useMutation({
    mutationFn: async (data: { company: string; address?: string; city?: string; stateProvince?: string; zipPostalCode?: string }) => {
      return apiRequest("POST", "/api/vendors", {
        tenantId: activeTenant?.id,
        ...data,
      });
    },
    onSuccess: (_data, variables) => {
      if (vendorNotFound) {
        updateField.mutate({ taskId: vendorNotFound.taskId, field: "supplierTrade", value: variables.company });
      }
      setVendorNotFound(null);
      setNewVendorData({ company: "", address: "", city: "", stateProvince: "", zipPostalCode: "" });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/vendors-list"] });
      toast({ title: "Vendor Created", description: `"${variables.company}" has been added to the Vendors directory.` });
    },
    onError: (error: any) => {
      toast({ title: "Error Creating Vendor", description: error.message, variant: "destructive" });
    },
  });

  const createRole = useMutation({
    mutationFn: async (roleName: string) => {
      return apiRequest("POST", "/api/schedule/employee-roles", {
        tenantId: activeTenant?.id,
        roleName,
      });
    },
    onSuccess: () => {
      refetchRoles();
      setNewRoleName("");
      toast({ title: "Role Created", description: "New employee role has been added." });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteRole = useMutation({
    mutationFn: async (roleId: string) => {
      return apiRequest("DELETE", `/api/schedule/employee-roles/${roleId}?tenantId=${activeTenant?.id}`);
    },
    onSuccess: () => {
      refetchRoles();
      toast({ title: "Role Removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const autoSchedule = useMutation({
    mutationFn: async (anchorTaskId: string | undefined) => {
      return apiRequest("POST", "/api/schedule/auto-schedule", {
        tenantId: activeTenant?.id,
        projectId: selectedProjectId,
        anchorTaskId: anchorTaskId || undefined,
      });
    },
    onSuccess: async (res: any) => {
      const data = await res.json();
      refetchTasks();
      queryClient.invalidateQueries({ queryKey: ["/api/schedule/stats"] });
      toast({ title: "Auto-Scheduled", description: data.message || `Updated ${data.updatedCount} tasks` });
    },
    onError: (error: any) => {
      let msg = error.message || "Unknown error";
      try {
        const jsonPart = msg.substring(msg.indexOf("{"));
        const parsed = JSON.parse(jsonPart);
        msg = parsed.error || msg;
      } catch {}
      toast({ title: "Auto-Schedule Failed", description: msg, variant: "destructive" });
    },
  });

  const handleFieldChange = useCallback(
    (taskId: string, field: string, value: any) => {
      if (isMasterView) {
        updateTemplateField.mutate({ taskId, field, value });
      } else {
        updateField.mutate({ taskId, field, value });
      }
    },
    [updateField, updateTemplateField, isMasterView]
  );

  const handleVendorNotFound = useCallback(
    (vendorName: string, taskId: string) => {
      setVendorNotFound({ vendorName, taskId });
      setNewVendorData({ company: vendorName, address: "", city: "", stateProvince: "", zipPostalCode: "" });
    },
    []
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (hideNA) {
      result = result.filter(t => !t.naFlag);
    }
    if (!searchQuery) return result;
    const s = searchQuery.toLowerCase();
    return result.filter(
      (t) =>
        t.taskName.toLowerCase().includes(s) ||
        (t.supplierTrade && t.supplierTrade.toLowerCase().includes(s)) ||
        (t.responsibility && t.responsibility.toLowerCase().includes(s)) ||
        (t.poNumber && t.poNumber.toLowerCase().includes(s)) ||
        (t.memo && t.memo.toLowerCase().includes(s))
    );
  }, [tasks, searchQuery, hideNA]);

  const templateTasks = useMemo(() => {
    return templates.map((t) => templateToTask(t, templates));
  }, [templates]);

  const filteredTemplateTasks = useMemo(() => {
    let result = templateTasks;
    if (activeStage !== "all") {
      result = result.filter(t => t.stage === activeStage);
    }
    if (hideNA) {
      result = result.filter(t => !t.naFlag);
    }
    if (!searchQuery) return result;
    const s = searchQuery.toLowerCase();
    return result.filter(
      (t) =>
        t.taskName.toLowerCase().includes(s) ||
        (t.supplierTrade && t.supplierTrade.toLowerCase().includes(s)) ||
        (t.responsibility && t.responsibility.toLowerCase().includes(s)) ||
        (t.memo && t.memo.toLowerCase().includes(s))
    );
  }, [templateTasks, searchQuery, activeStage, hideNA]);

  const displayTasks = isMasterView ? filteredTemplateTasks : filteredTasks;

  const selectedTask = useMemo(() => {
    return displayTasks.find((t) => t.id === focusedTaskId) || null;
  }, [displayTasks, focusedTaskId]);

  const selectedProject = useMemo(() => {
    return projects.find((p) => p.id === selectedProjectId) || null;
  }, [projects, selectedProjectId]);

  const stageCounts = useMemo(() => {
    if (!stats?.stageStats) return {};
    const counts: Record<string, { total: number; completed: number }> = {};
    stats.stageStats.forEach((s) => {
      counts[s.stage] = { total: s.total, completed: s.completed };
    });
    return counts;
  }, [stats]);

  const handleRowFocus = useCallback((taskId: string) => {
    setFocusedTaskId(taskId);
  }, []);

  const handleRowSelect = useCallback((taskId: string, e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedTaskId) {
      const taskIds = displayTasks.map(t => t.id);
      const lastIdx = taskIds.indexOf(lastClickedTaskId);
      const currentIdx = taskIds.indexOf(taskId);
      if (lastIdx !== -1 && currentIdx !== -1) {
        const start = Math.min(lastIdx, currentIdx);
        const end = Math.max(lastIdx, currentIdx);
        const rangeIds = taskIds.slice(start, end + 1);
        setSelectedTaskIds(prev => {
          const next = new Set(prev);
          rangeIds.forEach(id => next.add(id));
          return next;
        });
      }
    } else if (e.ctrlKey || e.metaKey) {
      setSelectedTaskIds(prev => {
        const next = new Set(prev);
        if (next.has(taskId)) {
          next.delete(taskId);
        } else {
          next.add(taskId);
        }
        return next;
      });
    } else {
      setSelectedTaskIds(prev => {
        if (prev.size === 1 && prev.has(taskId)) return new Set();
        return new Set([taskId]);
      });
    }
    setFocusedTaskId(taskId);
    setLastClickedTaskId(taskId);
  }, [displayTasks, lastClickedTaskId]);

  const handleCheckboxToggle = useCallback((taskId: string) => {
    setSelectedTaskIds(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      return next;
    });
  }, []);

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; taskId: string; field: string } | null>(null);

  const handleCellRightClick = useCallback((e: React.MouseEvent, taskId: string, field: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusedTaskId(taskId);
    setLastFocusedField(field);
    setContextMenu({ x: e.clientX, y: e.clientY, taskId, field });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [contextMenu]);

  const PASTEABLE_FIELDS: Record<string, string> = {
    supplierTrade: "Vendor",
    responsibility: "Responsibility",
    stage: "Stage",
    memo: "Memo",
    taskName: "Task Name",
    poRefNum: "PO Ref",
    whosTask: "Who's Task",
    supervisor: "Supervisor",
    taskLenDays: "Duration (Days)",
    offsetDays: "Offset Days",
    projectedStart: "Proj. Start",
    projectedFinish: "Proj. Finish",
    actualStart: "Actual Start",
    actualFinish: "Actual Finish",
  };

  const handleCopyField = useCallback((field: string, fromTaskId?: string) => {
    const targetId = fromTaskId || focusedTaskId;
    if (!targetId) return;
    const task = displayTasks.find(t => t.id === targetId);
    if (!task) return;
    const val = (task as any)[field];
    const label = PASTEABLE_FIELDS[field] || field;
    setCopiedField({ field, value: val || null, label: `${label}: ${val || "(empty)"}` });
    toast({ title: "Copied", description: `${label}: "${val || "(empty)"}" — select rows & paste` });
  }, [focusedTaskId, displayTasks, toast]);

  const handlePasteField = useCallback(() => {
    if (!copiedField || selectedTaskIds.size === 0) return;
    let count = 0;
    selectedTaskIds.forEach(taskId => {
      const task = displayTasks.find(t => t.id === taskId);
      if (task && (task as any)[copiedField.field] !== copiedField.value) {
        handleFieldChange(taskId, copiedField.field, copiedField.value);
        count++;
      }
    });
    if (count > 0) {
      toast({ title: "Pasted", description: `Updated ${PASTEABLE_FIELDS[copiedField.field] || copiedField.field} on ${count} task${count > 1 ? "s" : ""}` });
    }
  }, [copiedField, selectedTaskIds, displayTasks, handleFieldChange, toast]);

  const handleSelectAll = useCallback(() => {
    if (selectedTaskIds.size === displayTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(displayTasks.map(t => t.id)));
    }
  }, [displayTasks, selectedTaskIds]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.ctrlKey || e.metaKey) && e.key === "c") {
        if (focusedTaskId) {
          e.preventDefault();
          handleCopyField(lastFocusedField);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "v") {
        if (copiedField && selectedTaskIds.size > 0) {
          e.preventDefault();
          handlePasteField();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        if (displayTasks.length > 0) {
          e.preventDefault();
          handleSelectAll();
        }
      }
      if (e.key === "Escape") {
        setSelectedTaskIds(new Set());
        setCopiedField(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [focusedTaskId, copiedField, selectedTaskIds, handleCopyField, handlePasteField, handleSelectAll, displayTasks, lastFocusedField]);

  if (!activeTenant?.id) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground" data-testid="page-schedule">
        Please select a company to view the schedule.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" data-testid="page-schedule">
      <div className="flex flex-col gap-1 px-3 py-1.5 border-b bg-card">
        <div className="flex items-center gap-2 flex-wrap">
          <CalendarDays className="h-4 w-4 text-muted-foreground shrink-0" />
          <h1 className="text-sm font-semibold tracking-tight" data-testid="text-schedule-title">
            Task Bible
          </h1>
          <div className="w-52">
            <Select
              value={selectedProjectId || ""}
              onValueChange={(value) => {
                setSelectedProjectId(value);
                setSelectedTaskIds(new Set());
                setFocusedTaskId(null);
                setLastClickedTaskId(null);
                setCopiedField(null);
                setActiveStage("all");
              }}
            >
              <SelectTrigger className="h-7 text-xs" data-testid="select-project">
                <SelectValue placeholder="Select a Job..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__master__" data-testid="option-master-template">
                  <span className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    Master Bible Template
                  </span>
                </SelectItem>
                <SelectItem value="__all_active__" data-testid="option-all-active">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    All Active Projects
                  </span>
                </SelectItem>
                <SelectItem value="__all__" data-testid="option-all-projects">
                  <span className="flex items-center gap-1">
                    <ClipboardList className="h-3 w-3" />
                    All Projects
                  </span>
                </SelectItem>
                {projectsLoading ? (
                  <SelectItem value="loading" disabled>Loading...</SelectItem>
                ) : projects.length === 0 ? (
                  <SelectItem value="none" disabled>No projects found</SelectItem>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p.id} value={p.id} data-testid={`option-project-${p.id}`}>
                      {p.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          {selectedProjectId && (
            <div className="flex items-center gap-1.5 ml-1">
              <Search className="h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search tasks, vendors, PO#..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-44 h-7 text-xs"
                data-testid="input-search"
              />
              {searchQuery && (
                <Badge variant="secondary" className="text-[10px]" data-testid="badge-search-count">
                  {displayTasks.length}
                </Badge>
              )}
            </div>
          )}
          {selectedProject && !isMasterView && !isMultiProjectView && selectedProject.status && (
            <Badge variant="secondary" className="text-[10px]" data-testid="badge-project-status">
              {selectedProject.status.replace("_", " ")}
            </Badge>
          )}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            {selectedProjectId && !isMasterView && !isMultiProjectView && tasks.length === 0 && !tasksLoading && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => applyTemplate.mutate()}
                disabled={applyTemplate.isPending}
                data-testid="button-apply-template"
              >
                {applyTemplate.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
                <ClipboardList className="mr-1 h-3 w-3" />
                Apply Master
              </Button>
            )}
            {selectedProjectId && !isMasterView && !isMultiProjectView && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setShowAddDialog(true)}
                data-testid="button-add-task"
              >
                <Plus className="mr-1 h-3 w-3" />
                Add
              </Button>
            )}
            {selectedProjectId && !isMasterView && !isMultiProjectView && tasks.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => autoSchedule.mutate(undefined)}
                disabled={autoSchedule.isPending}
                data-testid="button-auto-schedule"
              >
                {autoSchedule.isPending ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Zap className="mr-1 h-3 w-3" />}
                Auto
              </Button>
            )}
            {!isMasterView && (
              <Button
                variant={hideCompleted ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setHideCompleted(!hideCompleted)}
                data-testid="button-toggle-completed"
              >
                {hideCompleted ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                {hideCompleted ? "Show" : "Hide"} Done
              </Button>
            )}
            {!isMasterView && (
              <Button
                variant={hideNA ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setHideNA(!hideNA)}
                data-testid="button-toggle-na"
              >
                {hideNA ? <EyeOff className="mr-1 h-3 w-3" /> : <Eye className="mr-1 h-3 w-3" />}
                {hideNA ? "Show" : "Hide"} N/A
              </Button>
            )}
          </div>
        </div>

        {selectedProjectId && (
          <div className="flex gap-0.5 overflow-x-auto" data-testid="stage-tabs">
            {STAGES.map((stage) => {
              const isActive = activeStage === stage.key;
              const sc = stageCounts[stage.key];
              const taskCount = stage.key === "all"
                ? (stats?.total ?? displayTasks.length)
                : (sc ? sc.total : undefined);
              return (
                <Button
                  key={stage.key}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveStage(stage.key)}
                  className="shrink-0 text-[10px] h-6 px-2"
                  data-testid={`tab-stage-${stage.key}`}
                >
                  {stage.label}
                  {taskCount !== undefined && (
                    <span className="ml-1 opacity-70 tabular-nums">
                      {!isMasterView && sc && stage.key !== "all"
                        ? `${sc.completed}/${sc.total}`
                        : taskCount}
                    </span>
                  )}
                </Button>
              );
            })}
          </div>
        )}
      </div>

      {!selectedProjectId ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
          <div className="text-center">
            <CalendarDays className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Select a Job to View the Task Bible</p>
            <p className="text-sm mt-1">Choose a project from the dropdown above to manage its construction schedule.</p>
          </div>
        </div>
      ) : (isMasterView ? templatesLoading : tasksLoading) ? (
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : displayTasks.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-muted-foreground p-8">
          <div className="text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">{isMasterView ? "No Templates Yet" : "No Tasks Yet"}</p>
            <p className="text-sm mt-1">{isMasterView
              ? "Add task templates to define the master construction schedule."
              : "Click \"Apply Master List\" to populate this job's schedule from the template, or add tasks manually."
            }</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          <div className="w-72 border-r bg-card overflow-auto shrink-0 text-[0.7rem]" data-testid="task-detail-panel">
            <TaskDetailPanel
              task={selectedTask}
              tenantId={activeTenant.id}
              onFieldChange={handleFieldChange}
              onVendorNotFound={handleVendorNotFound}
              vendorsList={vendorsList}
              rolesList={rolesList}
              allTasks={displayTasks}
              isMasterView={isMasterView}
              onPODoubleClick={(poNumber) => setPdfViewerPO(poNumber)}
            />
          </div>
          <div className="flex-1 flex flex-col overflow-hidden" data-testid="task-list">
            {(selectedTaskIds.size > 0 || copiedField) && (
              <div className="flex items-center gap-2 px-2 py-1 border-b bg-muted/50 text-[10px] flex-wrap shrink-0" data-testid="clipboard-bar">
                {selectedTaskIds.size > 0 && (
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0 gap-1 tabular-nums" data-testid="text-selected-count">
                    {selectedTaskIds.size} row{selectedTaskIds.size > 1 ? "s" : ""} selected
                  </Badge>
                )}
                {copiedField && (
                  <Badge variant="outline" className="text-[9px] px-1.5 py-0 gap-1" data-testid="badge-clipboard">
                    <ClipboardCopy className="h-2.5 w-2.5" />
                    {copiedField.label}
                  </Badge>
                )}
                {copiedField && selectedTaskIds.size > 0 && (
                  <Button
                    size="sm"
                    variant="default"
                    className="h-5 text-[10px] px-2 gap-1"
                    onClick={handlePasteField}
                    data-testid="button-paste"
                  >
                    <ClipboardPaste className="h-3 w-3" />
                    Paste to {selectedTaskIds.size} row{selectedTaskIds.size > 1 ? "s" : ""}
                  </Button>
                )}
                <span className="text-muted-foreground/60 text-[9px] ml-1">Right-click cells to copy/paste</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-[10px] px-1 ml-auto"
                  onClick={() => { setSelectedTaskIds(new Set()); setCopiedField(null); }}
                  data-testid="button-clear-selection"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div className="flex-1 overflow-auto">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 z-10 bg-muted">
                <tr className="border-b">
                  <th className="text-center px-0.5 py-1 w-7 font-medium text-[10px]">
                    <Checkbox
                      checked={displayTasks.length > 0 && selectedTaskIds.size === displayTasks.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaskIds(new Set(displayTasks.map(t => t.id)));
                        } else {
                          setSelectedTaskIds(new Set());
                        }
                      }}
                      className="h-3 w-3"
                      data-testid="checkbox-select-all"
                    />
                  </th>
                  <th className="text-left px-1 py-1 w-8 font-medium text-[10px]">#</th>
                  {!isMasterView && <th className="text-left px-1 py-1 font-medium text-[10px]">O</th>}
                  {!isMasterView && <th className="text-left px-1 py-1 font-medium text-[10px]">C</th>}
                  <th className="text-left px-1 py-1 min-w-[180px] font-medium text-[10px]">Task</th>
                  {isMultiProjectView && <th className="text-left px-1 py-1 min-w-[120px] font-medium text-[10px]">Job</th>}
                  <th className="text-left px-1 py-1 min-w-[100px] font-medium text-[10px]">Vendor</th>
                  <th
                    className="text-left px-1 py-1 min-w-[120px] font-medium text-[10px] cursor-context-menu"
                    onContextMenu={(e) => { e.preventDefault(); setShowRolesManager(true); }}
                    title="Right-click to manage roles"
                    data-testid="header-responsibility"
                  >
                    Responsibility
                  </th>
                  {!isMasterView && <th className="text-left px-1 py-1 w-20 font-medium text-[10px]">PO#</th>}
                  <th className="text-left px-1 py-1 w-20 font-medium text-[10px]">Stage</th>
                  {isMasterView ? (
                    <>
                      <th className="text-left px-1 py-1 w-16 font-medium text-[10px]">Days</th>
                      <th className="text-left px-1 py-1 w-16 font-medium text-[10px]">PORefNum</th>
                      <th className="text-left px-1 py-1 w-16 font-medium text-[10px]">PreReq</th>
                      <th className="text-left px-1 py-1 w-14 font-medium text-[10px]">Offset</th>
                    </>
                  ) : (
                    <>
                      <th className="text-left px-1 py-1 w-24 font-medium text-[10px]">Proj Start</th>
                      <th className="text-left px-1 py-1 w-24 font-medium text-[10px]">Proj Finish</th>
                      <th className="text-left px-1 py-1 w-24 font-medium text-[10px]">Act Start</th>
                      <th className="text-left px-1 py-1 w-24 font-medium text-[10px]">Act Finish</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayTasks.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    allTasks={displayTasks}
                    tenantId={activeTenant.id}
                    isSelected={selectedTaskIds.has(task.id)}
                    isFocused={focusedTaskId === task.id}
                    onRowFocus={() => handleRowFocus(task.id)}
                    onRowSelect={(e) => handleRowSelect(task.id, e)}
                    onCheckboxToggle={() => handleCheckboxToggle(task.id)}
                    onCellRightClick={(e, field) => handleCellRightClick(e, task.id, field)}
                    onFieldChange={handleFieldChange}
                    onVendorNotFound={handleVendorNotFound}
                    vendorsList={vendorsList}
                    rolesList={rolesList}
                    isMultiProjectView={isMultiProjectView}
                    isMasterView={isMasterView}
                    projectName={isMultiProjectView ? (projects.find(p => p.id === task.projectId)?.name || "") : undefined}
                    onPODoubleClick={(poNumber) => setPdfViewerPO(poNumber)}
                  />
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="fixed z-[100] bg-popover border rounded-md shadow-lg py-1 min-w-[180px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          data-testid="context-menu"
        >
          <div
            className="px-3 py-1.5 text-[11px] cursor-pointer hover-elevate flex items-center gap-2"
            onClick={() => {
              handleCopyField(contextMenu.field, contextMenu.taskId);
              setContextMenu(null);
            }}
            data-testid="context-copy-cell"
          >
            <ClipboardCopy className="h-3.5 w-3.5" />
            Copy {PASTEABLE_FIELDS[contextMenu.field] || contextMenu.field}
          </div>
          {copiedField && copiedField.field === contextMenu.field && (
            <div
              className="px-3 py-1.5 text-[11px] cursor-pointer hover-elevate flex items-center gap-2"
              onClick={() => {
                if (copiedField) {
                  const task = displayTasks.find(t => t.id === contextMenu.taskId);
                  if (task && (task as any)[copiedField.field] !== copiedField.value) {
                    handleFieldChange(contextMenu.taskId, copiedField.field, copiedField.value);
                    toast({ title: "Pasted", description: `Updated ${PASTEABLE_FIELDS[copiedField.field] || copiedField.field}` });
                  }
                }
                setContextMenu(null);
              }}
              data-testid="context-paste-cell"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste {PASTEABLE_FIELDS[copiedField.field] || copiedField.field}
            </div>
          )}
          {copiedField && selectedTaskIds.size > 0 && (
            <div
              className="px-3 py-1.5 text-[11px] cursor-pointer hover-elevate flex items-center gap-2"
              onClick={() => {
                handlePasteField();
                setContextMenu(null);
              }}
              data-testid="context-paste-all"
            >
              <ClipboardPaste className="h-3.5 w-3.5" />
              Paste to {selectedTaskIds.size} selected row{selectedTaskIds.size > 1 ? "s" : ""}
            </div>
          )}
          <div className="border-t my-1" />
          <div
            className="px-3 py-1.5 text-[11px] cursor-pointer hover-elevate flex items-center gap-2"
            onClick={() => {
              if (!selectedTaskIds.has(contextMenu.taskId)) {
                setSelectedTaskIds(prev => new Set([...prev, contextMenu.taskId]));
              }
              setContextMenu(null);
            }}
            data-testid="context-select-row"
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            {selectedTaskIds.has(contextMenu.taskId) ? "Deselect row" : "Select row"}
          </div>
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
            <DialogDescription>Add a new task to the schedule for this job.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Task Name</Label>
              <Input
                value={newTask.taskName}
                onChange={(e) => setNewTask({ ...newTask, taskName: e.target.value })}
                placeholder="Enter task name..."
                data-testid="input-new-task-name"
              />
            </div>
            <div>
              <Label>Stage</Label>
              <Select value={newTask.stage} onValueChange={(v) => setNewTask({ ...newTask, stage: v })}>
                <SelectTrigger data-testid="select-new-task-stage">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(STAGE_LABEL_MAP).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vendor</Label>
              <Select
                value={newTask.supplierTrade}
                onValueChange={(v) => setNewTask({ ...newTask, supplierTrade: v })}
              >
                <SelectTrigger data-testid="input-new-task-vendor">
                  <SelectValue placeholder="Select a vendor..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {vendorsList.map((v) => (
                    <SelectItem key={v.id} value={v.company}>{v.company}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsibility</Label>
              <Select
                value={newTask.responsibility}
                onValueChange={(v) => setNewTask({ ...newTask, responsibility: v })}
              >
                <SelectTrigger data-testid="input-new-task-responsibility">
                  <SelectValue placeholder="Select a role..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {rolesList.map((r) => (
                    <SelectItem key={r.id} value={r.roleName}>{r.roleName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Memo</Label>
              <Textarea
                value={newTask.memo}
                onChange={(e) => setNewTask({ ...newTask, memo: e.target.value })}
                placeholder="Optional notes..."
                data-testid="input-new-task-memo"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add-task">
              Cancel
            </Button>
            <Button
              onClick={() => addTask.mutate()}
              disabled={!newTask.taskName || addTask.isPending}
              data-testid="button-confirm-add-task"
            >
              {addTask.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!vendorNotFound} onOpenChange={(open) => { if (!open) setVendorNotFound(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Vendor Not Found
            </DialogTitle>
            <DialogDescription>
              "{vendorNotFound?.vendorName}" does not exist in your Vendors directory. You must create this vendor before assigning it to a task.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Company Name</Label>
              <Input
                value={newVendorData.company}
                onChange={(e) => setNewVendorData({ ...newVendorData, company: e.target.value })}
                data-testid="input-new-vendor-company"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newVendorData.address}
                onChange={(e) => setNewVendorData({ ...newVendorData, address: e.target.value })}
                placeholder="Street address..."
                data-testid="input-new-vendor-address"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>City</Label>
                <Input
                  value={newVendorData.city}
                  onChange={(e) => setNewVendorData({ ...newVendorData, city: e.target.value })}
                  data-testid="input-new-vendor-city"
                />
              </div>
              <div>
                <Label>Province/State</Label>
                <Input
                  value={newVendorData.stateProvince}
                  onChange={(e) => setNewVendorData({ ...newVendorData, stateProvince: e.target.value })}
                  data-testid="input-new-vendor-province"
                />
              </div>
            </div>
            <div>
              <Label>Postal/ZIP Code</Label>
              <Input
                value={newVendorData.zipPostalCode}
                onChange={(e) => setNewVendorData({ ...newVendorData, zipPostalCode: e.target.value })}
                data-testid="input-new-vendor-postal"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVendorNotFound(null)} data-testid="button-cancel-vendor">
              Cancel
            </Button>
            <Button
              onClick={() => createVendor.mutate(newVendorData)}
              disabled={!newVendorData.company || createVendor.isPending}
              data-testid="button-create-vendor"
            >
              {createVendor.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRolesManager} onOpenChange={setShowRolesManager}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Master Employee Roles
            </DialogTitle>
            <DialogDescription>
              Manage the list of employee roles available for task assignment. Right-click the Responsibility column header anytime to access this.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Input
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="New role name..."
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newRoleName.trim()) {
                    createRole.mutate(newRoleName.trim());
                  }
                }}
                data-testid="input-new-role-name"
              />
              <Button
                onClick={() => { if (newRoleName.trim()) createRole.mutate(newRoleName.trim()); }}
                disabled={!newRoleName.trim() || createRole.isPending}
                data-testid="button-add-role"
              >
                {createRole.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              </Button>
            </div>
            <div className="border rounded-md divide-y max-h-64 overflow-auto" data-testid="roles-list">
              {rolesList.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No roles defined yet. Add your first role above.
                </div>
              ) : (
                rolesList.map((role) => (
                  <div key={role.id} className="flex items-center justify-between p-2 gap-2" data-testid={`role-item-${role.id}`}>
                    <span className="text-sm">{role.roleName}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteRole.mutate(role.id)}
                      data-testid={`button-delete-role-${role.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRolesManager(false)} data-testid="button-close-roles">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pdfViewerPO} onOpenChange={(open) => { if (!open) setPdfViewerPO(null); }}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Purchase Order: {pdfViewerPO}
            </DialogTitle>
            <DialogDescription>
              PDF viewer for purchase order document.
            </DialogDescription>
          </DialogHeader>
          <iframe
            src={`/api/schedule/po-pdf/${encodeURIComponent(pdfViewerPO || "")}?tenantId=${encodeURIComponent(activeTenant?.id || "")}`}
            className="flex-1 w-full border rounded-md min-h-[400px]"
            data-testid="pdf-viewer-container"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskRow({
  task,
  allTasks,
  tenantId,
  isSelected,
  isFocused,
  onRowFocus,
  onRowSelect,
  onCheckboxToggle,
  onCellRightClick,
  onFieldChange,
  onVendorNotFound,
  vendorsList,
  rolesList,
  isMultiProjectView,
  isMasterView,
  projectName,
  onPODoubleClick,
}: {
  task: ScheduleTask;
  allTasks: ScheduleTask[];
  tenantId: string;
  isSelected: boolean;
  isFocused?: boolean;
  onRowFocus: () => void;
  onRowSelect: (e: React.MouseEvent) => void;
  onCheckboxToggle: () => void;
  onCellRightClick: (e: React.MouseEvent, field: string) => void;
  onFieldChange: (taskId: string, field: string, value: any) => void;
  onVendorNotFound: (vendorName: string, taskId: string) => void;
  vendorsList: { id: string; company: string }[];
  rolesList: EmployeeRole[];
  isMultiProjectView?: boolean;
  isMasterView?: boolean;
  projectName?: string;
  onPODoubleClick?: (poNumber: string) => void;
}) {
  const rowClasses = [
    "border-b transition-colors group",
    isSelected ? "bg-primary/10" : "",
    isFocused ? "bg-accent/40" : "",
    isSelected && isFocused ? "bg-primary/15" : "",
    !isSelected && !isFocused ? "hover:bg-muted/30" : "",
    task.completed ? "opacity-60" : "",
    task.naFlag ? "opacity-40" : "",
  ].join(" ");

  return (
    <tr className={rowClasses} onClick={onRowFocus} data-testid={`row-task-${task.id}`}>
      <td className="px-0.5 py-0.5 text-center" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onCheckboxToggle()}
          className="h-3 w-3"
          data-testid={`checkbox-select-${task.id}`}
        />
      </td>
      <td
        className="px-1 py-0.5 text-muted-foreground text-[10px] tabular-nums cursor-pointer select-none"
        onClick={(e) => { e.stopPropagation(); onRowSelect(e); }}
        data-testid={`text-task-number-${task.id}`}
      >
        {task.taskNumber}
      </td>
      {!isMasterView && (
        <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.ordered || false}
            onCheckedChange={(checked) => onFieldChange(task.id, "ordered", !!checked)}
            data-testid={`checkbox-ordered-${task.id}`}
            className="h-3.5 w-3.5"
          />
        </td>
      )}
      {!isMasterView && (
        <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={task.completed || false}
            onCheckedChange={(checked) => onFieldChange(task.id, "completed", !!checked)}
            data-testid={`checkbox-completed-${task.id}`}
            className="h-3.5 w-3.5"
          />
        </td>
      )}
      <td className="px-1 py-0.5" data-testid={`text-task-name-${task.id}`} onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "taskName")}>
        <div className="flex items-center gap-1" onClick={onRowFocus}>
          {task.ktFlag && (
            <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">KT</Badge>
          )}
          <InlineEditCell
            value={task.taskName}
            field="taskName"
            taskId={task.id}
            onFieldChange={onFieldChange}
            className="font-medium text-[11px]"
            testIdSuffix="taskname"
          />
        </div>
      </td>
      {isMultiProjectView && (
        <td className="px-1 py-0.5 text-[10px] text-muted-foreground truncate max-w-[120px]" title={projectName} data-testid={`text-job-${task.id}`}>
          {projectName}
        </td>
      )}
      <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "supplierTrade")}>
        <VendorDropdownCell
          value={task.supplierTrade || ""}
          taskId={task.id}
          tenantId={tenantId}
          vendorsList={vendorsList}
          onFieldChange={onFieldChange}
          onVendorNotFound={onVendorNotFound}
        />
      </td>
      <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "responsibility")}>
        <RoleDropdownCell
          value={task.responsibility || ""}
          taskId={task.id}
          rolesList={rolesList}
          onFieldChange={onFieldChange}
        />
      </td>
      {!isMasterView && (
        <td
          className="px-1 py-0.5"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={(e) => {
            e.stopPropagation();
            if (task.poNumber && onPODoubleClick) {
              onPODoubleClick(task.poNumber);
            }
          }}
          data-testid={`cell-po-${task.id}`}
        >
          <div
            className={`min-h-[24px] px-1.5 py-0.5 rounded-sm truncate text-[10px] select-none flex items-center ${task.poNumber ? "underline cursor-pointer text-foreground" : "text-muted-foreground/40 italic"}`}
            data-testid={`text-po-${task.id}`}
          >
            {task.poNumber || ""}
          </div>
        </td>
      )}
      <td className="px-1 py-0.5" onContextMenu={(e) => onCellRightClick(e, "stage")}>
        <Badge variant="outline" className="text-[9px] px-1 py-0" data-testid={`badge-stage-${task.id}`}>
          {STAGE_LABEL_MAP[task.stage] || task.stage}
        </Badge>
      </td>
      {isMasterView ? (
        <>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "taskLenDays")}>
            <InlineEditCell
              value={String(task.taskLenDays ?? "")}
              field="taskLenDays"
              taskId={task.id}
              onFieldChange={(id, f, v) => onFieldChange(id, f, v ? parseInt(v) : null)}
              placeholder="—"
              testIdSuffix="days"
              className="text-[10px] tabular-nums"
            />
          </td>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "poRefNum")}>
            <InlineEditCell
              value={task.poRefNum || ""}
              field="poRefNum"
              taskId={task.id}
              onFieldChange={onFieldChange}
              placeholder="—"
              testIdSuffix="porefnum"
              className="text-[10px] tabular-nums text-muted-foreground"
            />
          </td>
          <td className="px-1 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {task.prereqTaskId ? (allTasks.find((t) => t.id === task.prereqTaskId)?.taskNumber ?? "?") : "—"}
          </td>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "offsetDays")}>
            <InlineEditCell
              value={String(task.offsetDays ?? 0)}
              field="offsetDays"
              taskId={task.id}
              onFieldChange={(id, f, v) => onFieldChange(id, f, v ? parseInt(v) : 0)}
              placeholder="0"
              testIdSuffix="offset"
              className="text-[10px] tabular-nums"
            />
          </td>
        </>
      ) : (
        <>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "projectedStart")}>
            <InlineDateCell
              value={task.projectedStart}
              field="projectedStart"
              taskId={task.id}
              onFieldChange={onFieldChange}
            />
          </td>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "projectedFinish")}>
            <InlineDateCell
              value={task.projectedFinish}
              field="projectedFinish"
              taskId={task.id}
              onFieldChange={onFieldChange}
            />
          </td>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "actualStart")}>
            <InlineDateCell
              value={task.actualStart}
              field="actualStart"
              taskId={task.id}
              onFieldChange={onFieldChange}
            />
          </td>
          <td className="px-1 py-0.5" onClick={(e) => e.stopPropagation()} onContextMenu={(e) => onCellRightClick(e, "actualFinish")}>
            <InlineDateCell
              value={task.actualFinish}
              field="actualFinish"
              taskId={task.id}
              onFieldChange={onFieldChange}
            />
          </td>
        </>
      )}
    </tr>
  );
}

function TaskDetailPanel({
  task,
  tenantId,
  onFieldChange,
  onVendorNotFound,
  vendorsList,
  rolesList,
  allTasks,
  isMasterView,
  onPODoubleClick,
}: {
  task: ScheduleTask | null;
  tenantId: string;
  onFieldChange: (taskId: string, field: string, value: any) => void;
  onVendorNotFound: (vendorName: string, taskId: string) => void;
  vendorsList: { id: string; company: string }[];
  rolesList: EmployeeRole[];
  allTasks: ScheduleTask[];
  isMasterView?: boolean;
  onPODoubleClick?: (poNumber: string) => void;
}) {
  if (!task) {
    return (
      <div className="p-3 flex flex-col items-center justify-center h-full text-muted-foreground text-center">
        <ClipboardList className="h-8 w-8 mb-2 opacity-40" />
        <p className="text-[0.7rem] font-medium">Task Details</p>
        <p className="text-[0.6rem] mt-1">Select a task from the grid to view and edit its details here.</p>
      </div>
    );
  }

  const prereqTask = task.prereqTaskId ? allTasks.find(t => t.id === task.prereqTaskId) : null;

  return (
    <div className="p-2 space-y-1.5">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-[0.7rem]" data-testid="text-detail-title">{isMasterView ? "Template" : "Task"} #{task.taskNumber}</h3>
      </div>

      <div className="space-y-1.5">
        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Task Name</Label>
          <Input
            key={`name-${task.id}`}
            defaultValue={task.taskName}
            onBlur={(e) => {
              if (e.target.value !== task.taskName) onFieldChange(task.id, "taskName", e.target.value);
            }}
            className="h-6 text-[0.7rem] px-1.5"
            data-testid="input-detail-task-name"
          />
        </div>

        {!isMasterView && (
          <div className="grid grid-cols-2 gap-1.5">
            <div className="flex items-center gap-1">
              <Checkbox
                checked={task.ordered || false}
                onCheckedChange={(c) => onFieldChange(task.id, "ordered", !!c)}
                className="h-3 w-3"
                data-testid="checkbox-detail-ordered"
              />
              <Label className="text-[0.65rem]">Order</Label>
              {task.orderedDate && (
                <span className="text-[0.55rem] text-muted-foreground ml-auto">{formatDate(task.orderedDate)}</span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Checkbox
                checked={task.completed || false}
                onCheckedChange={(c) => onFieldChange(task.id, "completed", !!c)}
                className="h-3 w-3"
                data-testid="checkbox-detail-completed"
              />
              <Label className="text-[0.65rem]">Complete</Label>
              {task.completedDate && (
                <span className="text-[0.55rem] text-muted-foreground ml-auto">{formatDate(task.completedDate)}</span>
              )}
            </div>
          </div>
        )}

        {!isMasterView && (
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-[0.65rem] text-muted-foreground leading-none">Proj Start</Label>
              <Input
                key={`ps-${task.id}`}
                type="date"
                defaultValue={formatDateForInput(task.projectedStart)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  onFieldChange(task.id, "projectedStart", val);
                }}
                className="h-6 text-[0.7rem] px-1"
                data-testid="input-detail-proj-start"
              />
            </div>
            <div>
              <Label className="text-[0.65rem] text-muted-foreground leading-none">Proj Finish</Label>
              <Input
                key={`pf-${task.id}`}
                type="date"
                defaultValue={formatDateForInput(task.projectedFinish)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  onFieldChange(task.id, "projectedFinish", val);
                }}
                className="h-6 text-[0.7rem] px-1"
                data-testid="input-detail-proj-finish"
              />
            </div>
          </div>
        )}

        {!isMasterView && (
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <Label className="text-[0.65rem] text-muted-foreground leading-none">Act Start</Label>
              <Input
                key={`as-${task.id}`}
                type="date"
                defaultValue={formatDateForInput(task.actualStart)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  onFieldChange(task.id, "actualStart", val);
                }}
                className="h-6 text-[0.7rem] px-1"
                data-testid="input-detail-act-start"
              />
            </div>
            <div>
              <Label className="text-[0.65rem] text-muted-foreground leading-none">Act Finish</Label>
              <Input
                key={`af-${task.id}`}
                type="date"
                defaultValue={formatDateForInput(task.actualFinish)}
                onBlur={(e) => {
                  const val = e.target.value ? new Date(e.target.value).toISOString() : null;
                  onFieldChange(task.id, "actualFinish", val);
                }}
                className="h-6 text-[0.7rem] px-1"
                data-testid="input-detail-act-finish"
              />
            </div>
          </div>
        )}

        {!isMasterView && (
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">PO #</Label>
            <div
              className={`h-6 text-[0.7rem] px-1.5 flex items-center rounded-sm bg-muted/30 select-none ${task.poNumber ? "underline cursor-pointer" : "text-muted-foreground/50"}`}
              onDoubleClick={() => {
                if (task.poNumber && onPODoubleClick) onPODoubleClick(task.poNumber);
              }}
              data-testid="text-detail-po"
            >
              {task.poNumber || "—"}
            </div>
          </div>
        )}

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Vendor</Label>
          <Select
            key={`vendor-${task.id}`}
            defaultValue={task.supplierTrade || ""}
            onValueChange={(v) => {
              const newVal = v === "__none__" ? null : v;
              if (newVal !== (task.supplierTrade || null)) {
                onFieldChange(task.id, "supplierTrade", newVal);
              }
            }}
          >
            <SelectTrigger className="h-6 text-[0.7rem] px-1.5" data-testid="input-detail-vendor">
              <SelectValue placeholder="Select vendor..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {vendorsList.map((v) => (
                <SelectItem key={v.id} value={v.company}>{v.company}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Responsibility</Label>
          <Select
            key={`resp-${task.id}`}
            defaultValue={task.responsibility || ""}
            onValueChange={(v) => {
              const newVal = v === "__none__" ? null : v;
              if (newVal !== (task.responsibility || null)) {
                onFieldChange(task.id, "responsibility", newVal);
              }
            }}
          >
            <SelectTrigger className="h-6 text-[0.7rem] px-1.5" data-testid="input-detail-responsibility">
              <SelectValue placeholder="Select role..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">None</SelectItem>
              {rolesList.map((r) => (
                <SelectItem key={r.id} value={r.roleName}>{r.roleName}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Stage</Label>
          <Select
            key={`stage-${task.id}`}
            defaultValue={task.stage}
            onValueChange={(v) => onFieldChange(task.id, "stage", v)}
          >
            <SelectTrigger className="h-6 text-[0.7rem] px-1.5" data-testid="select-detail-stage">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(STAGE_LABEL_MAP).map(([key, label]) => (
                <SelectItem key={key} value={key}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">Days</Label>
            <Input
              key={`days-${task.id}`}
              type="number"
              defaultValue={task.taskLenDays ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                onFieldChange(task.id, "taskLenDays", val);
              }}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-task-len"
            />
          </div>
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">Offset</Label>
            <Input
              key={`offset-${task.id}`}
              type="number"
              defaultValue={task.offsetDays ?? ""}
              onBlur={(e) => {
                const val = e.target.value ? parseInt(e.target.value) : null;
                onFieldChange(task.id, "offsetDays", val);
              }}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-offset"
            />
          </div>
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">PO Ref Number</Label>
          <Input
            key={`poref-${task.id}`}
            defaultValue={task.poRefNum || ""}
            onBlur={(e) => {
              if (e.target.value !== (task.poRefNum || ""))
                onFieldChange(task.id, "poRefNum", e.target.value || null);
            }}
            className="h-6 text-[0.7rem] px-1.5"
            data-testid="input-detail-porefnum"
          />
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">PreReq Task</Label>
          <div className="text-[0.7rem] px-1.5 py-0.5 bg-muted/30 rounded-sm min-h-[18px]" data-testid="text-detail-prereq">
            {prereqTask ? `#${prereqTask.taskNumber} - ${prereqTask.taskName}` : (task.prereqTaskId ? "Unknown" : "None")}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">SqftDay</Label>
            <Input
              key={`sqft-${task.id}`}
              defaultValue={task.sqftDay ?? ""}
              onBlur={(e) => onFieldChange(task.id, "sqftDay", e.target.value || null)}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-sqftday"
            />
          </div>
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">MoneyDay</Label>
            <Input
              key={`money-${task.id}`}
              defaultValue={task.moneyDay ?? ""}
              onBlur={(e) => onFieldChange(task.id, "moneyDay", e.target.value || null)}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-moneyday"
            />
          </div>
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Money Code</Label>
          <Input
            key={`mcode-${task.id}`}
            defaultValue={task.moneyCode || ""}
            onBlur={(e) => {
              if (e.target.value !== (task.moneyCode || ""))
                onFieldChange(task.id, "moneyCode", e.target.value || null);
            }}
            className="h-6 text-[0.7rem] px-1.5"
            data-testid="input-detail-moneycode"
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">Who's Task</Label>
            <Input
              key={`wt-${task.id}`}
              defaultValue={task.whosTask || ""}
              onBlur={(e) => onFieldChange(task.id, "whosTask", e.target.value || null)}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-whos-task"
            />
          </div>
          <div>
            <Label className="text-[0.65rem] text-muted-foreground leading-none">Supervisor</Label>
            <Input
              key={`sup-${task.id}`}
              defaultValue={task.supervisor || ""}
              onBlur={(e) => onFieldChange(task.id, "supervisor", e.target.value || null)}
              className="h-6 text-[0.7rem] px-1.5"
              data-testid="input-detail-supervisor"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <div className="flex items-center gap-1">
            <Checkbox
              checked={task.ktFlag || false}
              onCheckedChange={(c) => onFieldChange(task.id, "ktFlag", !!c)}
              className="h-3 w-3"
              data-testid="checkbox-detail-kt"
            />
            <Label className="text-[0.65rem]">Key Task (KT)</Label>
          </div>
          <div className="flex items-center gap-1">
            <Checkbox
              checked={task.naFlag || false}
              onCheckedChange={(c) => onFieldChange(task.id, "naFlag", !!c)}
              className="h-3 w-3"
              data-testid="checkbox-detail-na"
            />
            <Label className="text-[0.65rem]">N/A</Label>
          </div>
        </div>

        <div>
          <Label className="text-[0.65rem] text-muted-foreground leading-none">Memo</Label>
          <Textarea
            key={`memo-${task.id}`}
            defaultValue={task.memo || ""}
            onBlur={(e) => {
              if (e.target.value !== (task.memo || ""))
                onFieldChange(task.id, "memo", e.target.value || null);
            }}
            className="text-[0.7rem] min-h-[3rem] px-1.5 py-1"
            data-testid="input-detail-memo"
          />
        </div>
      </div>
    </div>
  );
}
