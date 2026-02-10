import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Network,
  Plus,
  ChevronRight,
  ChevronDown,
  Trash2,
  FolderTree,
  Circle,
  CheckCircle2,
  Clock,
  Pause,
  X,
  Layers,
  GitBranch,
  Upload,
  Calendar,
  Hammer,
  MapPin,
  Building2,
  Layers3,
  Grid3x3,
  FileText,
  Settings2,
  Box,
  Package,
  DollarSign,
  Users,
  List,
  Pencil,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { WbsNode, Project } from "@shared/schema";
import { wbsDimensionDefinitions } from "@shared/schema";
import { useSettings } from "@/components/settings-provider";

const wbsFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["not_started", "in_progress", "on_hold", "completed", "cancelled"]),
  projectId: z.string().min(1, "Project is required"),
  parentId: z.string().optional(),
  estimatedHours: z.string().optional(),
  estimatedCost: z.string().optional(),
  dimensions: z.record(z.string()).optional(),
});

type WbsFormData = z.infer<typeof wbsFormSchema>;

interface WbsNodeWithChildren extends WbsNode {
  children: WbsNodeWithChildren[];
}

const dimensionIcons: Record<string, React.ReactNode> = {
  phase: <Calendar className="h-4 w-4" />,
  trade: <Hammer className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  level: <Layers className="h-4 w-4" />,
  zone: <Grid3x3 className="h-4 w-4" />,
  system: <FileText className="h-4 w-4" />,
  subsystem: <Settings2 className="h-4 w-4" />,
  element_type: <Box className="h-4 w-4" />,
  material: <Layers3 className="h-4 w-4" />,
  work_package: <Package className="h-4 w-4" />,
  cost_code: <DollarSign className="h-4 w-4" />,
  responsibility: <Users className="h-4 w-4" />,
};

const statusConfig: Record<string, { icon: React.ReactNode; label: string }> = {
  not_started: { icon: <Circle className="h-3 w-3 text-muted-foreground" />, label: "Not Started" },
  in_progress: { icon: <Clock className="h-3 w-3 text-primary" />, label: "In Progress" },
  on_hold: { icon: <Pause className="h-3 w-3 text-amber-500" />, label: "On Hold" },
  completed: { icon: <CheckCircle2 className="h-3 w-3 text-green-500" />, label: "Completed" },
  cancelled: { icon: <X className="h-3 w-3 text-destructive" />, label: "Cancelled" },
};

