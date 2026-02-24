import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Plus,
  Loader2,
  DollarSign,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Calculator,
  Package,
  Save,
  X,
  ArrowUpDown,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PmItem, PmCompileItem } from "@shared/schema";

type ViewMode = "vendor" | "wbs";

function formatCurrency(value: string | null | undefined): string {
  const num = parseFloat(value || "0");
  return num.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function formatMu(value: string | null | undefined): string {
  const num = parseFloat(value || "1");
  return num.toFixed(2);
}

function calcSellPrice(price: string | null | undefined, mu: string | null | undefined): string {
  const p = parseFloat(price || "0");
  const m = parseFloat(mu || "1");
  return (p * m).toFixed(2);
}

function calcLineTotal(
  price: number, qty: number, expr: string,
  qty2: number, expr2: string,
  qty3: number, expr3: string
): { subtotal: number; subtotal2: number; lineTotal: number } {
  let subtotal = price;
  if (expr === "*") subtotal = qty * price;
  else if (expr === "/") subtotal = qty / price;
  else if (expr === "+") subtotal = qty + price;
  else if (expr === "-") subtotal = qty - price;

  let subtotal2 = subtotal;
  if (expr2 === "*") subtotal2 = subtotal * qty2;
  else if (expr2 === "/") subtotal2 = subtotal / qty2;
  else if (expr2 === "+") subtotal2 = subtotal + qty2;
  else if (expr2 === "-") subtotal2 = subtotal - qty2;

  let lineTotal = subtotal2;
  if (expr3 === "*") lineTotal = subtotal2 * qty3;
  else if (expr3 === "/") lineTotal = subtotal2 / qty3;
  else if (expr3 === "+") lineTotal = subtotal2 + qty3;
  else if (expr3 === "-") lineTotal = subtotal2 - qty3;

  return { subtotal, subtotal2, lineTotal };
}

export default function PriceMasterPage() {
  const { toast } = useToast();
  const { activeTenant } = useSettings();
  const tenantId = activeTenant?.id;

  const [viewMode, setViewMode] = useState<ViewMode>("vendor");
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<Partial<PmItem>>({});
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showCompileDialog, setShowCompileDialog] = useState(false);
  const [compileParent, setCompileParent] = useState<PmItem | null>(null);
  const [showAddCompileDialog, setShowAddCompileDialog] = useState(false);

  const vendorSelected = selectedVendor !== "";

  const { data: items = [], isLoading } = useQuery<PmItem[]>({
    queryKey: ["/api/price-master/items", tenantId, selectedVendor, selectedCategory],
    queryFn: async () => {
      if (!tenantId || !selectedVendor) return [];
      const params = new URLSearchParams({ tenantId, vendor: selectedVendor });
      if (selectedCategory !== "all") params.set("category", selectedCategory);
      params.set("archived", "false");
      const res = await fetch(`/api/price-master/items?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!tenantId && vendorSelected,
  });

  const { data: vendors = [] } = useQuery<string[]>({
    queryKey: ["/api/price-master/vendors", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await fetch(`/api/price-master/vendors?tenantId=${tenantId}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["/api/price-master/categories", tenantId, selectedVendor],
    queryFn: async () => {
      if (!tenantId || !selectedVendor) return [];
      const params = new URLSearchParams({ tenantId, vendor: selectedVendor });
      const res = await fetch(`/api/price-master/categories?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId && vendorSelected,
  });

  const { data: compileItems = [], isLoading: compileLoading } = useQuery<PmCompileItem[]>({
    queryKey: ["/api/price-master/compile", tenantId, compileParent?.ps, compileParent?.vendor],
    queryFn: async () => {
      if (!tenantId || !compileParent) return [];
      const params = new URLSearchParams({ tenantId, ps: compileParent.ps });
      if (compileParent.vendor) params.set("vendor", compileParent.vendor);
      const res = await fetch(`/api/price-master/compile?${params}`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!tenantId && !!compileParent,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PmItem> }) => {
      const res = await apiRequest("PATCH", `/api/price-master/items/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/items"] });
      toast({ title: "Item updated" });
      setEditingItem(null);
      setEditValues({});
    },
    onError: (err: Error) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/price-master/items", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/vendors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/categories"] });
      toast({ title: "Item created" });
      setShowAddDialog(false);
    },
    onError: (err: Error) => {
      toast({ title: "Create failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/price-master/items/${id}?tenantId=${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/items"] });
      toast({ title: "Item deleted" });
    },
  });

  const createCompileMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/price-master/compile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/compile"] });
      toast({ title: "Assembly line added" });
      setShowAddCompileDialog(false);
    },
  });

  const deleteCompileMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/price-master/compile/${id}?tenantId=${tenantId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/compile"] });
      toast({ title: "Assembly line removed" });
    },
  });

  const calculateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/price-master/calculate-compile", data);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/compile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/price-master/items"] });
      toast({ title: "Calculated", description: `Total: ${formatCurrency(result.total.toString())} (${result.itemsCalculated} items)` });
    },
  });

  const filteredItems = useMemo(() => {
    if (!searchQuery) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(i =>
      i.ps?.toLowerCase().includes(q) ||
      i.title?.toLowerCase().includes(q) ||
      i.vendor?.toLowerCase().includes(q) ||
      i.sku?.toLowerCase().includes(q) ||
      i.category?.toLowerCase().includes(q) ||
      i.comments?.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const groupedByVendor = useMemo(() => {
    const groups: Record<string, PmItem[]> = {};
    filteredItems.forEach(item => {
      const key = item.vendor || "Unassigned";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredItems]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, PmItem[]> = {};
    filteredItems.forEach(item => {
      const key = item.category || "Uncategorized";
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    });
    return groups;
  }, [filteredItems]);

  const totalItems = filteredItems.length;
  const totalValue = filteredItems.reduce((sum, i) => sum + parseFloat(i.price || "0"), 0);
  const totalSellValue = filteredItems.reduce((sum, i) => sum + parseFloat(i.sellPrice || "0"), 0);
  const compiledCount = filteredItems.filter(i => i.pmCompile).length;

  const startEditing = (item: PmItem) => {
    setEditingItem(item.id);
    setEditValues({
      ps: item.ps,
      price: item.price,
      mu: item.mu,
      sellPrice: item.sellPrice,
      sku: item.sku,
      category: item.category,
      comments: item.comments,
    });
  };

  const saveEdit = () => {
    if (!editingItem || !tenantId) return;
    const price = editValues.price || "0";
    const mu = editValues.mu || "1";
    const sellPrice = calcSellPrice(price, mu);
    updateMutation.mutate({
      id: editingItem,
      updates: { ...editValues, sellPrice, tenantId },
    });
  };

  const openCompileEditor = (item: PmItem) => {
    setCompileParent(item);
    setShowCompileDialog(true);
  };

  const [collapsedVendors, setCollapsedVendors] = useState<Set<string>>(new Set());
  const toggleVendor = (vendor: string) => {
    setCollapsedVendors(prev => {
      const next = new Set(prev);
      if (next.has(vendor)) next.delete(vendor);
      else next.add(vendor);
      return next;
    });
  };

  const [newItem, setNewItem] = useState({
    ps: "", vendor: "", category: "", price: "0", mu: "1.45", sku: "", comments: "", sortNum: 0,
  });

  const [newCompileItem, setNewCompileItem] = useState({
    psSub: "", subVendor: "", quantity: "1", expressionValue: "*", price: "0", title: "",
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-4" data-testid="page-price-master-loading">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden" data-testid="page-price-master">
      <div className="px-6 pt-4 pb-2 space-y-3 shrink-0 border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <DollarSign className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold" data-testid="text-page-title">Price Master</h1>
              <p className="text-xs text-muted-foreground">Master Pricing Catalogue</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setShowAddDialog(true)}
              data-testid="button-add-item"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Item
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
            <Button
              size="sm"
              variant={viewMode === "vendor" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setViewMode("vendor")}
              data-testid="button-view-vendor"
            >
              By Vendor
            </Button>
            <Button
              size="sm"
              variant={viewMode === "wbs" ? "default" : "ghost"}
              className="h-7 text-xs"
              onClick={() => setViewMode("wbs")}
              data-testid="button-view-wbs"
            >
              By Category
            </Button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search items..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 h-8 text-sm"
              data-testid="input-search"
            />
          </div>

          <Select value={selectedVendor} onValueChange={(v) => { setSelectedVendor(v); setSelectedCategory("all"); }}>
            <SelectTrigger className="w-56 h-8 text-sm" data-testid="select-vendor-filter">
              <SelectValue placeholder="Select a Vendor..." />
            </SelectTrigger>
            <SelectContent>
              {vendors.map(v => (
                <SelectItem key={v} value={v}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {vendorSelected && (
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48 h-8 text-sm" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(c => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span data-testid="text-total-items">{totalItems} items</span>
          <span>|</span>
          <span data-testid="text-total-cost">Cost: {formatCurrency(totalValue.toString())}</span>
          <span>|</span>
          <span data-testid="text-total-sell">Sell: {formatCurrency(totalSellValue.toString())}</span>
          <span>|</span>
          <span>{compiledCount} assemblies</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto px-6 py-3">
        {viewMode === "vendor" ? (
          <div className="space-y-3">
            {Object.entries(groupedByVendor).sort(([a], [b]) => a.localeCompare(b)).map(([vendor, vendorItems]) => (
              <Card key={vendor} className="overflow-hidden" data-testid={`card-vendor-${vendor.replace(/\s+/g, '-')}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
                  onClick={() => toggleVendor(vendor)}
                  data-testid={`button-toggle-vendor-${vendor.replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2">
                    {collapsedVendors.has(vendor) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Package className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{vendor}</span>
                    <Badge variant="secondary" className="text-xs">{vendorItems.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total: {formatCurrency(vendorItems.reduce((s, i) => s + parseFloat(i.price || "0"), 0).toString())}
                  </span>
                </button>
                {!collapsedVendors.has(vendor) && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>PS Code</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">MU</TableHead>
                          <TableHead className="text-right">Sell Price</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {vendorItems.map(item => (
                          <PmItemRow
                            key={item.id}
                            item={item}
                            isEditing={editingItem === item.id}
                            editValues={editValues}
                            setEditValues={setEditValues}
                            onStartEdit={() => startEditing(item)}
                            onSaveEdit={saveEdit}
                            onCancelEdit={() => { setEditingItem(null); setEditValues({}); }}
                            onDelete={() => deleteMutation.mutate(item.id)}
                            onOpenCompile={() => openCompileEditor(item)}
                            isSaving={updateMutation.isPending}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            ))}
            {!vendorSelected && (
              <div className="text-center py-16 text-muted-foreground" data-testid="text-select-vendor-prompt">
                <Package className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-base">Select a Vendor</p>
                <p className="text-sm mt-1">Choose a vendor from the dropdown above to view their pricing catalogue</p>
              </div>
            )}
            {vendorSelected && Object.keys(groupedByVendor).length === 0 && (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-state">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pricing items found</p>
                <p className="text-sm mt-1">Add your first item to get started</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(groupedByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([category, catItems]) => (
              <Card key={category} className="overflow-hidden" data-testid={`card-category-${category.replace(/\s+/g, '-')}`}>
                <button
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-muted/50 hover:bg-muted transition-colors text-left"
                  onClick={() => toggleVendor(category)}
                  data-testid={`button-toggle-category-${category.replace(/\s+/g, '-')}`}
                >
                  <div className="flex items-center gap-2">
                    {collapsedVendors.has(category) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    <Filter className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{category}</span>
                    <Badge variant="secondary" className="text-xs">{catItems.length}</Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Total: {formatCurrency(catItems.reduce((s, i) => s + parseFloat(i.price || "0"), 0).toString())}
                  </span>
                </button>
                {!collapsedVendors.has(category) && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="text-xs">
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>PS Code</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                          <TableHead className="text-right">MU</TableHead>
                          <TableHead className="text-right">Sell Price</TableHead>
                          <TableHead>Comments</TableHead>
                          <TableHead className="w-24 text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {catItems.map(item => (
                          <PmItemRow
                            key={item.id}
                            item={item}
                            showVendor
                            isEditing={editingItem === item.id}
                            editValues={editValues}
                            setEditValues={setEditValues}
                            onStartEdit={() => startEditing(item)}
                            onSaveEdit={saveEdit}
                            onCancelEdit={() => { setEditingItem(null); setEditValues({}); }}
                            onDelete={() => deleteMutation.mutate(item.id)}
                            onOpenCompile={() => openCompileEditor(item)}
                            isSaving={updateMutation.isPending}
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </Card>
            ))}
            {!vendorSelected && (
              <div className="text-center py-16 text-muted-foreground" data-testid="text-select-vendor-prompt-category">
                <Package className="h-14 w-14 mx-auto mb-4 opacity-20" />
                <p className="font-medium text-base">Select a Vendor</p>
                <p className="text-sm mt-1">Choose a vendor from the dropdown above to view their pricing catalogue</p>
              </div>
            )}
            {vendorSelected && Object.keys(groupedByCategory).length === 0 && (
              <div className="text-center py-12 text-muted-foreground" data-testid="text-empty-state-category">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No pricing items found</p>
                <p className="text-sm mt-1">Add your first item to get started</p>
              </div>
            )}
          </div>
        )}
      </div>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg" data-testid="dialog-add-item">
          <DialogHeader>
            <DialogTitle>Add Pricing Item</DialogTitle>
            <DialogDescription>Add a new item to the Price Master catalogue</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PS Code *</Label>
                <Input
                  value={newItem.ps}
                  onChange={e => setNewItem(p => ({ ...p, ps: e.target.value }))}
                  placeholder="e.g. DW-STD-4x8"
                  data-testid="input-new-ps"
                />
              </div>
              <div>
                <Label>Vendor *</Label>
                <Input
                  value={newItem.vendor}
                  onChange={e => setNewItem(p => ({ ...p, vendor: e.target.value }))}
                  placeholder="e.g. Consolidated Gypsum"
                  data-testid="input-new-vendor"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Cost Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.price}
                  onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                  data-testid="input-new-price"
                />
              </div>
              <div>
                <Label>Markup (MU)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newItem.mu}
                  onChange={e => setNewItem(p => ({ ...p, mu: e.target.value }))}
                  data-testid="input-new-mu"
                />
              </div>
              <div>
                <Label>Sell Price</Label>
                <Input
                  readOnly
                  value={formatCurrency(calcSellPrice(newItem.price, newItem.mu))}
                  className="bg-muted"
                  data-testid="input-new-sell-price"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input
                  value={newItem.category}
                  onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
                  placeholder="e.g. Drywall"
                  data-testid="input-new-category"
                />
              </div>
              <div>
                <Label>SKU</Label>
                <Input
                  value={newItem.sku}
                  onChange={e => setNewItem(p => ({ ...p, sku: e.target.value }))}
                  placeholder="Product number"
                  data-testid="input-new-sku"
                />
              </div>
            </div>
            <div>
              <Label>Comments</Label>
              <Textarea
                value={newItem.comments}
                onChange={e => setNewItem(p => ({ ...p, comments: e.target.value }))}
                placeholder="Optional notes..."
                rows={2}
                data-testid="input-new-comments"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)} data-testid="button-cancel-add">Cancel</Button>
            <Button
              onClick={() => {
                if (!newItem.ps || !newItem.vendor || !tenantId) {
                  toast({ title: "PS Code and Vendor are required", variant: "destructive" });
                  return;
                }
                createMutation.mutate({
                  tenantId,
                  ps: newItem.ps,
                  vendor: newItem.vendor,
                  price: newItem.price,
                  mu: newItem.mu,
                  sellPrice: calcSellPrice(newItem.price, newItem.mu),
                  category: newItem.category || null,
                  sku: newItem.sku || null,
                  comments: newItem.comments || null,
                  sortNum: newItem.sortNum,
                  lastUpdate: new Date().toISOString(),
                });
              }}
              disabled={createMutation.isPending}
              data-testid="button-save-add"
            >
              {createMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCompileDialog} onOpenChange={(open) => { setShowCompileDialog(open); if (!open) setCompileParent(null); }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" data-testid="dialog-compile">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Estimating Assembly: {compileParent?.ps}
            </DialogTitle>
            <DialogDescription>
              Manage the sub-items that make up this compiled price. Vendor: {compileParent?.vendor}
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto">
            {compileLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead>#</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>PS Sub</TableHead>
                    <TableHead>Sub Vendor</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-center">Op</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Subtotal</TableHead>
                    <TableHead className="text-right">Line Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {compileItems.map(ci => {
                    const calcs = calcLineTotal(
                      parseFloat(ci.price || "0"),
                      parseFloat(ci.quantity || "1"),
                      ci.expressionValue || "0",
                      parseFloat(ci.quantity2 || "1"),
                      ci.expressionValue2 || "0",
                      parseFloat(ci.quantity3 || "1"),
                      ci.expressionValue3 || "0",
                    );
                    return (
                      <TableRow key={ci.id} className="text-xs" data-testid={`row-compile-${ci.id}`}>
                        <TableCell>{ci.sortNum}</TableCell>
                        <TableCell className="font-medium">{ci.title || "-"}</TableCell>
                        <TableCell><code className="text-xs">{ci.psSub}</code></TableCell>
                        <TableCell>{ci.subVendor || "-"}</TableCell>
                        <TableCell className="text-right">{ci.quantity}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className="text-xs">{ci.expressionValue || "="}</Badge>
                        </TableCell>
                        <TableCell className="text-right">{formatCurrency(ci.price)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(calcs.subtotal.toFixed(2))}</TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(calcs.lineTotal.toFixed(2))}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => deleteCompileMutation.mutate(ci.id)}
                            data-testid={`button-delete-compile-${ci.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {compileItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground py-6">
                        No assembly items yet. Add sub-items to build this compiled price.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
            {compileItems.length > 0 && (
              <div className="flex justify-end px-4 py-2 border-t bg-muted/30">
                <span className="text-sm font-semibold" data-testid="text-compile-total">
                  Assembly Total: {formatCurrency(compileItems.reduce((s, ci) => {
                    const calcs = calcLineTotal(
                      parseFloat(ci.price || "0"),
                      parseFloat(ci.quantity || "1"),
                      ci.expressionValue || "0",
                      parseFloat(ci.quantity2 || "1"),
                      ci.expressionValue2 || "0",
                      parseFloat(ci.quantity3 || "1"),
                      ci.expressionValue3 || "0",
                    );
                    return s + calcs.lineTotal;
                  }, 0).toFixed(2))}
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddCompileDialog(true)}
              data-testid="button-add-compile-line"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Line
            </Button>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (compileParent && tenantId) {
                    calculateMutation.mutate({
                      tenantId,
                      ps: compileParent.ps,
                      vendor: compileParent.vendor,
                    });
                  }
                }}
                disabled={calculateMutation.isPending}
                data-testid="button-calculate-compile"
              >
                {calculateMutation.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
                Calculate
              </Button>
              <Button variant="outline" onClick={() => setShowCompileDialog(false)} data-testid="button-close-compile">
                Close
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddCompileDialog} onOpenChange={setShowAddCompileDialog}>
        <DialogContent className="max-w-md" data-testid="dialog-add-compile-line">
          <DialogHeader>
            <DialogTitle>Add Assembly Line</DialogTitle>
            <DialogDescription>Add a sub-item to {compileParent?.ps}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Title</Label>
              <Input
                value={newCompileItem.title}
                onChange={e => setNewCompileItem(p => ({ ...p, title: e.target.value }))}
                placeholder="Line description"
                data-testid="input-compile-title"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>PS Sub Code *</Label>
                <Input
                  value={newCompileItem.psSub}
                  onChange={e => setNewCompileItem(p => ({ ...p, psSub: e.target.value }))}
                  placeholder="Sub-item code"
                  data-testid="input-compile-pssub"
                />
              </div>
              <div>
                <Label>Sub Vendor</Label>
                <Input
                  value={newCompileItem.subVendor}
                  onChange={e => setNewCompileItem(p => ({ ...p, subVendor: e.target.value }))}
                  placeholder="Vendor"
                  data-testid="input-compile-subvendor"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newCompileItem.quantity}
                  onChange={e => setNewCompileItem(p => ({ ...p, quantity: e.target.value }))}
                  data-testid="input-compile-qty"
                />
              </div>
              <div>
                <Label>Operator</Label>
                <Select
                  value={newCompileItem.expressionValue}
                  onValueChange={v => setNewCompileItem(p => ({ ...p, expressionValue: v }))}
                >
                  <SelectTrigger data-testid="select-compile-expr">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="*">× Multiply</SelectItem>
                    <SelectItem value="/">÷ Divide</SelectItem>
                    <SelectItem value="+">+ Add</SelectItem>
                    <SelectItem value="-">− Subtract</SelectItem>
                    <SelectItem value="0">= Direct</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Price</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={newCompileItem.price}
                  onChange={e => setNewCompileItem(p => ({ ...p, price: e.target.value }))}
                  data-testid="input-compile-price"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCompileDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                if (!newCompileItem.psSub || !compileParent || !tenantId) {
                  toast({ title: "PS Sub Code is required", variant: "destructive" });
                  return;
                }
                createCompileMutation.mutate({
                  tenantId,
                  ps: compileParent.ps,
                  psSub: newCompileItem.psSub,
                  vendor: compileParent.vendor,
                  subVendor: newCompileItem.subVendor || null,
                  quantity: newCompileItem.quantity,
                  expressionValue: newCompileItem.expressionValue,
                  price: newCompileItem.price,
                  title: newCompileItem.title || null,
                  sortNum: (compileItems.length + 1) * 10,
                });
              }}
              disabled={createCompileMutation.isPending}
              data-testid="button-save-compile-line"
            >
              {createCompileMutation.isPending && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Add Line
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PmItemRow({
  item,
  showVendor,
  isEditing,
  editValues,
  setEditValues,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
  onOpenCompile,
  isSaving,
}: {
  item: PmItem;
  showVendor?: boolean;
  isEditing: boolean;
  editValues: Partial<PmItem>;
  setEditValues: (v: Partial<PmItem>) => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onOpenCompile: () => void;
  isSaving: boolean;
}) {
  if (isEditing) {
    return (
      <TableRow className="text-xs bg-primary/5" data-testid={`row-editing-${item.id}`}>
        <TableCell>{item.sortNum}</TableCell>
        <TableCell>
          <Input
            value={editValues.ps || ""}
            onChange={e => setEditValues({ ...editValues, ps: e.target.value })}
            className="h-7 text-xs w-28"
            data-testid="input-edit-ps"
          />
        </TableCell>
        {showVendor && <TableCell className="text-xs">{item.vendor}</TableCell>}
        <TableCell>
          <Input
            value={editValues.sku || ""}
            onChange={e => setEditValues({ ...editValues, sku: e.target.value })}
            className="h-7 text-xs w-20"
            data-testid="input-edit-sku"
          />
        </TableCell>
        {!showVendor && (
          <TableCell>
            <Input
              value={editValues.category || ""}
              onChange={e => setEditValues({ ...editValues, category: e.target.value })}
              className="h-7 text-xs w-24"
              data-testid="input-edit-category"
            />
          </TableCell>
        )}
        <TableCell className="text-right">
          <Input
            type="number"
            step="0.01"
            value={editValues.price || "0"}
            onChange={e => setEditValues({ ...editValues, price: e.target.value })}
            className="h-7 text-xs w-20 text-right"
            data-testid="input-edit-price"
          />
        </TableCell>
        <TableCell className="text-right">
          <Input
            type="number"
            step="0.01"
            value={editValues.mu || "1"}
            onChange={e => setEditValues({ ...editValues, mu: e.target.value })}
            className="h-7 text-xs w-16 text-right"
            data-testid="input-edit-mu"
          />
        </TableCell>
        <TableCell className="text-right font-medium">
          {formatCurrency(calcSellPrice(editValues.price, editValues.mu))}
        </TableCell>
        <TableCell>
          <Input
            value={editValues.comments || ""}
            onChange={e => setEditValues({ ...editValues, comments: e.target.value })}
            className="h-7 text-xs w-28"
            data-testid="input-edit-comments"
          />
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1 justify-center">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onSaveEdit} disabled={isSaving} data-testid="button-save-edit">
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onCancelEdit} data-testid="button-cancel-edit">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <TableRow className="text-xs hover:bg-muted/30 group" data-testid={`row-item-${item.id}`}>
      <TableCell className="text-muted-foreground">{item.sortNum}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1">
          <code className="text-xs font-medium">{item.ps}</code>
          {item.pmCompile && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 cursor-pointer hover:bg-primary/10" onClick={onOpenCompile} data-testid={`badge-compile-${item.id}`}>
              <Calculator className="h-2.5 w-2.5 mr-0.5" />
              Asm
            </Badge>
          )}
        </div>
      </TableCell>
      {showVendor && <TableCell>{item.vendor}</TableCell>}
      <TableCell className="text-muted-foreground">{item.sku || "-"}</TableCell>
      {!showVendor && <TableCell className="text-muted-foreground">{item.category || "-"}</TableCell>}
      <TableCell className="text-right font-mono">{formatCurrency(item.price)}</TableCell>
      <TableCell className="text-right text-muted-foreground">{formatMu(item.mu)}x</TableCell>
      <TableCell className="text-right font-mono font-medium text-primary">{formatCurrency(item.sellPrice)}</TableCell>
      <TableCell className="text-muted-foreground max-w-[150px] truncate" title={item.comments || ""}>{item.comments || "-"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-1 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onStartEdit} data-testid={`button-edit-${item.id}`}>
            <Edit className="h-3 w-3" />
          </Button>
          {item.pmCompile && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onOpenCompile} data-testid={`button-compile-${item.id}`}>
              <Calculator className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={onDelete} data-testid={`button-delete-${item.id}`}>
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
