import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Layers,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Calendar,
  Hammer,
  MapPin,
  Building2,
  Layers3,
  Grid3x3,
  Cog,
  Settings2,
  Box,
  Package,
  DollarSign,
  Users,
  RefreshCw,
  Settings,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { wbsDimensionDefinitions, type WbsMasterCode } from "@shared/schema";

const codeFormSchema = z.object({
  dimensionType: z.string().min(1, "Dimension is required"),
  code: z.string().min(1, "Code is required").max(20),
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  sortOrder: z.string().optional(),
});

type CodeFormData = z.infer<typeof codeFormSchema>;

const dimensionIcons: Record<string, React.ReactNode> = {
  phase: <Calendar className="h-4 w-4" />,
  trade: <Hammer className="h-4 w-4" />,
  location: <MapPin className="h-4 w-4" />,
  building: <Building2 className="h-4 w-4" />,
  level: <Layers className="h-4 w-4" />,
  zone: <Grid3x3 className="h-4 w-4" />,
  system: <Cog className="h-4 w-4" />,
  subsystem: <Settings2 className="h-4 w-4" />,
  element_type: <Box className="h-4 w-4" />,
  material: <Layers3 className="h-4 w-4" />,
  work_package: <Package className="h-4 w-4" />,
  cost_code: <DollarSign className="h-4 w-4" />,
  responsibility: <Users className="h-4 w-4" />,
};

interface DimensionConfig {
  key: string;
  label: string;
  description: string;
}

