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

export default function VendorsForm() {
  const { toast } = useToast();
  
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [emailData, setEmailData] = useState({ to: "", subject: "", body: "" });

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
      return apiRequest("POST", "/api/email/send", data);
    },
    onSuccess: () => {
      setShowEmailDialog(false);
      setEmailData({ to: "", subject: "", body: "" });
      toast({ title: "Email Sent", description: "Email has been sent successfully" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
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
  const primaryContact = vendorData?.primaryContact;
  const contacts = vendorData?.contacts || [];

  const openEmailDialog = () => {
    if (primaryContact?.emailAddress) {
      setEmailData({
        to: primaryContact.emailAddress,
        subject: "",
        body: "",
      });
    }
    setShowEmailDialog(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6" data-testid="page-vendors">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendors & Pricing</h1>
          <p className="text-muted-foreground">
            Manage vendor information, contacts, and communications.
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Vendor Selection
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="vendorSearch">Search Vendors</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="vendorSearch"
                  placeholder="Search by company name, ID, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-vendor-search"
                />
              </div>
            </div>
            <div className="w-80">
              <Label htmlFor="vendorSelect">Select Vendor</Label>
              <Select
                value={selectedVendorId || ""}
                onValueChange={(value) => setSelectedVendorId(value)}
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
          </div>
        </CardContent>
      </Card>

      {selectedVendorId && (
        <>
          {dataLoading ? (
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-96 w-full" />
              </CardContent>
            </Card>
          ) : vendor ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    Company Information
                    <div className="ml-auto flex gap-2">
                      {vendor.matVendor && <Badge variant="secondary">Material Vendor</Badge>}
                      {vendor.subtrade && <Badge variant="outline">Subtrade</Badge>}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="vendorId">Vendor ID</Label>
                      <Input
                        id="vendorId"
                        defaultValue={vendor.vendorId || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("vendorId", e.target.value)}
                        data-testid="input-vendor-id"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        defaultValue={vendor.company}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("company", e.target.value)}
                        data-testid="input-company"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      defaultValue={vendor.address || ""}
                      disabled={!editMode}
                      onBlur={(e) => handleFieldBlur("address", e.target.value)}
                      data-testid="input-address"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        defaultValue={vendor.city || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("city", e.target.value)}
                        data-testid="input-city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="stateProvince">State/Province</Label>
                      <Input
                        id="stateProvince"
                        defaultValue={vendor.stateProvince || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("stateProvince", e.target.value)}
                        data-testid="input-state"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="zipPostalCode">ZIP/Postal Code</Label>
                      <Input
                        id="zipPostalCode"
                        defaultValue={vendor.zipPostalCode || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("zipPostalCode", e.target.value)}
                        data-testid="input-zip"
                      />
                    </div>
                    <div>
                      <Label htmlFor="countryRegion">Country/Region</Label>
                      <Input
                        id="countryRegion"
                        defaultValue={vendor.countryRegion || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("countryRegion", e.target.value)}
                        data-testid="input-country"
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="apTerms">AP Terms</Label>
                      <Input
                        id="apTerms"
                        defaultValue={vendor.apTerms || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("apTerms", e.target.value)}
                        data-testid="input-ap-terms"
                      />
                    </div>
                    <div>
                      <Label htmlFor="arTerms">AR Terms</Label>
                      <Input
                        id="arTerms"
                        defaultValue={vendor.arTerms || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("arTerms", e.target.value)}
                        data-testid="input-ar-terms"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="gstNum">GST Number</Label>
                      <Input
                        id="gstNum"
                        defaultValue={vendor.gstNum || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("gstNum", e.target.value)}
                        data-testid="input-gst-num"
                      />
                    </div>
                    <div>
                      <Label htmlFor="wcbNum">WCB Number</Label>
                      <Input
                        id="wcbNum"
                        defaultValue={vendor.wcbNum || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("wcbNum", e.target.value)}
                        data-testid="input-wcb-num"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="matVendor"
                        checked={vendor.matVendor || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("matVendor", checked)}
                        data-testid="checkbox-mat-vendor"
                      />
                      <Label htmlFor="matVendor">Material Vendor</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="subtrade"
                        checked={vendor.subtrade || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("subtrade", checked)}
                        data-testid="checkbox-subtrade"
                      />
                      <Label htmlFor="subtrade">Subtrade</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="includeInPayroll"
                        checked={vendor.includeInPayroll || false}
                        disabled={!editMode}
                        onCheckedChange={(checked) => handleFieldBlur("includeInPayroll", checked)}
                        data-testid="checkbox-payroll"
                      />
                      <Label htmlFor="includeInPayroll">Include in Payroll</Label>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Primary Contact
                    {primaryContact && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="ml-auto"
                        onClick={openEmailDialog}
                        data-testid="button-send-email"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Send Email
                      </Button>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {primaryContact ? (
                    <>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contactFirstName">First Name</Label>
                          <Input
                            id="contactFirstName"
                            defaultValue={primaryContact.firstName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(primaryContact.id, "firstName", e.target.value)}
                            data-testid="input-contact-first-name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactLastName">Last Name</Label>
                          <Input
                            id="contactLastName"
                            defaultValue={primaryContact.lastName || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(primaryContact.id, "lastName", e.target.value)}
                            data-testid="input-contact-last-name"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="contactJobTitle">Job Title</Label>
                        <Input
                          id="contactJobTitle"
                          defaultValue={primaryContact.jobTitle || ""}
                          disabled={!editMode}
                          onBlur={(e) => handleContactFieldBlur(primaryContact.id, "jobTitle", e.target.value)}
                          data-testid="input-contact-job-title"
                        />
                      </div>

                      <Separator />

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="contactBusinessPhone">Business Phone</Label>
                          <Input
                            id="contactBusinessPhone"
                            defaultValue={primaryContact.businessPhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(primaryContact.id, "businessPhone", e.target.value)}
                            data-testid="input-contact-business-phone"
                          />
                        </div>
                        <div>
                          <Label htmlFor="contactMobilePhone">Mobile Phone</Label>
                          <Input
                            id="contactMobilePhone"
                            defaultValue={primaryContact.mobilePhone || ""}
                            disabled={!editMode}
                            onBlur={(e) => handleContactFieldBlur(primaryContact.id, "mobilePhone", e.target.value)}
                            data-testid="input-contact-mobile-phone"
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="contactEmail">Email Address</Label>
                        <Input
                          id="contactEmail"
                          type="email"
                          defaultValue={primaryContact.emailAddress || ""}
                          disabled={!editMode}
                          onBlur={(e) => handleContactFieldBlur(primaryContact.id, "emailAddress", e.target.value)}
                          data-testid="input-contact-email"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No primary contact assigned</p>
                      <Button variant="outline" className="mt-4" disabled={!editMode}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5" />
                    Vendor Ratings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-5 gap-4">
                    <div>
                      <Label htmlFor="rateReliability">Reliability (1-5)</Label>
                      <Input
                        id="rateReliability"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateReliability || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateReliability", parseInt(e.target.value) || null)}
                        data-testid="input-rate-reliability"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateQuality">Quality (1-5)</Label>
                      <Input
                        id="rateQuality"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateQuality || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateQuality", parseInt(e.target.value) || null)}
                        data-testid="input-rate-quality"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateSpeed">Speed (1-5)</Label>
                      <Input
                        id="rateSpeed"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateSpeed || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateSpeed", parseInt(e.target.value) || null)}
                        data-testid="input-rate-speed"
                      />
                    </div>
                    <div>
                      <Label htmlFor="ratePricing">Pricing (1-5)</Label>
                      <Input
                        id="ratePricing"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.ratePricing || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("ratePricing", parseInt(e.target.value) || null)}
                        data-testid="input-rate-pricing"
                      />
                    </div>
                    <div>
                      <Label htmlFor="rateCongeniality">Congeniality (1-5)</Label>
                      <Input
                        id="rateCongeniality"
                        type="number"
                        min="1"
                        max="5"
                        defaultValue={vendor.rateCongeniality || ""}
                        disabled={!editMode}
                        onBlur={(e) => handleFieldBlur("rateCongeniality", parseInt(e.target.value) || null)}
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
              disabled={!emailData.to || !emailData.subject || sendEmail.isPending}
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
