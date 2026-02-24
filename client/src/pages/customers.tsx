import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useSettings } from "@/components/settings-provider";
import { useToast } from "@/hooks/use-toast";
import {
  Building,
  Search,
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
import { Trash2, Mail, Users } from "lucide-react";
import type { Customer, Quote, CustomerContact } from "@shared/schema";

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

  const { data: allCustomers, isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers", tenantId],
    queryFn: async () => {
      if (!tenantId) return [];
      const res = await fetch(`/api/customers?tenantId=${tenantId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!tenantId,
  });

  const { data: selectedData, isLoading: dataLoading, refetch: refetchData } = useQuery<CustomerWithQuote | null>({
    queryKey: ["/api/customers/job", String(selectedJobNum), tenantId],
    queryFn: async () => {
      if (!selectedJobNum || !tenantId) return null;
      const res = await fetch(`/api/customers/job/${selectedJobNum}?tenantId=${tenantId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json();
    },
    enabled: !!selectedJobNum && !!tenantId,
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
      queryClient.invalidateQueries({ queryKey: ["/api/customers", tenantId] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/customers", tenantId] });
      toast({ title: "Sample Data Added", description: "Sample customers and quotes have been created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const customerId = selectedData?.customer?.id;

  const { data: customerContacts, isLoading: contactsLoading } = useQuery<CustomerContact[]>({
    queryKey: ["/api/customers", customerId, "contacts"],
    queryFn: async () => {
      if (!customerId) return [];
      const res = await fetch(`/api/customers/${customerId}/contacts`);
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
    enabled: !!customerId,
  });

  const updateCustomerContact = useMutation({
    mutationFn: async ({ contactId, updates }: { contactId: string; updates: Partial<CustomerContact> }) => {
      return apiRequest("PATCH", `/api/customer-contacts/${contactId}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "contacts"] });
      toast({ title: "Saved", description: "Contact updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteCustomerContact = useMutation({
    mutationFn: async (contactId: string) => {
      return apiRequest("DELETE", `/api/customer-contacts/${contactId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "contacts"] });
      toast({ title: "Deleted", description: "Contact removed" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleContactFieldBlur = useCallback((contactId: string, field: string, value: any) => {
    if (!editMode) return;
    updateCustomerContact.mutate({ contactId, updates: { [field]: value } });
  }, [editMode, updateCustomerContact]);

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
              <Users className="h-4 w-4" />
              Contacts
              {customer && <span className="text-xs text-muted-foreground" data-testid="text-contacts-count">({customerContacts?.length || 0})</span>}
              {editMode && <Badge variant="secondary" className="text-xs">Editing</Badge>}
              {customer && (
                <div className="ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs h-7"
                    disabled={!editMode}
                    onClick={() => {
                      if (!customer?.id || !tenantId) return;
                      apiRequest("POST", `/api/customers/${customerId}/contacts`, {
                        tenantId,
                        firstName: "",
                        lastName: "",
                        jobTitle: "",
                        businessPhone: "",
                        emailAddress: "",
                        isPrimary: (customerContacts?.length || 0) === 0,
                      }).then(() => {
                        queryClient.invalidateQueries({ queryKey: ["/api/customers", customerId, "contacts"] });
                        toast({ title: "Contact Added", description: "New contact created" });
                      });
                    }}
                    data-testid="button-add-customer-contact"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Add Contact
                  </Button>
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {dataLoading && selectedJobNum ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : customer ? (
              contactsLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : (customerContacts?.length || 0) > 0 ? (
                <div className="space-y-1" data-testid="customer-contacts-list">
                  {customerContacts?.map((contact, idx) => (
                    <div
                      key={contact.id}
                      className="rounded-md border px-2 py-1"
                      data-testid={`customer-contact-row-${contact.id}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-xs font-semibold text-foreground">{idx + 1}.</span>
                        {contact.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                        <span className="text-xs font-semibold text-foreground truncate">
                          {[contact.firstName, contact.lastName].filter(Boolean).join(' ') || 'Unnamed Contact'}
                        </span>
                        <div className="ml-auto flex items-center gap-0.5">
                          {contact.emailAddress && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(`mailto:${contact.emailAddress}`, '_blank')}
                              data-testid={`button-email-customer-contact-${contact.id}`}
                            >
                              <Mail className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {editMode && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteCustomerContact.mutate(contact.id)}
                              data-testid={`button-delete-customer-contact-${contact.id}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        <div>
                          <Label className="text-xs text-foreground font-medium">First Name</Label>
                          <Input
                            key={`cc-firstName-${contact.id}`}
                            defaultValue={contact.firstName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "firstName", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-first-name-${contact.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground font-medium">Last Name</Label>
                          <Input
                            key={`cc-lastName-${contact.id}`}
                            defaultValue={contact.lastName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "lastName", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-last-name-${contact.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground font-medium">Job Title</Label>
                          <Input
                            key={`cc-jobTitle-${contact.id}`}
                            defaultValue={contact.jobTitle || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "jobTitle", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-job-title-${contact.id}`}
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-1 mt-1">
                        <div>
                          <Label className="text-xs text-foreground font-medium">Business Phone</Label>
                          <Input
                            key={`cc-businessPhone-${contact.id}`}
                            defaultValue={contact.businessPhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "businessPhone", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-business-phone-${contact.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground font-medium">Mobile Phone</Label>
                          <Input
                            key={`cc-mobilePhone-${contact.id}`}
                            defaultValue={contact.mobilePhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "mobilePhone", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-mobile-phone-${contact.id}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-foreground font-medium">Email</Label>
                          <Input
                            key={`cc-email-${contact.id}`}
                            type="email"
                            defaultValue={contact.emailAddress || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(contact.id, "emailAddress", e.target.value)}
                            className="h-6 text-xs"
                            data-testid={`input-cc-email-${contact.id}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No contacts assigned to this customer</p>
                  {editMode && (
                    <p className="text-xs mt-1">Click "Add Contact" to create one</p>
                  )}
                </div>
              )
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Select a job number to view contacts</p>
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
      {(updateCustomerField.isPending || updateQuoteField.isPending || updateCustomerContact.isPending) && (
        <div className="fixed bottom-4 right-4 bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 shadow-lg">
          <Loader2 className="h-4 w-4 animate-spin" />
          Saving...
        </div>
      )}
    </div>
  );
}