export default function MasterWbsCodes() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDimensionSettingsOpen, setIsDimensionSettingsOpen] = useState(false);
  const [editingCode, setEditingCode] = useState<WbsMasterCode | null>(null);
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set(["phase"]));
  const [selectedDimension, setSelectedDimension] = useState<string>("phase");
  const [dimensionLabels, setDimensionLabels] = useState<Record<string, { code: string; label: string; description: string; sortOrder: number }>>({});
  const { toast } = useToast();
  const { activeTenant } = useSettings();

  // Initialize dimension labels from tenant config or defaults
  useEffect(() => {
    const customDimensions = activeTenant?.config?.wbsDimensions;
    const labels: Record<string, { code: string; label: string; description: string; sortOrder: number }> = {};
    
    wbsDimensionDefinitions.forEach((dim, index) => {
      const customDim = customDimensions?.find((d: any) => d.key === dim.key);
      labels[dim.key] = {
        code: customDim?.code || dim.key.toUpperCase(),
        label: customDim?.label || dim.label,
        description: customDim?.description || dim.description,
        sortOrder: customDim?.sortOrder ?? index,
      };
    });
    
    setDimensionLabels(labels);
  }, [activeTenant]);

  // Get dimension label (custom or default)
  const getDimensionLabel = (key: string): string => {
    return dimensionLabels[key]?.label || wbsDimensionDefinitions.find(d => d.key === key)?.label || key;
  };

  const getDimensionDescription = (key: string): string => {
    return dimensionLabels[key]?.description || wbsDimensionDefinitions.find(d => d.key === key)?.description || "";
  };

  const form = useForm<CodeFormData>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: {
      dimensionType: "",
      code: "",
      name: "",
      description: "",
      sortOrder: "0",
    },
  });

  const { data: codes, isLoading } = useQuery<WbsMasterCode[]>({
    queryKey: [`/api/wbs-codes?tenantId=${activeTenant?.id}`],
    enabled: !!activeTenant?.id,
  });

  const createMutation = useMutation({
    mutationFn: async (data: CodeFormData) => {
      return apiRequest("POST", "/api/wbs-codes", {
        ...data,
        tenantId: activeTenant?.id,
        sortOrder: parseInt(data.sortOrder || "0"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs-codes?tenantId=${activeTenant?.id}`] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Code created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create code", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: CodeFormData) => {
      return apiRequest("PATCH", `/api/wbs-codes/${editingCode?.id}`, {
        ...data,
        sortOrder: parseInt(data.sortOrder || "0"),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs-codes?tenantId=${activeTenant?.id}`] });
      setIsDialogOpen(false);
      setEditingCode(null);
      form.reset();
      toast({ title: "Code updated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to update code", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/wbs-codes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs-codes?tenantId=${activeTenant?.id}`] });
      toast({ title: "Code deleted successfully" });
    },
    onError: () => {
      toast({ title: "Failed to delete code", variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", `/api/wbs-codes/seed/${activeTenant?.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/wbs-codes?tenantId=${activeTenant?.id}`] });
      toast({ title: "Default codes seeded successfully" });
    },
    onError: () => {
      toast({ title: "Failed to seed codes", variant: "destructive" });
    },
  });

  const saveDimensionSettingsMutation = useMutation({
    mutationFn: async (customDimensions: Array<{ key: string; label: string; description: string }>) => {
      const currentConfig = activeTenant?.config || {
        branding: { primaryColor: "", secondaryColor: "", logoUrl: null, faviconUrl: null },
        modules: { hrSync: false, advancedWbs: false, documentTemplating: false },
        wbsDimensions: [],
      };
      
      return apiRequest("PATCH", `/api/tenants/${activeTenant?.id}`, {
        config: {
          ...currentConfig,
          wbsDimensions: customDimensions,
        },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenants"] });
      setIsDimensionSettingsOpen(false);
      toast({ title: "Dimension settings saved successfully" });
    },
    onError: () => {
      toast({ title: "Failed to save dimension settings", variant: "destructive" });
    },
  });

  const handleSaveDimensionSettings = () => {
    const customDimensions = wbsDimensionDefinitions.map((dim, index) => ({
      key: dim.key,
      code: dimensionLabels[dim.key]?.code || dim.key.toUpperCase(),
      label: dimensionLabels[dim.key]?.label || dim.label,
      description: dimensionLabels[dim.key]?.description || dim.description,
      sortOrder: dimensionLabels[dim.key]?.sortOrder ?? index,
      required: true,
    }));
    saveDimensionSettingsMutation.mutate(customDimensions);
  };

  const updateDimensionLabel = (key: string, field: "code" | "label" | "description" | "sortOrder", value: string | number) => {
    setDimensionLabels((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [field]: value,
      },
    }));
  };

  // Get sorted dimensions based on sortOrder
  const getSortedDimensions = () => {
    return [...wbsDimensionDefinitions].sort((a, b) => {
      const orderA = dimensionLabels[a.key]?.sortOrder ?? wbsDimensionDefinitions.findIndex(d => d.key === a.key);
      const orderB = dimensionLabels[b.key]?.sortOrder ?? wbsDimensionDefinitions.findIndex(d => d.key === b.key);
      return orderA - orderB;
    });
  };
  
  // Get dimension code (custom or default)
  const getDimensionCode = (key: string): string => {
    return dimensionLabels[key]?.code || key.toUpperCase();
  };

  const openCreateDialog = (dimensionType: string) => {
    setEditingCode(null);
    form.reset({
      dimensionType,
      code: "",
      name: "",
      description: "",
      sortOrder: "0",
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (code: WbsMasterCode) => {
    setEditingCode(code);
    form.reset({
      dimensionType: code.dimensionType,
      code: code.code,
      name: code.name,
      description: code.description || "",
      sortOrder: String(code.sortOrder || 0),
    });
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CodeFormData) => {
    if (editingCode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleDimension = (key: string) => {
    setExpandedDimensions((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const getCodesForDimension = (dimensionType: string): WbsMasterCode[] => {
    return (codes || [])
      .filter((c) => c.dimensionType === dimensionType)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  };

  const getCodeCount = (dimensionType: string): number => {
    return (codes || []).filter((c) => c.dimensionType === dimensionType).length;
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const totalCodes = codes?.length || 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3" data-testid="text-page-title">
            <Layers className="h-8 w-8 text-primary" />
            Master WBS Codes
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage the 13-dimensional Work Breakdown Structure master codes. These codes are copied to new projects as templates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm" data-testid="badge-total-codes">
            {totalCodes} Total Codes
          </Badge>
          <Button
            variant="outline"
            onClick={() => setIsDimensionSettingsOpen(true)}
            data-testid="button-configure-dimensions"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configure Dimensions
          </Button>
          <Button
            variant="outline"
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            data-testid="button-seed-defaults"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${seedMutation.isPending ? "animate-spin" : ""}`} />
            Seed Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Dimensions</CardTitle>
            <CardDescription>13 WBS Categories</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="space-y-1 px-2 pb-2">
              {getSortedDimensions().map((dim) => {
                const count = getCodeCount(dim.key);
                const isSelected = selectedDimension === dim.key;
                return (
                  <button
                    key={dim.key}
                    onClick={() => setSelectedDimension(dim.key)}
                    className={`w-full flex items-center justify-between p-2 rounded-md text-left transition-colors ${
                      isSelected
                        ? "bg-primary text-primary-foreground"
                        : "hover-elevate"
                    }`}
                    data-testid={`button-dimension-${dim.key}`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {dimensionIcons[dim.key]}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{getDimensionLabel(dim.key)}</span>
                        <span className={`text-xs ${isSelected ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {getDimensionCode(dim.key)}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant={isSelected ? "secondary" : "outline"}
                      className="text-xs ml-2 flex-shrink-0"
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
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                {dimensionIcons[selectedDimension]}
                {getDimensionLabel(selectedDimension)}
              </CardTitle>
              <CardDescription>
                {getDimensionDescription(selectedDimension)}
              </CardDescription>
            </div>
            <Button
              onClick={() => openCreateDialog(selectedDimension)}
              data-testid="button-add-code"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Code
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-24">Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Description</TableHead>
                  <TableHead className="w-20">Order</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {getCodesForDimension(selectedDimension).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      No codes defined for this dimension. Click "Add Code" to create one.
                    </TableCell>
                  </TableRow>
                ) : (
                  getCodesForDimension(selectedDimension).map((code) => (
                    <TableRow key={code.id} data-testid={`row-code-${code.id}`}>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {code.code}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{code.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">
                        {code.description || "—"}
                      </TableCell>
                      <TableCell>{code.sortOrder || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => openEditDialog(code)}
                            data-testid={`button-edit-${code.id}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteMutation.mutate(code.id)}
                            data-testid={`button-delete-${code.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingCode ? "Edit WBS Code" : "Add WBS Code"}
            </DialogTitle>
            <DialogDescription>
              {editingCode
                ? "Update the details for this master code."
                : "Create a new master code for the selected dimension."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="dimensionType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dimension</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={!!editingCode}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-dimension">
                          <SelectValue placeholder="Select dimension" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {wbsDimensionDefinitions.map((dim) => (
                          <SelectItem key={dim.key} value={dim.key}>
                            {dim.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Code</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 01, ELEC, A1"
                          {...field}
                          data-testid="input-code"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          data-testid="input-sort-order"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Pre-Construction, Electrical"
                        {...field}
                        data-testid="input-name"
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description for this code"
                        className="resize-none"
                        {...field}
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit"
                >
                  {editingCode ? "Save Changes" : "Create Code"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Dimension Settings Dialog */}
      <Dialog open={isDimensionSettingsOpen} onOpenChange={setIsDimensionSettingsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Configure WBS Dimensions</DialogTitle>
            <DialogDescription>
              Customize the names and descriptions of the 13 WBS dimensions for your organization.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            {wbsDimensionDefinitions.map((dim, defaultIndex) => (
              <div key={dim.key} className="grid grid-cols-12 gap-3 items-start p-3 rounded-lg border">
                <div className="col-span-1 flex items-center justify-center pt-2">
                  {dimensionIcons[dim.key]}
                </div>
                <div className="col-span-11 space-y-2">
                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Code
                      </label>
                      <Input
                        value={dimensionLabels[dim.key]?.code || dim.key.toUpperCase()}
                        onChange={(e) => updateDimensionLabel(dim.key, "code", e.target.value.toUpperCase())}
                        placeholder={dim.key.toUpperCase()}
                        maxLength={10}
                        data-testid={`input-dimension-code-${dim.key}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        Display Name
                      </label>
                      <Input
                        value={dimensionLabels[dim.key]?.label || dim.label}
                        onChange={(e) => updateDimensionLabel(dim.key, "label", e.target.value)}
                        placeholder={dim.label}
                        data-testid={`input-dimension-label-${dim.key}`}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="text-sm font-medium text-muted-foreground">
                        Description
                      </label>
                      <Input
                        value={dimensionLabels[dim.key]?.description || dim.description}
                        onChange={(e) => updateDimensionLabel(dim.key, "description", e.target.value)}
                        placeholder={dim.description}
                        data-testid={`input-dimension-desc-${dim.key}`}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium text-muted-foreground">
                        Sort #
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="99"
                        value={dimensionLabels[dim.key]?.sortOrder ?? defaultIndex}
                        onChange={(e) => updateDimensionLabel(dim.key, "sortOrder", parseInt(e.target.value) || 0)}
                        data-testid={`input-dimension-sort-${dim.key}`}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Internal Key: <code className="bg-muted px-1 rounded">{dim.key}</code>
                  </p>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDimensionSettingsOpen(false)}
              data-testid="button-cancel-dimension-settings"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDimensionSettings}
              disabled={saveDimensionSettingsMutation.isPending}
              data-testid="button-save-dimension-settings"
            >
              {saveDimensionSettingsMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
