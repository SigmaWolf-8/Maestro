import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Search,
  User,
  MapPin,
  Phone,
  Globe,
  Calendar,
  FileText,
  Hash,
  Edit,
  Plus,
  Loader2,
  Save,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import type { Customer, Quote } from "@shared/schema";

interface CustomerWithQuote {
  customer: Customer;
  quote: Quote | null;
}

export default function CustomersForm() {
  const { activeTenant } = useSettings();
  const { toast } = useToast();
  const tenantId = activeTenant?.id;
  
  const [selectedJobNum, setSelectedJobNum] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newJobNum, setNewJobNum] = useState("");
  const [pendingChanges, setPendingChanges] = useState<Record<string, any>>({});

  // Fetch all customers for the dropdown - uses default fetcher since routes handle tenant fallback
  const { data: allCustomers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch selected customer with quote - path segments form URL via default fetcher
  const { data: selectedData, isLoading: dataLoading, refetch: refetchData } = useQuery<CustomerWithQuote | null>({
    queryKey: ["/api/customers/job", String(selectedJobNum)],
    enabled: !!selectedJobNum,
  });

  // Update customer field mutation (VBA AfterUpdate equivalent)
  const updateCustomerField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      return apiRequest("PATCH", "/api/customers/field", {
        tenantId,
        jobNum: selectedJobNum,
        field,
        value,
      });
    },
    onSuccess: () => {
      refetchData();
      toast({ title: "Saved", description: "Customer field updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Update quote field mutation (VBA AfterUpdate equivalent)
  const updateQuoteField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      return apiRequest("PATCH", "/api/quotes/field", {
        tenantId,
        jobNum: selectedJobNum,
        field,
        value,
      });
    },
    onSuccess: () => {
      refetchData();
      toast({ title: "Saved", description: "Quote field updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Create new customer mutation
  const createCustomer = useMutation({
    mutationFn: async (jobNum: number) => {
      const customer = await apiRequest("POST", "/api/customers", {
        tenantId,
        jobNum,
      });
      await apiRequest("POST", "/api/quotes", {
        tenantId,
        jobNum,
      });
      return customer;
    },
    onSuccess: (_, jobNum) => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      setSelectedJobNum(jobNum);
      setShowCreateDialog(false);
      setNewJobNum("");
      toast({ title: "Created", description: `Customer ${jobNum} created successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Seed sample data mutation
  const seedData = useMutation({
    mutationFn: async () => {
      const params = tenantId ? `?tenantId=${tenantId}` : "";
      return apiRequest("POST", `/api/customers/seed${params}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
      toast({ title: "Sample Data Added", description: "Sample customers and quotes have been created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  // Handle field blur - auto-save like VBA AfterUpdate
  const handleFieldBlur = useCallback((table: "customer" | "quote", field: string, value: any) => {
    if (!selectedJobNum || !editMode) return;
    
    const currentValue = table === "customer" 
      ? selectedData?.customer?.[field as keyof Customer]
      : selectedData?.quote?.[field as keyof Quote];
    
    if (value !== currentValue) {
      if (table === "customer") {
        updateCustomerField.mutate({ field, value });
      } else {
        updateQuoteField.mutate({ field, value });
      }
    }
  }, [selectedJobNum, editMode, selectedData, updateCustomerField, updateQuoteField]);

  // Filter customers for search
  const filteredCustomers = allCustomers?.filter(c => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      c.jobNum.toString().includes(search) ||
      c.firstName?.toLowerCase().includes(search) ||
      c.lastName?.toLowerCase().includes(search) ||
      c.address?.toLowerCase().includes(search)
    );
  });

  const customer = selectedData?.customer;
  const quote = selectedData?.quote;

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="page-customers">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-customers-title">
            Customers
          </h1>
          <p className="text-sm text-muted-foreground">
            View and manage customer and quote information.
          </p>
        </div>
        <div className="flex gap-2">
          {(!allCustomers || allCustomers.length === 0) && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => seedData.mutate()}
              disabled={seedData.isPending}
              data-testid="button-seed-data"
            >
              {seedData.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Seed Sample Data
            </Button>
          )}
          <Button
            variant={editMode ? "default" : "outline"}
            size="sm"
            onClick={() => setEditMode(!editMode)}
            data-testid="button-edit-mode"
          >
            <Edit className="mr-2 h-4 w-4" />
            {editMode ? "Editing" : "Edit Fields"}
          </Button>
          <Button size="sm" onClick={() => setShowCreateDialog(true)} data-testid="button-add-customer">
            <Plus className="mr-2 h-4 w-4" />
            New Customer
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="w-80">
          <Select
            value={selectedJobNum?.toString() || ""}
            onValueChange={(val) => setSelectedJobNum(parseInt(val, 10))}
          >
            <SelectTrigger id="jobNum" className="h-9" data-testid="select-job-number">
              <SelectValue placeholder="Select a job number..." />
            </SelectTrigger>
            <SelectContent>
              {customersLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : filteredCustomers?.length === 0 ? (
                <SelectItem value="none" disabled>No customers found</SelectItem>
              ) : (
                filteredCustomers?.map((c) => (
                  <SelectItem key={c.id} value={c.jobNum.toString()}>
                    {c.jobNum} - {c.firstName} {c.lastName} {c.address ? `(${c.address})` : ""}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by job #, name, or address..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-customer-search"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              Customer Information
              {editMode && <Badge variant="secondary" className="text-xs">Editing</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {dataLoading && selectedJobNum ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : customer ? (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="firstName" className="text-xs">First Name</Label>
                    <Input
                      id="firstName"
                      className="h-8"
                      defaultValue={customer.firstName || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "firstName", e.target.value)}
                      data-testid="input-first-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName" className="text-xs">Last Name</Label>
                    <Input
                      id="lastName"
                      className="h-8"
                      defaultValue={customer.lastName || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "lastName", e.target.value)}
                      data-testid="input-last-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="address" className="text-xs">Address</Label>
                    <Input
                      id="address"
                      className="h-8"
                      defaultValue={customer.address || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "address", e.target.value)}
                      data-testid="input-address"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="city" className="text-xs">City</Label>
                    <Input
                      id="city"
                      className="h-8"
                      defaultValue={customer.city || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "city", e.target.value)}
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="stateProvince" className="text-xs">State/Province</Label>
                    <Input
                      id="stateProvince"
                      className="h-8"
                      defaultValue={customer.stateProvince || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "stateProvince", e.target.value)}
                      data-testid="input-state"
                    />
                  </div>
                  <div>
                    <Label htmlFor="zipPostalCode" className="text-xs">ZIP/Postal</Label>
                    <Input
                      id="zipPostalCode"
                      className="h-8"
                      defaultValue={customer.zipPostalCode || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "zipPostalCode", e.target.value)}
                      data-testid="input-zip"
                    />
                  </div>
                  <div>
                    <Label htmlFor="countryRegion" className="text-xs">Country</Label>
                    <Input
                      id="countryRegion"
                      className="h-8"
                      defaultValue={customer.countryRegion || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "countryRegion", e.target.value)}
                      data-testid="input-country"
                    />
                  </div>
                </div>

                <Separator className="my-2" />

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="homePhone" className="text-xs">Home Phone</Label>
                    <Input
                      id="homePhone"
                      className="h-8"
                      defaultValue={customer.homePhone || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "homePhone", e.target.value)}
                      data-testid="input-home-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="workPhone" className="text-xs">Work Phone</Label>
                    <Input
                      id="workPhone"
                      className="h-8"
                      defaultValue={customer.workPhone || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "workPhone", e.target.value)}
                      data-testid="input-work-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobilePhone" className="text-xs">Mobile</Label>
                    <Input
                      id="mobilePhone"
                      className="h-8"
                      defaultValue={customer.mobilePhone || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "mobilePhone", e.target.value)}
                      data-testid="input-mobile-phone"
                    />
                  </div>
                  <div>
                    <Label htmlFor="mobilePhone2" className="text-xs">Mobile 2</Label>
                    <Input
                      id="mobilePhone2"
                      className="h-8"
                      defaultValue={customer.mobilePhone2 || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "mobilePhone2", e.target.value)}
                      data-testid="input-mobile-phone-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="email1" className="text-xs">Email 1</Label>
                    <Input
                      id="email1"
                      type="email"
                      className="h-8"
                      defaultValue={customer.email1 || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "email1", e.target.value)}
                      data-testid="input-email1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email2" className="text-xs">Email 2</Label>
                    <Input
                      id="email2"
                      type="email"
                      className="h-8"
                      defaultValue={customer.email2 || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "email2", e.target.value)}
                      data-testid="input-email2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="webPage" className="text-xs">Web Page</Label>
                    <Input
                      id="webPage"
                      className="h-8"
                      defaultValue={customer.webPage || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("customer", "webPage", e.target.value)}
                      data-testid="input-webpage"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a job number to view customer details</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Quote Information
              {quote?.qNum && <Badge variant="outline" className="text-xs">Q#{quote.qNum}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {dataLoading && selectedJobNum ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : quote ? (
              <>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="qNum" className="text-xs">Quote #</Label>
                    <Input
                      id="qNum"
                      className="h-8"
                      defaultValue={quote.qNum || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "qNum", e.target.value)}
                      data-testid="input-qnum"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dateOfQuote" className="text-xs">Date</Label>
                    <Input
                      id="dateOfQuote"
                      type="date"
                      className="h-8"
                      defaultValue={quote.dateOfQuote ? new Date(quote.dateOfQuote).toISOString().split('T')[0] : ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "dateOfQuote", e.target.value)}
                      data-testid="input-date-of-quote"
                    />
                  </div>
                  <div>
                    <Label htmlFor="customer" className="text-xs">Display Name</Label>
                    <Input
                      id="customer"
                      className="h-8"
                      defaultValue={quote.customer || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "customer", e.target.value)}
                      data-testid="input-display-name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="division" className="text-xs">Division</Label>
                    <Input
                      id="division"
                      className="h-8"
                      defaultValue={quote.division || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "division", e.target.value)}
                      data-testid="input-division"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="model" className="text-xs">Model</Label>
                    <Input
                      id="model"
                      className="h-8"
                      defaultValue={quote.model || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "model", e.target.value)}
                      data-testid="input-model"
                    />
                  </div>
                  <div>
                    <Label htmlFor="lot" className="text-xs">Lot</Label>
                    <Input
                      id="lot"
                      className="h-8"
                      defaultValue={quote.lot || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "lot", e.target.value)}
                      data-testid="input-lot"
                    />
                  </div>
                  <div>
                    <Label htmlFor="block" className="text-xs">Block</Label>
                    <Input
                      id="block"
                      className="h-8"
                      defaultValue={quote.block || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "block", e.target.value)}
                      data-testid="input-block"
                    />
                  </div>
                  <div>
                    <Label htmlFor="plan" className="text-xs">Plan</Label>
                    <Input
                      id="plan"
                      className="h-8"
                      defaultValue={quote.plan || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "plan", e.target.value)}
                      data-testid="input-plan"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="projectAddress" className="text-xs">Project Address</Label>
                  <Input
                    id="projectAddress"
                    className="h-8"
                    defaultValue={quote.projectAddress || ""}
                    disabled={!editMode}
                    onBlur={(e) => handleFieldBlur("quote", "projectAddress", e.target.value)}
                    data-testid="input-project-address"
                  />
                </div>

                <Separator className="my-2" />

                <div className="text-xs font-medium text-muted-foreground">Square Footage</div>
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <Label htmlFor="main" className="text-xs">Main</Label>
                    <Input
                      id="main"
                      type="number"
                      className="h-8"
                      defaultValue={quote.main || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "main", e.target.value)}
                      data-testid="input-main"
                    />
                  </div>
                  <div>
                    <Label htmlFor="upper" className="text-xs">Upper</Label>
                    <Input
                      id="upper"
                      type="number"
                      className="h-8"
                      defaultValue={quote.upper || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "upper", e.target.value)}
                      data-testid="input-upper"
                    />
                  </div>
                  <div>
                    <Label htmlFor="low" className="text-xs">Lower</Label>
                    <Input
                      id="low"
                      type="number"
                      className="h-8"
                      defaultValue={quote.low || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "low", e.target.value)}
                      data-testid="input-low"
                    />
                  </div>
                  <div>
                    <Label htmlFor="gar" className="text-xs">Garage</Label>
                    <Input
                      id="gar"
                      type="number"
                      className="h-8"
                      defaultValue={quote.gar || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "gar", e.target.value)}
                      data-testid="input-gar"
                    />
                  </div>
                </div>

                <div className="text-xs font-medium text-muted-foreground">Building Permits</div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label htmlFor="dp" className="text-xs">DP</Label>
                    <Input
                      id="dp"
                      type="number"
                      className="h-8"
                      defaultValue={quote.dp || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "dp", e.target.value)}
                      data-testid="input-dp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="bp" className="text-xs">BP</Label>
                    <Input
                      id="bp"
                      type="number"
                      className="h-8"
                      defaultValue={quote.bp || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "bp", e.target.value)}
                      data-testid="input-bp"
                    />
                  </div>
                  <div>
                    <Label htmlFor="dgbp" className="text-xs">DGBP</Label>
                    <Input
                      id="dgbp"
                      type="number"
                      className="h-8"
                      defaultValue={quote.dgbp || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("quote", "dgbp", e.target.value)}
                      data-testid="input-dgbp"
                    />
                  </div>
                </div>
              </>
            ) : selectedJobNum && !dataLoading ? (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No quote found for this customer</p>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a job number to view quote details</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create New Customer Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Enter a job number to create a new customer record.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="newJobNum">Job Number</Label>
            <Input
              id="newJobNum"
              type="number"
              value={newJobNum}
              onChange={(e) => setNewJobNum(e.target.value)}
              placeholder="Enter job number..."
              data-testid="input-new-job-num"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const num = parseInt(newJobNum, 10);
                if (!isNaN(num)) {
                  createCustomer.mutate(num);
                }
              }}
              disabled={!newJobNum || createCustomer.isPending}
              data-testid="button-confirm-create"
            >
              {createCustomer.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Saving indicator */}
      {(updateCustomerField.isPending || updateQuoteField.isPending) && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
