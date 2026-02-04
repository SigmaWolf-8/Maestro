import { useState, useCallback, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Network,
  Plus,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Trash2,
  Edit,
  FolderTree,
  Circle,
  CheckCircle2,
  Clock,
  Pause,
  X,
  Layers,
  GitBranch,
  Upload,
  FileSpreadsheet,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

export default function WBS() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNode, setEditingNode] = useState<WbsNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [dimensionValues, setDimensionValues] = useState<Record<string, string>>({});
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvPreview, setCsvPreview] = useState<Array<Record<string, string>>>([]);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { activeTenant } = useSettings();
  
  const wbsDimensions = activeTenant?.config?.wbsDimensions || [];

  const { data: wbsNodes, isLoading: wbsLoading } = useQuery<WbsNode[]>({
    queryKey: ["/api/wbs"],
  });

  const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: WbsFormData) => {
      return apiRequest("POST", "/api/wbs", {
        ...data,
        estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
        estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
        parentId: data.parentId || undefined,
        dimensions: dimensionValues,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      // Only include parentId if it's not root level
      if (rest.parentId && rest.parentId !== "__root__") {
        payload.parentId = rest.parentId;
      }
      return apiRequest("PATCH", `/api/wbs/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
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

  // CSV parsing function - handles quoted values with commas
  const parseCSV = (text: string): Array<Record<string, string>> => {
    const lines = text.trim().split("\n");
    if (lines.length < 2) return [];
    
    // Parse a single line handling quoted values
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
    
    // Validate required headers
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
      
      // Only add rows with a title and normalize status
      if (row.title) {
        if (row.status && !validStatuses.includes(row.status)) {
          row.status = "not_started";
        }
        rows.push(row);
      }
    }
    return rows;
  };

  // Drag and drop handlers for CSV
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
      if (file.name.endsWith(".csv")) {
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
      } else {
        toast({
          title: "Invalid file type",
          description: "Please drop a CSV file.",
          variant: "destructive",
        });
      }
    }
  }, [toast]);

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

  const toggleExpand = (nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, React.ReactNode> = {
      not_started: <Circle className="h-4 w-4 text-muted-foreground" />,
      in_progress: <Clock className="h-4 w-4 text-primary" />,
      on_hold: <Pause className="h-4 w-4 text-amber-500" />,
      completed: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      cancelled: <X className="h-4 w-4 text-destructive" />,
    };
    return icons[status] || icons.not_started;
  };

  const tree = wbsNodes ? buildTree(wbsNodes) : [];
  const isLoading = wbsLoading || projectsLoading;

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-wbs">
      <div className="relative overflow-hidden rounded-lg border border-border bg-gradient-to-r from-primary/5 to-transparent p-6">
        <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-5">
          <div className="flex gap-2">
            <GitBranch className="h-20 w-20" />
            <Layers className="h-16 w-16 mt-4" />
          </div>
        </div>
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-wbs-title">
                Work Breakdown Structure
              </h1>
              <p className="text-muted-foreground">
                Organize your project tasks in a hierarchical structure.
              </p>
            </div>
          </div>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-wbs">
                <Plus className="mr-2 h-4 w-4" />
                Add WBS Node
              </Button>
            </DialogTrigger>
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
                {wbsDimensions.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-sm font-medium text-muted-foreground">Dimensions</p>
                    <div className="grid grid-cols-2 gap-4">
                      {wbsDimensions.map((dim: { key: string; label: string; required: boolean }) => (
                        <div key={dim.key} className="space-y-2">
                          <label className="text-sm font-medium">
                            {dim.label}
                            {dim.required && <span className="text-destructive ml-1">*</span>}
                          </label>
                          <Input
                            placeholder={`Enter ${dim.label.toLowerCase()}`}
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
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <FolderTree className="h-5 w-5 text-primary" />
            Structure Tree
          </CardTitle>
          <Badge variant="secondary">{wbsNodes?.length || 0} nodes</Badge>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-2 py-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-5 w-16 ml-auto" />
                </div>
              ))}
            </div>
          ) : tree.length > 0 ? (
            <div className="space-y-1">
              {tree.map((node) => (
                <WbsTreeNode
                  key={node.id}
                  node={node}
                  depth={0}
                  expandedNodes={expandedNodes}
                  toggleExpand={toggleExpand}
                  getStatusIcon={getStatusIcon}
                  onDelete={(id) => deleteMutation.mutate(id)}
                  onEdit={openEditDialog}
                  onAddChild={openAddChildDialog}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Network className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No WBS nodes yet</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Create your first work breakdown structure node
              </p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-wbs">
                <Plus className="mr-2 h-4 w-4" />
                Add First Node
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CSV Import Zone */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-4">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Import WBS from CSV
          </CardTitle>
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
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Browse CSV
          </Button>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver 
                ? "border-primary bg-primary/5" 
                : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            data-testid="csv-drop-zone"
          >
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm font-medium">Drag and drop CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">
              CSV must have headers: title, description, status, estimated_hours, estimated_cost
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
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

      {/* CSV Preview Dialog */}
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

interface WbsTreeNodeProps {
  node: WbsNodeWithChildren;
  depth: number;
  expandedNodes: Set<string>;
  toggleExpand: (id: string) => void;
  getStatusIcon: (status: string) => React.ReactNode;
  onDelete: (id: string) => void;
  onEdit: (node: WbsNode) => void;
  onAddChild: (parentId: string, projectId: string) => void;
}

function WbsTreeNode({
  node,
  depth,
  expandedNodes,
  toggleExpand,
  getStatusIcon,
  onDelete,
  onEdit,
  onAddChild,
}: WbsTreeNodeProps) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);

  return (
    <div data-testid={`wbs-tree-node-${node.id}`}>
      <div
        className="group flex items-center gap-2 rounded-md py-2 px-2 hover-elevate"
        style={{ paddingLeft: `${depth * 24 + 8}px` }}
      >
        {hasChildren ? (
          <button
            onClick={() => toggleExpand(node.id)}
            className="flex h-5 w-5 items-center justify-center rounded hover-elevate"
            data-testid={`button-expand-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        ) : (
          <div className="w-5" />
        )}
        {getStatusIcon(node.status)}
        <span className="font-mono text-xs text-muted-foreground w-20">
          {node.codeDisplay || node.codePath}
        </span>
        <span className="text-sm font-medium flex-1 truncate">{node.title}</span>
        {node.estimatedHours && (
          <span className="text-xs text-muted-foreground">
            {node.estimatedHours}h
          </span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100"
              data-testid={`button-wbs-menu-${node.id}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => onEdit(node)}
              data-testid={`button-edit-wbs-${node.id}`}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => onAddChild(node.id, node.projectId)}
              data-testid={`button-add-child-${node.id}`}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Child
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => onDelete(node.id)}
              data-testid={`button-delete-wbs-${node.id}`}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && isExpanded && (
        <div>
          {node.children.map((child) => (
            <WbsTreeNode
              key={child.id}
              node={child}
              depth={depth + 1}
              expandedNodes={expandedNodes}
              toggleExpand={toggleExpand}
              getStatusIcon={getStatusIcon}
              onDelete={onDelete}
              onEdit={onEdit}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}