function WbsTreeView({
  nodes,
  expandedNodes,
  onToggleNode,
  onEdit,
  onDelete,
  onAddChild,
}: {
  nodes: WbsNodeWithChildren[];
  expandedNodes: Set<string>;
  onToggleNode: (id: string) => void;
  onEdit: (node: WbsNode) => void;
  onDelete: (id: string) => void;
  onAddChild: (parentId: string, projectId: string) => void;
}) {
  const renderNode = (node: WbsNodeWithChildren, depth: number = 0) => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedNodes.has(node.id);

    return (
      <div key={node.id} data-testid={`tree-node-${node.id}`}>
        <div
          className="flex items-center gap-1.5 px-1 py-0.5 rounded-md hover-elevate group text-[11px]"
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {hasChildren ? (
            <button
              onClick={() => onToggleNode(node.id)}
              className="p-0.5 rounded"
              data-testid={`tree-toggle-${node.id}`}
            >
              {isExpanded ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          ) : (
            <span className="w-4" />
          )}

          {statusConfig[node.status]?.icon || statusConfig.not_started.icon}

          <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
            {node.codeDisplay || node.codePath}
          </Badge>

          <span className="font-medium text-[11px] flex-1 truncate">{node.title}</span>

          {node.estimatedHours && (
            <span className="text-[10px] text-muted-foreground hidden md:block">
              {node.estimatedHours}h
            </span>
          )}

          <div className="flex items-center gap-0.5 invisible group-hover:visible">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onEdit(node)}
              data-testid={`tree-edit-${node.id}`}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onAddChild(node.id, node.projectId)}
              data-testid={`tree-add-child-${node.id}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(node.id)}
              data-testid={`tree-delete-${node.id}`}
            >
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            </Button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l border-border ml-4">
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (nodes.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8 text-xs">
        No WBS nodes found. Click "Add Node" to create one.
      </div>
    );
  }

  return (
    <div className="space-y-0.5 text-[11px]" data-testid="tree-view">
      {nodes.map((node) => renderNode(node, 0))}
    </div>
  );
}

export default function WBS() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<WbsNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [dimensionValues, setDimensionValues] = useState<Record<string, string>>({});
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, string>>>([]);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedDimension, setSelectedDimension] = useState<string>("__all__");
  const [viewMode, setViewMode] = useState<"table" | "tree">("table");
  const [expandedTreeNodes, setExpandedTreeNodes] = useState<Set<string>>(new Set());
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { activeTenant } = useSettings();

  const wbsDimensions = activeTenant?.config?.wbsDimensions || [];

  const dimensionLabelsMap: Record<string, { label: string; code: string; description: string; hidden: boolean }> = {};
  wbsDimensionDefinitions.forEach((dim) => {
    const customDim = wbsDimensions.find((d: any) => d.key === dim.key);
    dimensionLabelsMap[dim.key] = {
      label: customDim?.label || dim.label,
      code: customDim?.code || dim.key.toUpperCase(),
      description: customDim?.description || dim.description,
      hidden: customDim?.hidden ?? false,
    };
  });

  const getDimensionLabel = (key: string): string => {
    return dimensionLabelsMap[key]?.label || key;
  };

  const getDimensionCode = (key: string): string => {
    return dimensionLabelsMap[key]?.code || key.toUpperCase();
  };

  const getSortedDimensions = () => {
    return [...wbsDimensionDefinitions].sort((a, b) => {
      const customA = wbsDimensions.find((d: any) => d.key === a.key);
      const customB = wbsDimensions.find((d: any) => d.key === b.key);
      const orderA = customA?.sortOrder ?? wbsDimensionDefinitions.findIndex(d => d.key === a.key);
      const orderB = customB?.sortOrder ?? wbsDimensionDefinitions.findIndex(d => d.key === b.key);
      return orderA - orderB;
    });
  };

  useEffect(() => {
    setExpandedTreeNodes(new Set());
  }, [selectedDimension]);

  const { data: wbsNodes, isLoading: wbsLoading } = useQuery<WbsNode[]>({
    queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`],
    enabled: !!activeTenant?.id,
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: [`/api/projects?tenantId=${activeTenant?.id}`],
    enabled: !!activeTenant?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: WbsFormData) => {
      return apiRequest("POST", "/api/wbs", {
        ...data,
        estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
        parentId: data.parentId || undefined,
        dimensions: dimensionValues,
        tenantId: activeTenant?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats", activeTenant?.id] });
      setIsCreateOpen(false);
      form.reset();
      setDimensionValues({});
      toast({
        title: "WBS node created",
        description: "The work breakdown structure node has been added.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create WBS node. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/wbs/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats", activeTenant?.id] });
      toast({
        title: "WBS node deleted",
        description: "The node and its children have been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete WBS node. Please try again.",
        variant: "destructive",
      });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: WbsFormData & { id: string }) => {
      const { id, ...rest } = data;
      const payload: Record<string, unknown> = {
        title: rest.title,
        description: rest.description,
        status: rest.status,
        projectId: rest.projectId,
        estimatedHours: rest.estimatedHours ? parseFloat(rest.estimatedHours) : undefined,
        estimatedCost: rest.estimatedCost ? parseFloat(rest.estimatedCost) : undefined,
        dimensions: dimensionValues,
      };
      if (rest.parentId && rest.parentId !== "__root__") {
        payload.parentId = rest.parentId;
      }
      return apiRequest("PATCH", `/api/wbs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats", activeTenant?.id] });
      setIsEditOpen(false);
      setEditingNode(null);
      editForm.reset();
      setDimensionValues({});
      toast({
        title: "WBS node updated",
        description: "The work breakdown structure node has been updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update WBS node. Please try again.",
        variant: "destructive",
      });
    },
  });

  const bulkCreateMutation = useMutation({
    mutationFn: async (nodes: Array<Omit<WbsFormData, 'parentId'> & { parentId?: string }>) => {
      const results = [];
      for (const node of nodes) {
        const result = await apiRequest("POST", "/api/wbs", {
          ...node,
          estimatedHours: node.estimatedHours ? parseFloat(node.estimatedHours) : undefined,
          estimatedCost: node.estimatedCost ? parseFloat(node.estimatedCost) : undefined,
        });
        results.push(result);
      }
      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats", activeTenant?.id] });
      setIsCsvDialogOpen(false);
      setCsvPreview([]);
      toast({
        title: "CSV imported successfully",
        description: `${results.length} WBS nodes have been created.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to import CSV. Please check your data and try again.",
        variant: "destructive",
      });
    },
  });

  const copyMasterMutation = useMutation({
    mutationFn: async (projectId: string) => {
      return apiRequest("POST", `/api/projects/${projectId}/copy-master-wbs?tenantId=${activeTenant?.id}`);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs?tenantId=${activeTenant?.id}`] });
      toast({
        title: "Master Codes Copied",
        description: data.message || "WBS nodes created from master codes.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy master WBS codes to project.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<WbsFormData>({
    resolver: zodResolver(wbsFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "not_started",
      projectId: "",
      parentId: "",
      estimatedHours: "",
      estimatedCost: "",
    },
  });

  const editForm = useForm<WbsFormData>({
    resolver: zodResolver(wbsFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "not_started",
      projectId: "",
      parentId: "",
      estimatedHours: "",
      estimatedCost: "",
    },
  });

  const onSubmit = (data: WbsFormData) => {
    createMutation.mutate({
      ...data,
      parentId: data.parentId === "__root__" ? undefined : data.parentId,
    });
  };

  const onEditSubmit = (data: WbsFormData) => {
    if (!editingNode) return;
    editMutation.mutate({
      ...data,
      id: editingNode.id,
    });
  };

  const openEditDialog = (node: WbsNode) => {
    setEditingNode(node);
    setDimensionValues((node.dimensions as Record<string, string>) || {});
    editForm.reset({
      title: node.title,
      description: node.description || "",
      status: node.status as WbsFormData["status"],
      projectId: node.projectId,
      parentId: node.parentId || "__root__",
      estimatedHours: node.estimatedHours?.toString() || "",
      estimatedCost: node.estimatedCost?.toString() || "",
    });
    setIsEditOpen(true);
  };

  const openAddChildDialog = (parentId: string, projectId: string) => {
    form.reset({
      title: "",
      description: "",
      status: "not_started",
      projectId: projectId,
      parentId: parentId,
      estimatedHours: "",
      estimatedCost: "",
    });
    setDimensionValues({});
    setIsCreateOpen(true);
  };

  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];

    const parseLine = (line: string): string[] => {
      const result: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ""));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ""));
      return result;
    };

    const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/[^a-z0-9_]/g, "_"));

    if (!headers.includes("title")) {
      return [];
    }

    const rows: Array<Record<string, string>> = [];
    const validStatuses = ["not_started", "in_progress", "on_hold", "completed", "cancelled"];

    for (let i = 1; i < lines.length; i++) {
      const values = parseLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || "";
      });

      if (row.title) {
        if (row.status && !validStatuses.includes(row.status)) {
          row.status = "not_started";
        }
        rows.push(row);
      }
    }
    return rows;
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith(".csv")) {
      const reader = new FileReader();
      reader.onload = () => {
        const data = parseCSV(reader.result as string);
        if (data.length > 0) {
          setCsvPreview(data);
          setIsCsvDialogOpen(true);
        } else {
          toast({
            title: "Invalid CSV",
            description: "The CSV file must have a header row with at least 'title' column.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const handleImportCSV = () => {
    if (!projects?.length) {
      toast({
        title: "No projects",
        description: "Please create a project first before importing WBS nodes.",
        variant: "destructive",
      });
      return;
    }

    const defaultProjectId = projects[0].id;
    const nodesToCreate = csvPreview.map(row => ({
      title: row.title,
      description: row.description || "",
      status: (["not_started", "in_progress", "on_hold", "completed", "cancelled"].includes(row.status)
        ? row.status : "not_started") as WbsFormData["status"],
      projectId: row.project_id || defaultProjectId,
      parentId: row.parent_id || undefined,
      estimatedHours: row.estimated_hours || "",
      estimatedCost: row.estimated_cost || "",
    }));

    bulkCreateMutation.mutate(nodesToCreate);
  };

  const buildTree = (nodes: WbsNode[]): WbsNodeWithChildren[] => {
    const nodeMap = new Map<string, WbsNodeWithChildren>();
    const roots: WbsNodeWithChildren[] = [];

    nodes.forEach((node) => {
      nodeMap.set(node.id, { ...node, children: [] });
    });

    nodes.forEach((node) => {
      const current = nodeMap.get(node.id)!;
      if (node.parentId && nodeMap.has(node.parentId)) {
        nodeMap.get(node.parentId)!.children.push(current);
      } else {
        roots.push(current);
      }
    });

    const sortChildren = (items: WbsNodeWithChildren[]) => {
      items.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      items.forEach((item) => sortChildren(item.children));
    };

    sortChildren(roots);
    return roots;
  };

  const getNodeCountForDimension = (dimKey: string): number => {
    if (!wbsNodes) return 0;
    let filtered = wbsNodes;
    if (selectedProjectId) {
      filtered = filtered.filter(n => n.projectId === selectedProjectId);
    }
    return filtered.filter(n => {
      const dims = n.dimensions as Record<string, string> | null;
      return dims && dims[dimKey] && dims[dimKey].trim() !== "";
    }).length;
  };

  const filteredNodes = (() => {
    let nodes = wbsNodes || [];
    if (selectedProjectId) {
      nodes = nodes.filter(n => n.projectId === selectedProjectId);
    }
    if (selectedDimension !== "__all__") {
      nodes = nodes.filter(n => {
        const dims = n.dimensions as Record<string, string> | null;
        return dims && dims[selectedDimension] && dims[selectedDimension].trim() !== "";
      });
    }
    return nodes;
  })();

  const tree = buildTree(filteredNodes);
  const isLoading = wbsLoading || projectsLoading;

  if (isLoading) {
    return (
      <div className="p-3 space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const totalNodes = filteredNodes.length;

  return (
    <div className="p-3 space-y-3" data-testid="page-wbs">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-lg font-bold flex items-center gap-2" data-testid="text-wbs-title">
            <Network className="h-5 w-5 text-primary" />
            Work Breakdown Structure
          </h1>
          <p className="text-xs text-muted-foreground">
            Organize your project tasks in a hierarchical structure.
          </p>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          <Select
            value={selectedProjectId || "__all__"}
            onValueChange={(value) => setSelectedProjectId(value === "__all__" ? null : value)}
          >
            <SelectTrigger className="w-[180px]" data-testid="select-project-filter">
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Projects</SelectItem>
              {projects?.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="secondary" className="text-[10px]" data-testid="badge-total-nodes">
            {totalNodes} Nodes
          </Badge>
          <a href="/wbs/master-codes">
            <Button variant="outline" size="sm" data-testid="button-master-codes">
              <Layers className="h-3.5 w-3.5 mr-1" />
              Master Codes
            </Button>
          </a>
          {selectedProjectId && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyMasterMutation.mutate(selectedProjectId)}
              disabled={copyMasterMutation.isPending}
              data-testid="button-copy-master"
            >
              <FolderTree className="h-3.5 w-3.5 mr-1" />
              {copyMasterMutation.isPending ? "Copying..." : "Copy from Master"}
            </Button>
          )}
          <input
            type="file"
            ref={csvInputRef}
            accept=".csv"
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => csvInputRef.current?.click()}
            data-testid="button-browse-csv"
          >
            <Upload className="h-3.5 w-3.5 mr-1" />
            CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-3">
        <Card className="lg:col-span-1">
          <CardHeader className="px-3 py-2">
            <CardTitle className="text-sm">Dimensions</CardTitle>
            <CardDescription className="text-[10px]">
              Filter nodes by WBS dimension
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-0.5 px-1.5 pb-1.5">
              <button
                onClick={() => setSelectedDimension("__all__")}
                className={`w-full flex items-center justify-between px-1.5 py-1 rounded-md text-left transition-colors ${
                  selectedDimension === "__all__"
                    ? "bg-primary text-primary-foreground"
                    : "hover-elevate"
                }`}
                data-testid="button-dimension-all"
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 shrink-0"><Network className="h-3.5 w-3.5" /></span>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-medium truncate">All Nodes</span>
                    <span className={`text-[9px] ${selectedDimension === "__all__" ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                      ALL
                    </span>
                  </div>
                </div>
                <Badge
                  variant={selectedDimension === "__all__" ? "secondary" : "outline"}
                  className="text-[9px] px-1 py-0 ml-1 flex-shrink-0"
                >
                  {wbsNodes?.filter(n => !selectedProjectId || n.projectId === selectedProjectId).length || 0}
                </Badge>
              </button>
              {getSortedDimensions().filter(dim => !dimensionLabelsMap[dim.key]?.hidden).map((dim) => {
                const count = getNodeCountForDimension(dim.key);
                const isSelected = selectedDimension === dim.key;
                return (
                  <button
                    key={dim.key}
                    onClick={() => setSelectedDimension(dim.key)}
                    className={`w-full flex items-center justify-between px-1.5 py-1 rounded-md text-left transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover-elevate"
                    }`}
                    data-testid={`button-dimension-${dim.key}`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      <span className="[&>svg]:h-3.5 [&>svg]:w-3.5 shrink-0">{dimensionIcons[dim.key]}</span>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] font-medium truncate">{getDimensionLabel(dim.key)}</span>
                        <span className={`text-[9px] ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {getDimensionCode(dim.key)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={isSelected ? "secondary" : "outline"}
                      className="text-[9px] px-1 py-0 ml-1 flex-shrink-0"
                    >
                      {count}
                    </Badge>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between gap-2 px-3 py-2">
            <div>
              <CardTitle className="flex items-center gap-1.5 text-sm">
                {selectedDimension === "__all__" ? (
                  <Network className="h-3.5 w-3.5" />
                ) : (
                  <span className="[&>svg]:h-3.5 [&>svg]:w-3.5">{dimensionIcons[selectedDimension]}</span>
                )}
                {selectedDimension === "__all__" ? "All WBS Nodes" : getDimensionLabel(selectedDimension)}
              </CardTitle>
              <CardDescription className="text-[10px]">
                {selectedDimension === "__all__"
                  ? "All work breakdown structure nodes across dimensions"
                  : `Nodes tagged with ${getDimensionLabel(selectedDimension)} dimension`}
              </CardDescription>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex border rounded-md">
                <Button
                  size="icon"
                  variant={viewMode === "table" ? "default" : "ghost"}
                  onClick={() => setViewMode("table")}
                  className="rounded-r-none"
                  data-testid="button-view-table"
                >
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant={viewMode === "tree" ? "default" : "ghost"}
                  onClick={() => setViewMode("tree")}
                  className="rounded-l-none"
                  data-testid="button-view-tree"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  form.reset({
                    title: "",
                    description: "",
                    status: "not_started",
                    projectId: selectedProjectId || "",
                    parentId: "",
                    estimatedHours: "",
                    estimatedCost: "",
                  });
                  setDimensionValues(selectedDimension !== "__all__" ? { [selectedDimension]: "" } : {});
                  setIsCreateOpen(true);
                }}
                data-testid="button-create-wbs"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Node
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-3 pb-3 pt-0">
            {viewMode === "table" ? (
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 z-10 bg-muted">
                  <tr className="border-b">
                    <th className="text-left px-1 py-1 w-14 font-medium text-[10px]">Order</th>
                    <th className="text-left px-1 py-1 w-24 font-medium text-[10px]">Code</th>
                    <th className="text-left px-1 py-1 font-medium text-[10px]">Title</th>
                    <th className="text-left px-1 py-1 w-20 font-medium text-[10px]">Status</th>
                    <th className="text-left px-1 py-1 font-medium text-[10px] hidden lg:table-cell">Project</th>
                    <th className="text-left px-1 py-1 font-medium text-[10px] hidden md:table-cell">Description</th>
                    <th className="text-right px-1 py-1 w-16 font-medium text-[10px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNodes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted-foreground py-6 text-xs">
                        No WBS nodes found. Click "Add Node" to create one.
                      </td>
                    </tr>
                  ) : (
                    [...filteredNodes]
                      .sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
                      .map((node) => {
                        const project = projects?.find(p => p.id === node.projectId);
                        return (
                          <tr key={node.id} className="border-b hover-elevate transition-colors" data-testid={`row-node-${node.id}`}>
                            <td className="px-1 py-0.5 text-[10px] tabular-nums">{node.orderIndex || 0}</td>
                            <td className="px-1 py-0.5">
                              <Badge variant="outline" className="font-mono text-[9px] px-1 py-0">
                                {node.codeDisplay || node.codePath}
                              </Badge>
                            </td>
                            <td className="px-1 py-0.5 font-medium">{node.title}</td>
                            <td className="px-1 py-0.5">
                              <div className="flex items-center gap-1">
                                {statusConfig[node.status]?.icon}
                                <span className="text-[10px]">{statusConfig[node.status]?.label || node.status}</span>
                              </div>
                            </td>
                            <td className="px-1 py-0.5 hidden lg:table-cell">
                              {project ? (
                                <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                  {project.name}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="px-1 py-0.5 hidden md:table-cell text-muted-foreground text-[10px] truncate max-w-[200px]">
                              {node.description || "—"}
                            </td>
                            <td className="px-1 py-0.5 text-right">
                              <div className="flex items-center justify-end gap-0.5">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openEditDialog(node)}
                                  data-testid={`button-edit-${node.id}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => deleteMutation.mutate(node.id)}
                                  data-testid={`button-delete-${node.id}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                  )}
                </tbody>
              </table>
            ) : (
              <WbsTreeView
                nodes={tree}
                expandedNodes={expandedTreeNodes}
                onToggleNode={(nodeId) => {
                  setExpandedTreeNodes((prev) => {
                    const next = new Set(prev);
                    if (next.has(nodeId)) {
                      next.delete(nodeId);
                    } else {
                      next.add(nodeId);
                    }
                    return next;
                  });
                }}
                onEdit={openEditDialog}
                onDelete={(id) => deleteMutation.mutate(id)}
                onAddChild={openAddChildDialog}
              />
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add WBS Node</DialogTitle>
            <DialogDescription>
              Create a new work breakdown structure element.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-wbs-project">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Node (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-wbs-parent">
                          <SelectValue placeholder="Select parent (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__root__">No Parent (Root Level)</SelectItem>
                        {wbsNodes?.map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.codeDisplay || node.codePath} - {node.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter node title"
                        data-testid="input-wbs-title"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe this work item..."
                        className="resize-none"
                        data-testid="input-wbs-description"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-wbs-status">
                            <SelectValue placeholder="Status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="not_started">Not Started</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="on_hold">On Hold</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          data-testid="input-wbs-hours"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          data-testid="input-wbs-cost"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              {wbsDimensionDefinitions.length > 0 && (
                <div className="space-y-3 pt-2 border-t">
                  <p className="text-sm font-medium text-muted-foreground">Dimensions</p>
                  <div className="grid grid-cols-2 gap-4">
                    {wbsDimensionDefinitions
                      .filter(dim => !dimensionLabelsMap[dim.key]?.hidden)
                      .map((dim) => (
                      <div key={dim.key} className="space-y-2">
                        <label className="text-sm font-medium">
                          {getDimensionLabel(dim.key)}
                        </label>
                        <Input
                          placeholder={`Enter ${getDimensionLabel(dim.key).toLowerCase()}`}
                          value={dimensionValues[dim.key] || ""}
                          onChange={(e) =>
                            setDimensionValues((prev) => ({
                              ...prev,
                              [dim.key]: e.target.value,
                            }))
                          }
                          data-testid={`input-dimension-${dim.key}`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  data-testid="button-cancel-wbs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending}
                  data-testid="button-submit-wbs"
                >
                  {createMutation.isPending ? "Creating..." : "Create Node"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit WBS Node</DialogTitle>
            <DialogDescription>
              Update the work breakdown structure element.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <FormField
                control={editForm.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-wbs-project">
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects?.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Node</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-wbs-parent">
                          <SelectValue placeholder="Select parent" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="__root__">No Parent (Root Level)</SelectItem>
                        {wbsNodes?.filter(n => n.id !== editingNode?.id).map((node) => (
                          <SelectItem key={node.id} value={node.id}>
                            {node.codeDisplay || node.codePath} - {node.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter node title"
                        {...field}
                        data-testid="input-edit-wbs-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Enter description"
                        {...field}
                        data-testid="textarea-edit-wbs-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={editForm.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-wbs-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="on_hold">On Hold</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="estimatedHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          data-testid="input-edit-wbs-hours"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="estimatedCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Est. Cost ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          data-testid="input-edit-wbs-cost"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditOpen(false)}
                  data-testid="button-cancel-edit-wbs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={editMutation.isPending}
                  data-testid="button-submit-edit-wbs"
                >
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Import CSV Preview</DialogTitle>
            <DialogDescription>
              Review the WBS nodes to be imported. {csvPreview.length} items found.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[400px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-background">
                <tr className="border-b">
                  <th className="text-left p-2 font-medium">Title</th>
                  <th className="text-left p-2 font-medium">Description</th>
                  <th className="text-left p-2 font-medium">Status</th>
                  <th className="text-left p-2 font-medium">Hours</th>
                  <th className="text-left p-2 font-medium">Cost</th>
                </tr>
              </thead>
              <tbody>
                {csvPreview.map((row, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="p-2">{row.title}</td>
                    <td className="p-2 text-muted-foreground truncate max-w-[150px]">{row.description || "-"}</td>
                    <td className="p-2">
                      <Badge variant="secondary">{row.status || "not_started"}</Badge>
                    </td>
                    <td className="p-2">{row.estimated_hours || "-"}</td>
                    <td className="p-2">{row.estimated_cost || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCsvDialogOpen(false);
                setCsvPreview([]);
              }}
              data-testid="button-cancel-csv-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImportCSV}
              disabled={bulkCreateMutation.isPending}
              data-testid="button-confirm-csv-import"
            >
              {bulkCreateMutation.isPending ? "Importing..." : `Import ${csvPreview.length} Nodes`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
