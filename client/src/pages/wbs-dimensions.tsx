import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2, GripVertical, Pencil, Layers, AlertCircle } from "lucide-react";
import type { Project } from "@shared/schema";

interface WbsDimension {
  key: string;
  label: string;
  required: boolean;
}

export default function WbsDimensions() {
  const { activeTenant, updateTenantBranding } = useSettings();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isPropagateOpen, setIsPropagateOpen] = useState(false);
  const [newDimKey, setNewDimKey] = useState("");
  const [newDimLabel, setNewDimLabel] = useState("");
  const [newDimRequired, setNewDimRequired] = useState(false);
  
  const [editingDim, setEditingDim] = useState<WbsDimension | null>(null);
  const [editKey, setEditKey] = useState("");
  const [editLabel, setEditLabel] = useState("");
  const [editRequired, setEditRequired] = useState(false);
  
  const [propagateMode, setPropagateMode] = useState<"all" | "specific" | "forward">("forward");
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [pendingEdit, setPendingEdit] = useState<{ oldKey: string; newKey: string; newLabel: string; newRequired: boolean } | null>(null);

  const { data: projects = [], isLoading: projectsLoading, isError: projectsError } = useQuery<Project[]>({
    queryKey: ["/api/projects", activeTenant?.id],
    queryFn: async () => {
      if (!activeTenant?.id) return [];
      const res = await fetch(`/api/projects?tenantId=${activeTenant.id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!activeTenant?.id,
  });

  const dimensions: WbsDimension[] = activeTenant?.config?.wbsDimensions || [];

  const saveDimensions = async (newDimensions: WbsDimension[], skipReload = false) => {
    if (!activeTenant) return false;
    
    const newConfig = {
      ...activeTenant.config,
      wbsDimensions: newDimensions,
    };
    
    try {
      const res = await fetch(`/api/tenants/${activeTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: newConfig }),
      });
      
      if (res.ok) {
        toast({
          title: "Dimensions Updated",
          description: "WBS dimensions have been saved.",
        });
        if (!skipReload) {
          window.location.reload();
        }
        return true;
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: "Error",
          description: data.error || "Failed to save dimensions.",
          variant: "destructive",
        });
        return false;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save dimensions. Please try again.",
        variant: "destructive",
      });
      return false;
    }
  };

  const propagateDimensionChanges = async (oldKey: string, newKey: string) => {
    if (propagateMode === "forward") {
      return;
    }

    try {
      const res = await fetch("/api/dimensions/propagate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldKey,
          newKey,
          applyTo: propagateMode,
          projectIds: propagateMode === "specific" ? selectedProjects : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Changes Applied",
          description: `Updated ${data.affectedNodes} WBS nodes across ${propagateMode === "all" ? "all projects" : `${selectedProjects.length} selected projects`}.`,
        });
      }
    } catch (error) {
      toast({
        title: "Warning",
        description: "Dimension saved but failed to update existing WBS nodes.",
        variant: "destructive",
      });
    }
  };

  const handleAddDimension = () => {
    if (!newDimKey.trim() || !newDimLabel.trim()) {
      toast({
        title: "Error",
        description: "Key and label are required.",
        variant: "destructive",
      });
      return;
    }

    const key = newDimKey.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    if (dimensions.some((d) => d.key === key)) {
      toast({
        title: "Error",
        description: "A dimension with this key already exists.",
        variant: "destructive",
      });
      return;
    }

    const newDimensions = [
      ...dimensions,
      { key, label: newDimLabel.trim(), required: newDimRequired },
    ];

    saveDimensions(newDimensions);
    setIsAddOpen(false);
    setNewDimKey("");
    setNewDimLabel("");
    setNewDimRequired(false);
  };

  const handleOpenEdit = (dim: WbsDimension) => {
    setEditingDim(dim);
    setEditKey(dim.key);
    setEditLabel(dim.label);
    setEditRequired(dim.required);
    setIsEditOpen(true);
  };

  const handleEditDimension = () => {
    if (!editingDim || !editKey.trim() || !editLabel.trim()) {
      toast({
        title: "Error",
        description: "Key and label are required.",
        variant: "destructive",
      });
      return;
    }

    const key = editKey.toLowerCase().replace(/[^a-z0-9]/g, "_");
    
    if (key !== editingDim.key && dimensions.some((d) => d.key === key)) {
      toast({
        title: "Error",
        description: "A dimension with this key already exists.",
        variant: "destructive",
      });
      return;
    }

    const keyChanged = key !== editingDim.key;
    
    if (keyChanged) {
      setPendingEdit({
        oldKey: editingDim.key,
        newKey: key,
        newLabel: editLabel.trim(),
        newRequired: editRequired,
      });
      setIsEditOpen(false);
      setPropagateMode("forward");
      setSelectedProjects([]);
      setIsPropagateOpen(true);
    } else {
      const newDimensions = dimensions.map((d) =>
        d.key === editingDim.key
          ? { key, label: editLabel.trim(), required: editRequired }
          : d
      );
      saveDimensions(newDimensions);
      setIsEditOpen(false);
      setEditingDim(null);
    }
  };

  const handleConfirmPropagate = async () => {
    if (!pendingEdit) return;

    const newDimensions = dimensions.map((d) =>
      d.key === pendingEdit.oldKey
        ? { key: pendingEdit.newKey, label: pendingEdit.newLabel, required: pendingEdit.newRequired }
        : d
    );

    const saved = await saveDimensions(newDimensions, true);
    
    if (saved) {
      await propagateDimensionChanges(pendingEdit.oldKey, pendingEdit.newKey);
    }

    setIsPropagateOpen(false);
    setPendingEdit(null);
    setEditingDim(null);
    window.location.reload();
  };

  const handleDeleteDimension = (key: string) => {
    const newDimensions = dimensions.filter((d) => d.key !== key);
    saveDimensions(newDimensions);
  };

  const handleToggleRequired = (key: string) => {
    const newDimensions = dimensions.map((d) =>
      d.key === key ? { ...d, required: !d.required } : d
    );
    saveDimensions(newDimensions);
  };

  const toggleProjectSelection = (projectId: string) => {
    setSelectedProjects((prev) =>
      prev.includes(projectId)
        ? prev.filter((id) => id !== projectId)
        : [...prev, projectId]
    );
  };

  if (!activeTenant) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">No company selected.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-wbs-dimensions">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            WBS Dimensions
          </h1>
          <p className="text-muted-foreground">
            Configure the dimensions used to categorize work breakdown structure nodes.
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-dimension">
              <Plus className="mr-2 h-4 w-4" />
              Add Dimension
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add WBS Dimension</DialogTitle>
              <DialogDescription>
                Create a new dimension to categorize your WBS nodes.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="dimKey">Key (identifier)</Label>
                <Input
                  id="dimKey"
                  value={newDimKey}
                  onChange={(e) => setNewDimKey(e.target.value)}
                  placeholder="e.g., zone, system, discipline"
                  data-testid="input-dimension-key"
                />
                <p className="text-xs text-muted-foreground">
                  Lowercase letters and underscores only
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="dimLabel">Display Label</Label>
                <Input
                  id="dimLabel"
                  value={newDimLabel}
                  onChange={(e) => setNewDimLabel(e.target.value)}
                  placeholder="e.g., Zone, Building System"
                  data-testid="input-dimension-label"
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Required</Label>
                  <p className="text-xs text-muted-foreground">
                    Must be filled when creating WBS nodes
                  </p>
                </div>
                <Switch
                  checked={newDimRequired}
                  onCheckedChange={setNewDimRequired}
                  data-testid="switch-dimension-required"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddDimension} data-testid="button-create-dimension">
                Add Dimension
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Configured Dimensions</CardTitle>
          </div>
          <CardDescription>
            These dimensions will appear as fields when creating or editing WBS nodes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {dimensions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-center">Required</TableHead>
                  <TableHead className="w-28"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dimensions.map((dim) => (
                  <TableRow key={dim.key} data-testid={`dimension-row-${dim.key}`}>
                    <TableCell>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                    <TableCell>
                      <code className="text-sm bg-muted px-2 py-1 rounded">
                        {dim.key}
                      </code>
                    </TableCell>
                    <TableCell className="font-medium">{dim.label}</TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={dim.required}
                        onCheckedChange={() => handleToggleRequired(dim.key)}
                        data-testid={`switch-required-${dim.key}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenEdit(dim)}
                          data-testid={`button-edit-${dim.key}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDimension(dim.key)}
                          data-testid={`button-delete-${dim.key}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-medium">No dimensions configured</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">
                Add dimensions to categorize your WBS nodes
              </p>
              <Button onClick={() => setIsAddOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Dimension
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Dimension</DialogTitle>
            <DialogDescription>
              Modify the dimension settings. Changing the key will prompt you to update existing projects.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editKey">Key (identifier)</Label>
              <Input
                id="editKey"
                value={editKey}
                onChange={(e) => setEditKey(e.target.value)}
                placeholder="e.g., zone, system, discipline"
                data-testid="input-edit-dimension-key"
              />
              <p className="text-xs text-muted-foreground">
                Lowercase letters and underscores only
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="editLabel">Display Label</Label>
              <Input
                id="editLabel"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                placeholder="e.g., Zone, Building System"
                data-testid="input-edit-dimension-label"
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Required</Label>
                <p className="text-xs text-muted-foreground">
                  Must be filled when creating WBS nodes
                </p>
              </div>
              <Switch
                checked={editRequired}
                onCheckedChange={setEditRequired}
                data-testid="switch-edit-dimension-required"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditDimension} data-testid="button-save-dimension">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isPropagateOpen} onOpenChange={setIsPropagateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Apply Dimension Changes
            </DialogTitle>
            <DialogDescription>
              You're changing the dimension key from <code className="bg-muted px-1 rounded">{pendingEdit?.oldKey}</code> to <code className="bg-muted px-1 rounded">{pendingEdit?.newKey}</code>. How should this change be applied?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <RadioGroup
              value={propagateMode}
              onValueChange={(value) => setPropagateMode(value as "all" | "specific" | "forward")}
              className="space-y-3"
            >
              <div className="flex items-start space-x-3 p-3 rounded-md border border-border hover-elevate cursor-pointer" onClick={() => setPropagateMode("forward")}>
                <RadioGroupItem value="forward" id="forward" className="mt-0.5" />
                <div>
                  <Label htmlFor="forward" className="font-medium cursor-pointer">
                    New Projects Only
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Only apply to WBS nodes created after this change. Existing project data remains unchanged.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-md border border-border hover-elevate cursor-pointer" onClick={() => setPropagateMode("all")}>
                <RadioGroupItem value="all" id="all" className="mt-0.5" />
                <div>
                  <Label htmlFor="all" className="font-medium cursor-pointer">
                    All Projects
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Update all existing WBS nodes across all projects to use the new dimension key.
                  </p>
                </div>
              </div>
              
              <div className="flex items-start space-x-3 p-3 rounded-md border border-border hover-elevate cursor-pointer" onClick={() => setPropagateMode("specific")}>
                <RadioGroupItem value="specific" id="specific" className="mt-0.5" />
                <div>
                  <Label htmlFor="specific" className="font-medium cursor-pointer">
                    Specific Projects
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Choose which projects should have their WBS nodes updated.
                  </p>
                </div>
              </div>
            </RadioGroup>

            {propagateMode === "specific" && (
              <div className="mt-4 border rounded-md p-3 max-h-48 overflow-y-auto">
                <p className="text-sm font-medium mb-2">Select projects to update:</p>
                {projectsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading projects...</p>
                ) : projectsError ? (
                  <div className="text-sm text-destructive flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load projects. Please try again.</span>
                  </div>
                ) : projects.length > 0 ? (
                  <div className="space-y-2">
                    {projects.map((project) => (
                      <div
                        key={project.id}
                        className="flex items-center space-x-2 p-2 rounded hover-elevate cursor-pointer"
                        onClick={() => toggleProjectSelection(project.id)}
                      >
                        <Checkbox
                          id={`project-${project.id}`}
                          checked={selectedProjects.includes(project.id)}
                          onCheckedChange={() => toggleProjectSelection(project.id)}
                          data-testid={`checkbox-project-${project.id}`}
                        />
                        <Label htmlFor={`project-${project.id}`} className="cursor-pointer flex-1">
                          {project.name}
                        </Label>
                        <Badge variant="outline" className="text-xs">
                          {project.status?.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No projects available.</p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsPropagateOpen(false);
              setPendingEdit(null);
            }}>
              Cancel
            </Button>
            <Button 
              onClick={handleConfirmPropagate}
              disabled={propagateMode === "specific" && (selectedProjects.length === 0 || projectsError || projectsLoading)}
              data-testid="button-confirm-propagate"
            >
              Apply Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Common Dimension Examples</CardTitle>
          <CardDescription>
            Here are some commonly used dimensions in construction projects.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { key: "phase", label: "Project Phase", desc: "Planning, Design, Construction, Closeout" },
              { key: "trade", label: "Trade", desc: "Electrical, Plumbing, HVAC, Framing" },
              { key: "location", label: "Location", desc: "Building, Floor, Zone, Unit" },
              { key: "csi_division", label: "CSI Division", desc: "MasterFormat divisions (01-49)" },
              { key: "cost_type", label: "Cost Type", desc: "Labor, Material, Equipment, Subcontract" },
              { key: "responsibility", label: "Responsibility", desc: "Owner, Contractor, Subcontractor" },
            ].map((example) => (
              <div
                key={example.key}
                className="p-4 rounded-md border border-border bg-muted/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline">{example.key}</Badge>
                </div>
                <p className="font-medium text-sm">{example.label}</p>
                <p className="text-xs text-muted-foreground">{example.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
