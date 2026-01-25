import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  MoreHorizontal,
  Trash2,
  Edit,
  FileCode,
  Copy,
  FolderTree,
  ChevronRight,
  ChevronDown,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import type { WbsTemplate, WbsTemplateNode } from "@shared/schema";

const templateFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  category: z.string().max(50).optional(),
});

type TemplateFormData = z.infer<typeof templateFormSchema>;

const nodeFormSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  description: z.string().max(500).optional(),
  estimatedHours: z.string().optional(),
});

type NodeFormData = z.infer<typeof nodeFormSchema>;

interface TemplateNodeWithPath extends WbsTemplateNode {
  path: number[];
}

export default function WbsTemplatesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WbsTemplate | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<WbsTemplate | null>(null);
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [addNodeParentPath, setAddNodeParentPath] = useState<number[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { activeTenant } = useSettings();

  const tenantId = activeTenant?.id;
  const { data: templates, isLoading } = useQuery<WbsTemplate[]>({
    queryKey: ["/api/wbs-templates", { tenantId }],
    queryFn: async () => {
      const res = await fetch(`/api/wbs-templates?tenantId=${tenantId}`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch templates");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: { name: "", description: "", category: "" },
  });

  const nodeForm = useForm<NodeFormData>({
    resolver: zodResolver(nodeFormSchema),
    defaultValues: { title: "", description: "", estimatedHours: "" },
  });

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      return apiRequest("POST", "/api/wbs-templates", {
        ...data,
        tenantId,
        structure: [],
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs-templates", { tenantId }] });
      setIsCreateOpen(false);
      form.reset();
      toast({ title: "Template created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create template", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<WbsTemplate> }) => {
      const response = await apiRequest("PATCH", `/api/wbs-templates/${id}?tenantId=${tenantId}`, data);
      return response.json();
    },
    onSuccess: (updatedTemplate: WbsTemplate) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs-templates", { tenantId }] });
      if (selectedTemplate && selectedTemplate.id === updatedTemplate.id) {
        setSelectedTemplate(updatedTemplate);
      }
      setIsEditOpen(false);
      setEditingTemplate(null);
      form.reset();
      toast({ title: "Template updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update template", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/wbs-templates/${id}?tenantId=${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wbs-templates", { tenantId }] });
      if (selectedTemplate) {
        setSelectedTemplate(null);
      }
      toast({ title: "Template deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete template", variant: "destructive" });
    },
  });

  const handleCreateSubmit = (data: TemplateFormData) => {
    createMutation.mutate(data);
  };

  const handleEditSubmit = (data: TemplateFormData) => {
    if (editingTemplate) {
      updateMutation.mutate({ id: editingTemplate.id, data });
    }
  };

  const openEditDialog = (template: WbsTemplate) => {
    setEditingTemplate(template);
    form.reset({
      name: template.name,
      description: template.description || "",
      category: template.category || "",
    });
    setIsEditOpen(true);
  };

  const addNodeToTemplate = (parentPath: number[]) => {
    setAddNodeParentPath(parentPath);
    nodeForm.reset({ title: "", description: "", estimatedHours: "" });
    setIsAddNodeOpen(true);
  };

  const handleAddNode = (data: NodeFormData) => {
    if (!selectedTemplate) return;

    const structure = JSON.parse(JSON.stringify(selectedTemplate.structure || [])) as WbsTemplateNode[];
    
    const newNode: WbsTemplateNode = {
      title: data.title,
      description: data.description,
      codePath: "",
      codeDisplay: "",
      estimatedHours: data.estimatedHours ? parseFloat(data.estimatedHours) : undefined,
      children: [],
    };

    if (addNodeParentPath.length === 0) {
      const idx = structure.length + 1;
      newNode.codePath = String(idx);
      newNode.codeDisplay = String(idx);
      structure.push(newNode);
    } else {
      let parent: WbsTemplateNode | undefined;
      let arr = structure;
      for (let i = 0; i < addNodeParentPath.length; i++) {
        parent = arr[addNodeParentPath[i]];
        if (!parent.children) parent.children = [];
        if (i < addNodeParentPath.length - 1) {
          arr = parent.children;
        }
      }
      if (parent) {
        const idx = (parent.children?.length || 0) + 1;
        newNode.codePath = `${parent.codePath}_${idx}`;
        newNode.codeDisplay = `${parent.codeDisplay}.${idx}`;
        parent.children?.push(newNode);
      }
    }

    updateMutation.mutate({ 
      id: selectedTemplate.id, 
      data: { structure } 
    });
    setIsAddNodeOpen(false);
  };

  const deleteNodeFromTemplate = (path: number[]) => {
    if (!selectedTemplate) return;

    const structure = JSON.parse(JSON.stringify(selectedTemplate.structure || [])) as WbsTemplateNode[];
    
    if (path.length === 1) {
      structure.splice(path[0], 1);
    } else {
      let parent: WbsTemplateNode | undefined;
      let arr = structure;
      for (let i = 0; i < path.length - 1; i++) {
        parent = arr[path[i]];
        if (!parent.children) break;
        arr = parent.children;
      }
      if (parent?.children) {
        parent.children.splice(path[path.length - 1], 1);
      }
    }

    updateMutation.mutate({ 
      id: selectedTemplate.id, 
      data: { structure } 
    });
  };

  const toggleNode = (pathStr: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(pathStr)) {
        next.delete(pathStr);
      } else {
        next.add(pathStr);
      }
      return next;
    });
  };

  const renderTemplateNode = (node: WbsTemplateNode, path: number[], depth: number = 0) => {
    const pathStr = path.join("-");
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodes.has(pathStr);

    return (
      <div key={pathStr} className="select-none">
        <div 
          className="flex items-center gap-2 py-2 px-2 rounded hover-elevate"
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {hasChildren ? (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => toggleNode(pathStr)}
              data-testid={`button-toggle-node-${pathStr}`}
            >
              {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          ) : (
            <div className="w-6" />
          )}
          
          <Badge variant="outline" className="font-mono text-xs">
            {node.codeDisplay}
          </Badge>
          
          <span className="flex-1 font-medium">{node.title}</span>
          
          {node.estimatedHours && (
            <span className="text-sm text-muted-foreground">{node.estimatedHours}h</span>
          )}
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" data-testid={`button-node-menu-${pathStr}`}>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => addNodeToTemplate(path)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Child
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive" 
                onClick={() => deleteNodeFromTemplate(path)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {hasChildren && isExpanded && (
          <div>
            {node.children?.map((child, idx) => 
              renderTemplateNode(child, [...path, idx], depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">WBS Templates</h1>
          <p className="text-muted-foreground">Create and manage reusable work breakdown structures</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-template">
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      {selectedTemplate ? (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => setSelectedTemplate(null)} data-testid="button-back-to-list">
              Back to Templates
            </Button>
            <h2 className="text-xl font-medium">{selectedTemplate.name}</h2>
            {selectedTemplate.category && (
              <Badge variant="secondary">{selectedTemplate.category}</Badge>
            )}
          </div>
          
          {selectedTemplate.description && (
            <p className="text-muted-foreground">{selectedTemplate.description}</p>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5" />
                Structure
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => addNodeToTemplate([])}
                data-testid="button-add-root-node"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Root Node
              </Button>
            </CardHeader>
            <CardContent>
              {(selectedTemplate.structure as WbsTemplateNode[] || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No nodes in this template yet.</p>
                  <p className="text-sm">Click "Add Root Node" to start building your template structure.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {(selectedTemplate.structure as WbsTemplateNode[]).map((node, idx) => 
                    renderTemplateNode(node, [idx], 0)
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates && templates.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="py-12 text-center">
                <FileCode className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No Templates Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first WBS template to reuse across projects
                </p>
                <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-template">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </CardContent>
            </Card>
          ) : (
            templates?.map((template) => (
              <Card 
                key={template.id} 
                className="hover-elevate cursor-pointer"
                onClick={() => setSelectedTemplate(template)}
                data-testid={`card-template-${template.id}`}
              >
                <CardHeader className="flex flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    {template.category && (
                      <Badge variant="secondary" className="mt-1">
                        {template.category}
                      </Badge>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost" data-testid={`button-template-menu-${template.id}`}>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(template); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); }}>
                        <Copy className="h-4 w-4 mr-2" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-destructive" 
                        onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(template.id); }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {template.description || "No description"}
                  </p>
                  <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                    <FolderTree className="h-4 w-4" />
                    <span>
                      {(template.structure as WbsTemplateNode[] || []).length} root nodes
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create WBS Template</DialogTitle>
            <DialogDescription>
              Create a reusable work breakdown structure template
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Residential Construction" {...field} data-testid="input-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Residential" {...field} data-testid="input-template-category" />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe this template..." 
                        {...field} 
                        data-testid="input-template-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-template">
                  {createMutation.isPending ? "Creating..." : "Create Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update template details
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-template-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-edit-template-category" />
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
                      <Textarea {...field} data-testid="input-edit-template-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-update-template">
                  {updateMutation.isPending ? "Updating..." : "Update Template"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={isAddNodeOpen} onOpenChange={setIsAddNodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Node</DialogTitle>
            <DialogDescription>
              Add a new node to the template structure
            </DialogDescription>
          </DialogHeader>
          <Form {...nodeForm}>
            <form onSubmit={nodeForm.handleSubmit(handleAddNode)} className="space-y-4">
              <FormField
                control={nodeForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Node Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Foundation" {...field} data-testid="input-node-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nodeForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Node description..." {...field} data-testid="input-node-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={nodeForm.control}
                name="estimatedHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estimated Hours (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} data-testid="input-node-hours" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsAddNodeOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={updateMutation.isPending} data-testid="button-add-node">
                  {updateMutation.isPending ? "Adding..." : "Add Node"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
