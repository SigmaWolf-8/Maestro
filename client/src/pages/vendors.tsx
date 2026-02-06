import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Search,
  User,
  MapPin,
  Phone,
  Mail,
  Edit,
  Plus,
  Loader2,
  Star,
  Truck,
  FileText,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
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
import { Textarea } from "@/components/ui/textarea";
import type { Vendor, VendorContact, VendorWithContacts } from "@shared/schema";

const isValidEmail = (email: string): boolean => {
  if (!email || email.trim() === "") return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

export default function VendorsForm() {
  const { toast } = useToast();
  
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [emailData, setEmailData] = useState({ to: "", subject: "", body: "" });
  const [currentContactIndex, setCurrentContactIndex] = useState(0);

  const { data: allVendors, isLoading: vendorsLoading } = useQuery<Vendor[]>({
    queryKey: ["/api/vendors"],
  });

  const { data: vendorData, isLoading: dataLoading, refetch: refetchData } = useQuery<VendorWithContacts | null>({
    queryKey: ["/api/vendors", selectedVendorId],
    enabled: !!selectedVendorId,
  });

  const updateVendorField = useMutation({
    mutationFn: async ({ field, value }: { field: string; value: any }) => {
      return apiRequest("PATCH", `/api/vendors/${selectedVendorId}/field`, { field, value });
    },
    onSuccess: () => {
      refetchData();
      toast({ title: "Saved", description: "Vendor field updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateContact = useMutation({
    mutationFn: async ({ contactId, updates }: { contactId: string; updates: Partial<VendorContact> }) => {
      return apiRequest("PATCH", `/api/vendor-contacts/${contactId}`, updates);
    },
    onSuccess: () => {
      refetchData();
      toast({ title: "Saved", description: "Contact updated" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const createVendor = useMutation({
    mutationFn: async (company: string) => {
      const tenantId = allVendors?.[0]?.tenantId;
      return apiRequest("POST", "/api/vendors", { tenantId, company });
    },
    onSuccess: async (response) => {
      const vendor = await response.json();
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      setSelectedVendorId(vendor.id);
      setShowCreateDialog(false);
      setNewCompanyName("");
      toast({ title: "Created", description: `Vendor created successfully` });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const seedData = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/vendors/seed", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendors"] });
      toast({ title: "Sample Data Added", description: "Sample vendors have been created" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const sendEmail = useMutation({
    mutationFn: async (data: { to: string; subject: string; body: string }) => {
      const trimmedData = {
        to: data.to.trim(),
        subject: data.subject.trim(),
        body: data.body,
      };
      if (!isValidEmail(trimmedData.to)) {
        throw new Error("Please enter a valid email address");
      }
      return apiRequest("POST", "/api/email/send", trimmedData);
    },
    onSuccess: () => {
      setShowEmailDialog(false);
      setEmailData({ to: "", subject: "", body: "" });
      toast({ title: "Email Sent", description: "Email has been sent successfully" });
    },
    onError: (error: any) => {
      let errorMessage = "Failed to send email";
      let errorTitle = "Error";
      try {
        const message = error.message || "";
        if (message.includes("{")) {
          const jsonPart = message.substring(message.indexOf("{"));
          const parsed = JSON.parse(jsonPart);
          if (parsed.message) {
            errorMessage = parsed.message;
          } else if (parsed.details?.to) {
            errorMessage = parsed.details.to[0] || "Invalid email address";
          } else if (parsed.error) {
            errorMessage = parsed.error;
          }
          if (parsed.error === "Microsoft 365 not connected") {
            errorTitle = "Microsoft 365 Required";
            errorMessage = "Please connect your Microsoft 365 account in Settings to send emails";
          }
        } else if (message.includes("401")) {
          errorTitle = "Microsoft 365 Required";
          errorMessage = "Please connect your Microsoft 365 account in Settings to send emails";
        } else {
          errorMessage = message;
        }
      } catch {
        errorMessage = error.message || "Failed to send email";
      }
      toast({ title: errorTitle, description: errorMessage, variant: "destructive" });
    },
  });

  const handleFieldBlur = useCallback((field: string, value: any) => {
    if (!selectedVendorId || !editMode) return;
    
    const currentValue = vendorData?.vendor?.[field as keyof Vendor];
    if (value !== currentValue) {
      updateVendorField.mutate({ field, value });
    }
  }, [selectedVendorId, editMode, vendorData, updateVendorField]);

  const handleContactFieldBlur = useCallback((contactId: string, field: string, value: any) => {
    if (!editMode) return;
    updateContact.mutate({ contactId, updates: { [field]: value } });
  }, [editMode, updateContact]);

  const filteredVendors = allVendors?.filter(v => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return (
      v.company.toLowerCase().includes(search) ||
      v.vendorId?.toLowerCase().includes(search) ||
      v.city?.toLowerCase().includes(search)
    );
  });

  const vendor = vendorData?.vendor;
  const contacts = vendorData?.contacts || [];
  
  // Reset contact index when vendor changes or if index is out of bounds
  const safeContactIndex = contacts.length > 0 ? Math.min(currentContactIndex, contacts.length - 1) : 0;
  const currentContact = contacts[safeContactIndex] || null;
  const hasMultipleContacts = contacts.length > 1;

  const navigateContact = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && safeContactIndex > 0) {
      setCurrentContactIndex(safeContactIndex - 1);
    } else if (direction === 'next' && safeContactIndex < contacts.length - 1) {
      setCurrentContactIndex(safeContactIndex + 1);
    }
  };

  const openEmailDialog = () => {
    const contactEmail = currentContact?.emailAddress?.trim() || "";
    setEmailData({
      to: contactEmail,
      subject: "",
      body: "",
    });
    if (!contactEmail) {
      toast({ 
        title: "No Email Address", 
        description: "This contact doesn't have an email address. Please enter one manually.",
        variant: "default"
      });
    }
    setShowEmailDialog(true);
  };

  return (
    <div className="flex flex-col gap-4 p-4" data-testid="page-vendors">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight" data-testid="text-vendors-title">
            Vendors & Pricing
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor information and contacts.
          </p>
        </div>
        <div className="flex gap-2">
          {(!allVendors || allVendors.length === 0) && (
            <Button
              variant="secondary"
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
            onClick={() => setEditMode(!editMode)}
            data-testid="button-edit-mode"
          >
            <Edit className="mr-2 h-4 w-4" />
            {editMode ? "Editing" : "Edit Fields"}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)} data-testid="button-add-vendor">
            <Plus className="mr-2 h-4 w-4" />
            New Vendor
          </Button>
        </div>
      </div>

      {/* Compact Vendor Search/Select */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="w-72">
          <Select
            value={selectedVendorId || ""}
            onValueChange={(value) => {
              setSelectedVendorId(value);
              setCurrentContactIndex(0);
            }}
          >
            <SelectTrigger id="vendorSelect" data-testid="select-vendor">
              <SelectValue placeholder="Choose a vendor..." />
            </SelectTrigger>
            <SelectContent>
              {vendorsLoading ? (
                <SelectItem value="loading" disabled>Loading...</SelectItem>
              ) : filteredVendors?.length === 0 ? (
                <SelectItem value="none" disabled>No vendors found</SelectItem>
              ) : (
                filteredVendors?.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.vendorId ? `${v.vendorId} - ` : ""}{v.company}
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
              id="vendorSearch"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9"
              data-testid="input-vendor-search"
            />
          </div>
        </div>
      </div>

      {selectedVendorId && (
        <>
          {dataLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          ) : vendor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Building2 className="h-4 w-4" />
                    Company Information
                    <div className="ml-auto flex gap-1">
                      {vendor.matVendor && <Badge variant="secondary" className="text-xs">Material</Badge>}
                      {vendor.subtrade && <Badge variant="outline" className="text-xs">Subtrade</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3 pt-0">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label htmlFor="vendorId" className="text-xs">Vendor ID</Label>
                      <Input
                        id="vendorId"
                        defaultValue={vendor.vendorId || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("vendorId", e.target.value)}
                        className="h-8"
                        data-testid="input-vendor-id"
                      />
                    </div>
                    <div className="col-span-2">
                      <Label htmlFor="company" className="text-xs">Company Name</Label>
                      <Input
                        id="company"
                        defaultValue={vendor.company}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("company", e.target.value)}
                        className="h-8"
                        data-testid="input-company"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="text-xs">Address</Label>
                    <Input
                      id="address"
                      defaultValue={vendor.address || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("address", e.target.value)}
                      className="h-8"
                      data-testid="input-address"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label htmlFor="city" className="text-xs">City</Label>
                      <Input
                        id="city"
                        defaultValue={vendor.city || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("city", e.target.value)}
                        className="h-8"
                        data-testid="input-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stateProvince" className="text-xs">Province</Label>
                      <Input
                        id="stateProvince"
                        defaultValue={vendor.stateProvince || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("stateProvince", e.target.value)}
                        className="h-8"
                        data-testid="input-state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zipPostalCode" className="text-xs">Postal Code</Label>
                      <Input
                        id="zipPostalCode"
                        defaultValue={vendor.zipPostalCode || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("zipPostalCode", e.target.value)}
                        className="h-8"
                        data-testid="input-zip"
                      />
                    </div>
                    <div>
                      <Label htmlFor="countryRegion" className="text-xs">Country</Label>
                      <Input
                        id="countryRegion"
                        defaultValue={vendor.countryRegion || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("countryRegion", e.target.value)}
                        className="h-8"
                        data-testid="input-country"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label htmlFor="apTerms" className="text-xs">AP Terms</Label>
                      <Input
                        id="apTerms"
                        defaultValue={vendor.apTerms || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("apTerms", e.target.value)}
                        className="h-8"
                        data-testid="input-ap-terms"
                      />
                    </div>
                    <div>
                      <Label htmlFor="arTerms" className="text-xs">AR Terms</Label>
                      <Input
                        id="arTerms"
                        defaultValue={vendor.arTerms || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("arTerms", e.target.value)}
                        className="h-8"
                        data-testid="input-ar-terms"
                      />
                    </div>
                    <div>
                      <Label htmlFor="gstNum" className="text-xs">GST #</Label>
                      <Input
                        id="gstNum"
                        defaultValue={vendor.gstNum || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("gstNum", e.target.value)}
                        className="h-8"
                        data-testid="input-gst-num"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wcbNum" className="text-xs">WCB #</Label>
                      <Input
                        id="wcbNum"
                        defaultValue={vendor.wcbNum || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("wcbNum", e.target.value)}
                        className="h-8"
                        data-testid="input-wcb-num"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 pt-1">
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="matVendor"
                        checked={vendor.matVendor || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("matVendor", checked)}
                        data-testid="checkbox-mat-vendor"
                      />
                      <Label htmlFor="matVendor" className="text-xs">Material Vendor</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="subtrade"
                        checked={vendor.subtrade || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("subtrade", checked)}
                        data-testid="checkbox-subtrade"
                      />
                      <Label htmlFor="subtrade" className="text-xs">Subtrade</Label>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Checkbox
                        id="includeInPayroll"
                        checked={vendor.includeInPayroll || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("includeInPayroll", checked)}
                        data-testid="checkbox-payroll"
                      />
                      <Label htmlFor="includeInPayroll" className="text-xs">Payroll</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    <span>Contact {hasMultipleContacts && `(${safeContactIndex + 1}/${contacts.length})`}</span>
                    {currentContact?.isPrimary && <Badge variant="secondary" className="text-xs">Primary</Badge>}
                    <div className="ml-auto flex items-center gap-1">
                      {hasMultipleContacts && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateContact('prev')}
                            disabled={safeContactIndex === 0}
                            data-testid="button-prev-contact"
                          >
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigateContact('next')}
                            disabled={safeContactIndex === contacts.length - 1}
                            data-testid="button-next-contact"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {currentContact && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={openEmailDialog}
                          data-testid="button-send-email"
                        >
                          <Send className="mr-1 h-3 w-3" />
                          Email
                        </Button>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 px-4 pb-3 pt-0">
                  {currentContact ? (
                    <>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="contactFirstName" className="text-xs">First Name</Label>
                          <Input
                            id="contactFirstName"
                            key={`firstName-${currentContact.id}`}
                            defaultValue={currentContact.firstName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "firstName", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-first-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactLastName" className="text-xs">Last Name</Label>
                          <Input
                            id="contactLastName"
                            key={`lastName-${currentContact.id}`}
                            defaultValue={currentContact.lastName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "lastName", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-last-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactJobTitle" className="text-xs">Job Title</Label>
                          <Input
                            id="contactJobTitle"
                            key={`jobTitle-${currentContact.id}`}
                            defaultValue={currentContact.jobTitle || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "jobTitle", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-job-title"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <Label htmlFor="contactBusinessPhone" className="text-xs">Business Phone</Label>
                          <Input
                            id="contactBusinessPhone"
                            key={`businessPhone-${currentContact.id}`}
                            defaultValue={currentContact.businessPhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "businessPhone", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-business-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactMobilePhone" className="text-xs">Mobile Phone</Label>
                          <Input
                            id="contactMobilePhone"
                            key={`mobilePhone-${currentContact.id}`}
                            defaultValue={currentContact.mobilePhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "mobilePhone", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-mobile-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactEmail" className="text-xs">Email</Label>
                          <Input
                            id="contactEmail"
                            type="email"
                            key={`email-${currentContact.id}`}
                            defaultValue={currentContact.emailAddress || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(currentContact.id, "emailAddress", e.target.value)}
                            className="h-8"
                            data-testid="input-contact-email"
                          />
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No contact assigned</p>
                      <Button variant="outline" size="sm" className="mt-2" disabled={!editMode}>
                        <Plus className="mr-1 h-3 w-3" />
                        Add Contact
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="py-3 px-4">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Star className="h-4 w-4" />
                    Ratings (1-5)
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-3 pt-0">
                  <div className="grid grid-cols-5 gap-2">
                    <div>
                      <Label htmlFor="rateReliability" className="text-xs">Reliability</Label>
                      <Input
                        id="rateReliability"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateReliability || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateReliability", parseInt(e.target.value) || null)}
                        className="h-8"
                        data-testid="input-rate-reliability"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateQuality" className="text-xs">Quality</Label>
                      <Input
                        id="rateQuality"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateQuality || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateQuality", parseInt(e.target.value) || null)}
                        className="h-8"
                        data-testid="input-rate-quality"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateSpeed" className="text-xs">Speed</Label>
                      <Input
                        id="rateSpeed"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateSpeed || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateSpeed", parseInt(e.target.value) || null)}
                        className="h-8"
                        data-testid="input-rate-speed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ratePricing" className="text-xs">Pricing</Label>
                      <Input
                        id="ratePricing"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.ratePricing || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("ratePricing", parseInt(e.target.value) || null)}
                        className="h-8"
                        data-testid="input-rate-pricing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateCongeniality" className="text-xs">Congeniality</Label>
                      <Input
                        id="rateCongeniality"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateCongeniality || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateCongeniality", parseInt(e.target.value) || null)}
                        className="h-8"
                        data-testid="input-rate-congeniality"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Building2 className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p>Vendor not found</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedVendorId && !vendorsLoading && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Truck className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg mb-2">Select a vendor to view details</p>
            <p className="text-sm">Use the dropdown above to choose a vendor from the list</p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Vendor</DialogTitle>
            <DialogDescription>
              Create a new vendor record.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="newCompanyName">Company Name</Label>
              <Input
                id="newCompanyName"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Enter company name..."
                data-testid="input-new-company-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createVendor.mutate(newCompanyName)}
              disabled={!newCompanyName.trim() || createVendor.isPending}
              data-testid="button-create-vendor"
            >
              {createVendor.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Vendor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showEmailDialog} onOpenChange={setShowEmailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Send Email to Vendor
            </DialogTitle>
            <DialogDescription>
              Compose and send an email to the vendor contact.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="emailTo">To</Label>
              <Input
                id="emailTo"
                type="email"
                value={emailData.to}
                onChange={(e) => setEmailData({ ...emailData, to: e.target.value })}
                placeholder="recipient@email.com"
                data-testid="input-email-to"
              />
            </div>
            <div>
              <Label htmlFor="emailSubject">Subject</Label>
              <Input
                id="emailSubject"
                value={emailData.subject}
                onChange={(e) => setEmailData({ ...emailData, subject: e.target.value })}
                placeholder="Email subject..."
                data-testid="input-email-subject"
              />
            </div>
            <div>
              <Label htmlFor="emailBody">Message</Label>
              <Textarea
                id="emailBody"
                value={emailData.body}
                onChange={(e) => setEmailData({ ...emailData, body: e.target.value })}
                placeholder="Type your message..."
                rows={6}
                data-testid="input-email-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEmailDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => sendEmail.mutate(emailData)}
              disabled={!isValidEmail(emailData.to) || !emailData.subject.trim() || sendEmail.isPending}
              data-testid="button-send-email-confirm"
            >
              {sendEmail.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
