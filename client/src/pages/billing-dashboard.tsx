import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Receipt,
  DollarSign,
  FileText,
  Zap,
  AlertCircle,
  BookOpen,
  Plus,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SubscriptionInvoice } from "@shared/schema";
import type { UsageSummary, UsageLimitStatus, CanadianProvinceTax } from "@shared/types/billing";

const formatCurrency = (cents: number | null | undefined): string => {
  if (cents == null) return "$0.00 CAD";
  return `$${(cents / 100).toFixed(2)} CAD`;
};

export default function BillingDashboard({ embedded = false }: { embedded?: boolean }) {
  const [generateOpen, setGenerateOpen] = useState(false);
  const [invoiceProvince, setInvoiceProvince] = useState("ON");
  const { toast } = useToast();

  const { data: invoices, isLoading: invoicesLoading, error: invoicesError } = useQuery<SubscriptionInvoice[]>({
    queryKey: ["/api/billing/invoices"],
  });

  const { data: usageSummary, isLoading: usageLoading } = useQuery<UsageSummary>({
    queryKey: ["/api/billing/usage/summary"],
  });

  const { data: usageLimits } = useQuery<UsageLimitStatus[]>({
    queryKey: ["/api/billing/usage/limits"],
  });

  const { data: provinces } = useQuery<CanadianProvinceTax[]>({
    queryKey: ["/api/subscriptions/provinces"],
  });

  const generateMutation = useMutation({
    mutationFn: async (province: string) => {
      return apiRequest("POST", "/api/billing/invoices/generate", { province });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      setGenerateOpen(false);
      toast({ title: "Invoice generated", description: "A new invoice has been created." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to generate invoice.", variant: "destructive" });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/billing/invoices/${invoiceId}/pay`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      toast({ title: "Invoice paid", description: "Invoice has been marked as paid." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to mark invoice as paid.", variant: "destructive" });
    },
  });

  const witnessMutation = useMutation({
    mutationFn: async (invoiceId: number) => {
      return apiRequest("POST", `/api/billing/invoices/${invoiceId}/witness`, { provider: "algorand" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/billing/invoices"] });
      toast({ title: "Witnessed", description: "Invoice has been witnessed on the ledger." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to witness invoice.", variant: "destructive" });
    },
  });

  const totalInvoiced = invoices?.reduce((sum, inv) => sum + (inv.amountDueCents || 0), 0) ?? 0;
  const totalPaid = invoices?.reduce((sum, inv) => sum + (inv.amountPaidCents || 0), 0) ?? 0;
  const outstanding = totalInvoiced - totalPaid;

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" data-testid="badge-status-paid">Paid</Badge>;
      case "overdue":
        return <Badge variant="destructive" data-testid="badge-status-overdue">Overdue</Badge>;
      case "draft":
        return <Badge variant="secondary" data-testid="badge-status-draft">Draft</Badge>;
      default:
        return <Badge variant="outline" data-testid={`badge-status-${status}`}>{status || "Unknown"}</Badge>;
    }
  };

  return (
    <div className={embedded ? "flex flex-col gap-3" : "p-6 flex flex-col gap-6"} data-testid="page-billing-dashboard">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!embedded && (
          <div className="flex items-center gap-3">
            <Receipt className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold" data-testid="text-page-title">Billing & Invoices</h1>
          </div>
        )}
        <Button onClick={() => setGenerateOpen(true)} size={embedded ? "sm" : "default"} data-testid="button-generate-invoice">
          <Plus className="h-4 w-4 mr-1" />
          Generate Invoice
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="card-total-invoiced">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoiced</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {invoicesLoading ? <Skeleton className="h-8 w-32 rounded-md" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-invoiced">{formatCurrency(totalInvoiced)}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-total-paid">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {invoicesLoading ? <Skeleton className="h-8 w-32 rounded-md" /> : (
              <div className="text-2xl font-bold" data-testid="text-total-paid">{formatCurrency(totalPaid)}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-outstanding">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {invoicesLoading ? <Skeleton className="h-8 w-32 rounded-md" /> : (
              <div className="text-2xl font-bold" data-testid="text-outstanding">{formatCurrency(outstanding)}</div>
            )}
          </CardContent>
        </Card>
        <Card data-testid="card-api-calls">
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Calls (Month)</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {usageLoading ? <Skeleton className="h-8 w-32 rounded-md" /> : (
              <div className="text-2xl font-bold" data-testid="text-api-calls">
                {usageSummary?.apiCallsThisMonth?.toLocaleString() ?? "0"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-invoices-table">
        <CardHeader>
          <CardTitle className="text-lg">Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-12 w-full rounded-md" />)}
            </div>
          ) : invoicesError ? (
            <p className="text-muted-foreground" data-testid="text-invoices-error">Failed to load invoices.</p>
          ) : !invoices?.length ? (
            <p className="text-muted-foreground" data-testid="text-no-invoices">No invoices found. Generate your first invoice above.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Amount Due</TableHead>
                    <TableHead>Amount Paid</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Province</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id} data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell data-testid={`text-invoice-id-${invoice.id}`}>#{invoice.id}</TableCell>
                      <TableCell data-testid={`text-invoice-date-${invoice.id}`}>
                        {invoice.createdAt ? new Date(invoice.createdAt).toLocaleDateString() : "N/A"}
                      </TableCell>
                      <TableCell data-testid={`text-invoice-due-${invoice.id}`}>{formatCurrency(invoice.amountDueCents)}</TableCell>
                      <TableCell data-testid={`text-invoice-paid-${invoice.id}`}>{formatCurrency(invoice.amountPaidCents)}</TableCell>
                      <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                      <TableCell data-testid={`text-invoice-province-${invoice.id}`}>{invoice.province || "N/A"}</TableCell>
                      <TableCell>
                        <div className="flex gap-2 flex-wrap">
                          {invoice.status !== "paid" && (
                            <Button
                              size="sm"
                              onClick={() => markPaidMutation.mutate(invoice.id)}
                              disabled={markPaidMutation.isPending}
                              data-testid={`button-pay-${invoice.id}`}
                            >
                              <DollarSign className="h-3 w-3 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => witnessMutation.mutate(invoice.id)}
                            disabled={witnessMutation.isPending}
                            data-testid={`button-witness-${invoice.id}`}
                          >
                            <BookOpen className="h-3 w-3 mr-1" />
                            Witness
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

      <Card data-testid="card-usage-metrics">
        <CardHeader>
          <CardTitle className="text-lg">Usage Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {usageLoading ? (
            <Skeleton className="h-40 w-full rounded-md" />
          ) : usageLimits?.length ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Limit</TableHead>
                    <TableHead>% Used</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usageLimits.map((limit) => (
                    <TableRow key={limit.metric} data-testid={`row-limit-${limit.metric}`}>
                      <TableCell className="capitalize font-medium" data-testid={`text-limit-metric-${limit.metric}`}>{limit.metric}</TableCell>
                      <TableCell data-testid={`text-limit-current-${limit.metric}`}>{limit.current.toLocaleString()}</TableCell>
                      <TableCell data-testid={`text-limit-max-${limit.metric}`}>{limit.limit === -1 ? "Unlimited" : limit.limit.toLocaleString()}</TableCell>
                      <TableCell data-testid={`text-limit-percent-${limit.metric}`}>{limit.percentUsed}%</TableCell>
                      <TableCell>
                        {limit.exceeded ? (
                          <Badge variant="destructive">Exceeded</Badge>
                        ) : limit.warningThreshold ? (
                          <Badge variant="destructive">Warning</Badge>
                        ) : (
                          <Badge variant="secondary">OK</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : usageSummary ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex flex-col gap-1" data-testid="metric-active-users">
                <span className="text-sm text-muted-foreground">Active Users</span>
                <span className="text-lg font-medium">{usageSummary.activeUsers}</span>
              </div>
              <div className="flex flex-col gap-1" data-testid="metric-projects">
                <span className="text-sm text-muted-foreground">Current Projects</span>
                <span className="text-lg font-medium">{usageSummary.currentProjects}</span>
              </div>
              <div className="flex flex-col gap-1" data-testid="metric-storage">
                <span className="text-sm text-muted-foreground">Storage Used (GB)</span>
                <span className="text-lg font-medium">{usageSummary.storageUsedGb}</span>
              </div>
              <div className="flex flex-col gap-1" data-testid="metric-api-calls">
                <span className="text-sm text-muted-foreground">API Calls</span>
                <span className="text-lg font-medium">{usageSummary.apiCallsThisMonth?.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">No usage data available.</p>
          )}
        </CardContent>
      </Card>

      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent data-testid="dialog-generate-invoice">
          <DialogHeader>
            <DialogTitle>Generate Invoice</DialogTitle>
            <DialogDescription>
              Generate a new invoice for the current billing period.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Province</label>
              <Select value={invoiceProvince} onValueChange={setInvoiceProvince}>
                <SelectTrigger data-testid="select-invoice-province-trigger">
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {provinces?.map((p) => (
                    <SelectItem key={p.code} value={p.code} data-testid={`option-invoice-province-${p.code}`}>
                      {p.name} ({p.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenerateOpen(false)} data-testid="button-cancel-generate">
              Cancel
            </Button>
            <Button
              onClick={() => generateMutation.mutate(invoiceProvince)}
              disabled={generateMutation.isPending}
              data-testid="button-confirm-generate"
            >
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
