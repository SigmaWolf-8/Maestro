import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Settings2,
  Save,
  Plus,
  Trash2,
  Database,
  RefreshCw,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan, StripeSync } from "@shared/schema";
import type { PricingConfigEntry } from "@shared/types/billing";

const formatCurrency = (cents: number | null | undefined): string => {
  if (cents == null) return "$0.00 CAD";
  return `$${(cents / 100).toFixed(2)} CAD`;
};

const parseDollars = (value: string): number => {
  const num = parseFloat(value);
  return isNaN(num) ? 0 : Math.round(num * 100);
};

interface PlanEditState {
  basePriceMonthlyCents?: string;
  basePriceYearlyCents?: string;
  perUserPriceCents?: string;
  maxUsers?: string;
  isActive?: boolean;
}

export default function AdminPricing() {
  const [editingPlans, setEditingPlans] = useState<Record<number, PlanEditState>>({});
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configForm, setConfigForm] = useState<PricingConfigEntry>({
    key: "",
    value: "",
    valueType: "string",
    visibility: "PRIVATE",
    description: "",
  });
  const { toast } = useToast();

  const { data: plans, isLoading: plansLoading, error: plansError } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/admin/pricing/plans"],
  });

  const { data: configs, isLoading: configsLoading, error: configsError } = useQuery<PricingConfigEntry[]>({
    queryKey: ["/api/admin/pricing/configs"],
  });

  const { data: syncRecords, isLoading: syncLoading } = useQuery<StripeSync[]>({
    queryKey: ["/api/admin/pricing/stripe-sync"],
  });

  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Record<string, unknown> }) => {
      return apiRequest("PATCH", `/api/admin/pricing/plans/${id}`, updates);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/plans"] });
      setEditingPlans((prev) => {
        const next = { ...prev };
        delete next[variables.id];
        return next;
      });
      toast({ title: "Plan updated", description: "Subscription plan has been saved." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update plan.", variant: "destructive" });
    },
  });

  const upsertConfigMutation = useMutation({
    mutationFn: async (config: PricingConfigEntry) => {
      return apiRequest("PUT", "/api/admin/pricing/configs", config);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/configs"] });
      setConfigDialogOpen(false);
      setConfigForm({ key: "", value: "", valueType: "string", visibility: "PRIVATE", description: "" });
      toast({ title: "Config saved", description: "Pricing configuration has been updated." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save configuration.", variant: "destructive" });
    },
  });

  const deleteConfigMutation = useMutation({
    mutationFn: async (key: string) => {
      return apiRequest("DELETE", `/api/admin/pricing/configs/${key}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/configs"] });
      toast({ title: "Config deleted", description: "Pricing configuration has been removed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete configuration.", variant: "destructive" });
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/admin/pricing/seed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/pricing/configs"] });
      toast({ title: "Data seeded", description: "Plans and pricing config have been seeded." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to seed data.", variant: "destructive" });
    },
  });

  const startEditing = (plan: SubscriptionPlan) => {
    setEditingPlans((prev) => ({
      ...prev,
      [plan.id]: {
        basePriceMonthlyCents: ((plan.basePriceMonthlyCents || 0) / 100).toFixed(2),
        basePriceYearlyCents: ((plan.basePriceYearlyCents || 0) / 100).toFixed(2),
        perUserPriceCents: ((plan.perUserPriceCents || 0) / 100).toFixed(2),
        maxUsers: String(plan.maxUsers || 0),
        isActive: plan.isActive !== false,
      },
    }));
  };

  const savePlan = (plan: SubscriptionPlan) => {
    const edits = editingPlans[plan.id];
    if (!edits) return;
    updatePlanMutation.mutate({
      id: plan.id,
      updates: {
        basePriceMonthlyCents: parseDollars(edits.basePriceMonthlyCents || "0"),
        basePriceYearlyCents: parseDollars(edits.basePriceYearlyCents || "0"),
        perUserPriceCents: parseDollars(edits.perUserPriceCents || "0"),
        maxUsers: parseInt(edits.maxUsers || "0", 10),
        isActive: edits.isActive,
      },
    });
  };

  const openEditConfig = (config: PricingConfigEntry) => {
    setConfigForm({ ...config });
    setConfigDialogOpen(true);
  };

  return (
    <div className="p-6 flex flex-col gap-6" data-testid="page-admin-pricing">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
          <h1 className="text-2xl font-semibold" data-testid="text-page-title">Pricing Administration</h1>
        </div>
        <Button
          variant="outline"
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          data-testid="button-seed-data"
        >
          <Database className="h-4 w-4 mr-1" />
          Seed Data
        </Button>
      </div>

      <Tabs defaultValue="plans" data-testid="tabs-admin-pricing">
        <TabsList data-testid="tablist-admin-pricing">
          <TabsTrigger value="plans" data-testid="tab-plans">Plans</TabsTrigger>
          <TabsTrigger value="config" data-testid="tab-config">Pricing Config</TabsTrigger>
          <TabsTrigger value="stripe" data-testid="tab-stripe">Stripe Sync</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4">
          <Card data-testid="card-plans-table">
            <CardHeader>
              <CardTitle className="text-lg">Subscription Plans</CardTitle>
            </CardHeader>
            <CardContent>
              {plansLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-14 w-full rounded-md" />)}
                </div>
              ) : plansError ? (
                <p className="text-muted-foreground" data-testid="text-plans-error">Failed to load plans. Try seeding data first.</p>
              ) : !plans?.length ? (
                <p className="text-muted-foreground" data-testid="text-no-plans">No plans found. Click "Seed Data" to create default plans.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead>Monthly Price</TableHead>
                        <TableHead>Yearly Price</TableHead>
                        <TableHead>Per User</TableHead>
                        <TableHead>Max Users</TableHead>
                        <TableHead>Security</TableHead>
                        <TableHead>Active</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {plans.map((plan) => {
                        const isEditing = !!editingPlans[plan.id];
                        const edits = editingPlans[plan.id];
                        return (
                          <TableRow key={plan.id} data-testid={`row-plan-${plan.id}`}>
                            <TableCell className="font-medium" data-testid={`text-plan-name-${plan.id}`}>{plan.name}</TableCell>
                            <TableCell data-testid={`text-plan-code-${plan.id}`}>
                              <Badge variant="outline">{plan.code}</Badge>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={edits!.basePriceMonthlyCents}
                                  onChange={(e) =>
                                    setEditingPlans((prev) => ({
                                      ...prev,
                                      [plan.id]: { ...prev[plan.id], basePriceMonthlyCents: e.target.value },
                                    }))
                                  }
                                  className="w-28"
                                  data-testid={`input-monthly-price-${plan.id}`}
                                />
                              ) : (
                                <span data-testid={`text-monthly-price-${plan.id}`}>{formatCurrency(plan.basePriceMonthlyCents)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={edits!.basePriceYearlyCents}
                                  onChange={(e) =>
                                    setEditingPlans((prev) => ({
                                      ...prev,
                                      [plan.id]: { ...prev[plan.id], basePriceYearlyCents: e.target.value },
                                    }))
                                  }
                                  className="w-28"
                                  data-testid={`input-yearly-price-${plan.id}`}
                                />
                              ) : (
                                <span data-testid={`text-yearly-price-${plan.id}`}>{formatCurrency(plan.basePriceYearlyCents)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={edits!.perUserPriceCents}
                                  onChange={(e) =>
                                    setEditingPlans((prev) => ({
                                      ...prev,
                                      [plan.id]: { ...prev[plan.id], perUserPriceCents: e.target.value },
                                    }))
                                  }
                                  className="w-24"
                                  data-testid={`input-per-user-price-${plan.id}`}
                                />
                              ) : (
                                <span data-testid={`text-per-user-price-${plan.id}`}>{formatCurrency(plan.perUserPriceCents)}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  value={edits!.maxUsers}
                                  onChange={(e) =>
                                    setEditingPlans((prev) => ({
                                      ...prev,
                                      [plan.id]: { ...prev[plan.id], maxUsers: e.target.value },
                                    }))
                                  }
                                  className="w-20"
                                  type="number"
                                  data-testid={`input-max-users-${plan.id}`}
                                />
                              ) : (
                                <span data-testid={`text-max-users-${plan.id}`}>{plan.maxUsers}</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" data-testid={`badge-security-${plan.id}`}>
                                <Shield className="h-3 w-3 mr-1" />
                                {plan.securityMode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Switch
                                  checked={edits!.isActive}
                                  onCheckedChange={(checked) =>
                                    setEditingPlans((prev) => ({
                                      ...prev,
                                      [plan.id]: { ...prev[plan.id], isActive: checked },
                                    }))
                                  }
                                  data-testid={`switch-active-${plan.id}`}
                                />
                              ) : (
                                <Badge variant={plan.isActive !== false ? "default" : "secondary"} data-testid={`badge-active-${plan.id}`}>
                                  {plan.isActive !== false ? "Active" : "Inactive"}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 flex-wrap">
                                {isEditing ? (
                                  <Button
                                    size="sm"
                                    onClick={() => savePlan(plan)}
                                    disabled={updatePlanMutation.isPending}
                                    data-testid={`button-save-plan-${plan.id}`}
                                  >
                                    <Save className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditing(plan)}
                                    data-testid={`button-edit-plan-${plan.id}`}
                                  >
                                    Edit
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="config" className="mt-4">
          <Card data-testid="card-config-table">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-lg">Pricing Configuration</CardTitle>
              <Button
                size="sm"
                onClick={() => {
                  setConfigForm({ key: "", value: "", valueType: "string", visibility: "PRIVATE", description: "" });
                  setConfigDialogOpen(true);
                }}
                data-testid="button-add-config"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Config
              </Button>
            </CardHeader>
            <CardContent>
              {configsLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                </div>
              ) : configsError ? (
                <p className="text-muted-foreground" data-testid="text-configs-error">Failed to load configs. Try seeding data first.</p>
              ) : !configs?.length ? (
                <p className="text-muted-foreground" data-testid="text-no-configs">No configuration entries found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Key</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Visibility</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {configs.map((config) => (
                        <TableRow key={config.key} data-testid={`row-config-${config.key}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-config-key-${config.key}`}>{config.key}</TableCell>
                          <TableCell data-testid={`text-config-value-${config.key}`}>{config.value}</TableCell>
                          <TableCell data-testid={`text-config-type-${config.key}`}>
                            <Badge variant="outline">{config.valueType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={config.visibility === "PUBLIC" ? "default" : "secondary"}
                              data-testid={`badge-visibility-${config.key}`}
                            >
                              {config.visibility}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-48 truncate" data-testid={`text-config-desc-${config.key}`}>
                            {config.description || "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2 flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEditConfig(config)}
                                data-testid={`button-edit-config-${config.key}`}
                              >
                                Edit
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteConfigMutation.mutate(config.key)}
                                disabled={deleteConfigMutation.isPending}
                                data-testid={`button-delete-config-${config.key}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stripe" className="mt-4">
          <Card data-testid="card-stripe-sync">
            <CardHeader>
              <CardTitle className="text-lg">Stripe Sync Records</CardTitle>
            </CardHeader>
            <CardContent>
              {syncLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
                </div>
              ) : !syncRecords?.length ? (
                <p className="text-muted-foreground" data-testid="text-no-sync">No sync records found.</p>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Plan ID</TableHead>
                        <TableHead>Stripe Product</TableHead>
                        <TableHead>Stripe Price</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Synced At</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {syncRecords.map((record) => (
                        <TableRow key={record.id} data-testid={`row-sync-${record.id}`}>
                          <TableCell data-testid={`text-sync-id-${record.id}`}>#{record.id}</TableCell>
                          <TableCell data-testid={`text-sync-plan-${record.id}`}>{record.planId}</TableCell>
                          <TableCell className="font-mono text-xs" data-testid={`text-sync-product-${record.id}`}>
                            {record.stripeProductId || "—"}
                          </TableCell>
                          <TableCell className="font-mono text-xs" data-testid={`text-sync-price-${record.id}`}>
                            {record.stripePriceId || "—"}
                          </TableCell>
                          <TableCell data-testid={`text-sync-action-${record.id}`}>
                            <Badge variant="outline">{record.syncAction}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={record.syncStatus === "completed" ? "default" : record.syncStatus === "error" ? "destructive" : "secondary"}
                              data-testid={`badge-sync-status-${record.id}`}
                            >
                              {record.syncStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm" data-testid={`text-sync-date-${record.id}`}>
                            {record.syncedAt ? new Date(record.syncedAt).toLocaleString() : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-32 truncate" data-testid={`text-sync-error-${record.id}`}>
                            {record.errorMessage || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={configDialogOpen} onOpenChange={setConfigDialogOpen}>
        <DialogContent data-testid="dialog-config">
          <DialogHeader>
            <DialogTitle>{configForm.key ? "Edit Configuration" : "Add Configuration"}</DialogTitle>
            <DialogDescription>
              Configure pricing parameters for the billing system.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Key</label>
              <Input
                value={configForm.key}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, key: e.target.value }))}
                placeholder="config_key"
                data-testid="input-config-key"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Value</label>
              <Input
                value={configForm.value}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, value: e.target.value }))}
                placeholder="value"
                data-testid="input-config-value"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={configForm.valueType}
                onValueChange={(v) => setConfigForm((prev) => ({ ...prev, valueType: v as PricingConfigEntry["valueType"] }))}
              >
                <SelectTrigger data-testid="select-config-type-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="string">String</SelectItem>
                  <SelectItem value="integer">Integer</SelectItem>
                  <SelectItem value="boolean">Boolean</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Visibility</label>
              <Select
                value={configForm.visibility}
                onValueChange={(v) => setConfigForm((prev) => ({ ...prev, visibility: v as "PUBLIC" | "PRIVATE" }))}
              >
                <SelectTrigger data-testid="select-config-visibility-trigger">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={configForm.description || ""}
                onChange={(e) => setConfigForm((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                data-testid="input-config-description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfigDialogOpen(false)} data-testid="button-cancel-config">
              Cancel
            </Button>
            <Button
              onClick={() => upsertConfigMutation.mutate(configForm)}
              disabled={upsertConfigMutation.isPending || !configForm.key}
              data-testid="button-save-config"
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
