import { useState } from "react";
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

const wbsFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  status: z.enum(["not_started", "in_progress", "on_hold", "completed", "cancelled"]),
  projectId: z.string().min(1, "Project is required"),
  parentId: z.string().optional(),
  estimatedHours: z.string().optional(),
  estimatedCost: z.string().optional(),
});

type WbsFormData = z.infer<typeof wbsFormSchema>;

interface WbsNodeWithChildren extends WbsNode {
  children: WbsNodeWithChildren[];
}

export default function WBS() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { toast } = useToast();

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
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsCreateOpen(false);
      form.reset();
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

  const onSubmit = (data: WbsFormData) => {
    createMutation.mutate({
      ...data,
      parentId: data.parentId === "__root__" ? undefined : data.parentId,
    });
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-wbs-title">
            Work Breakdown Structure
          </h1>
          <p className="text-muted-foreground">
            Organize your project tasks in a hierarchical structure.
          </p>
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
}

function WbsTreeNode({
  node,
  depth,
  expandedNodes,
  toggleExpand,
  getStatusIcon,
  onDelete,
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
            <DropdownMenuItem data-testid={`button-edit-wbs-${node.id}`}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem data-testid={`button-add-child-${node.id}`}>
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
