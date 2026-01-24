import { useState } from "react";
import { useSettings } from "@/components/settings-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Trash2, GripVertical, Save, Layers } from "lucide-react";

interface WbsDimension {
  key: string;
  label: string;
  required: boolean;
}

export default function WbsDimensions() {
  const { activeTenant, updateTenantBranding } = useSettings();
  const { toast } = useToast();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newDimKey, setNewDimKey] = useState("");
  const [newDimLabel, setNewDimLabel] = useState("");
  const [newDimRequired, setNewDimRequired] = useState(false);

  const dimensions: WbsDimension[] = activeTenant?.config?.wbsDimensions || [];

  const saveDimensions = (newDimensions: WbsDimension[]) => {
    if (!activeTenant) return;
    
    const newConfig = {
      ...activeTenant.config,
      wbsDimensions: newDimensions,
    };
    
    fetch(`/api/tenants/${activeTenant.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ config: newConfig }),
    })
      .then((res) => {
        if (res.ok) {
          toast({
            title: "Dimensions Updated",
            description: "WBS dimensions have been saved.",
          });
          window.location.reload();
        }
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to save dimensions.",
          variant: "destructive",
        });
      });
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
                  <TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dimensions.map((dim, index) => (
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDimension(dim.key)}
                        data-testid={`button-delete-${dim.key}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
