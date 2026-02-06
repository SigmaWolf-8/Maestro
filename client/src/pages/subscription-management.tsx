import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  CreditCard,
  Shield,
  Users,
  FolderKanban,
  HardDrive,
  Zap,
  Check,
  AlertTriangle,
  ArrowUpRight,
  Lock,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { SubscriptionPlan, TenantSubscription } from "@shared/schema";
import type { BillingCalculation, UsageSummary, UsageLimitStatus, CanadianProvinceTax } from "@shared/types/billing";

interface CurrentSubscriptionResponse {
  subscription: TenantSubscription;
  plan: SubscriptionPlan | null;
}

interface UsageResponse {
  summary: UsageSummary;
  limits: UsageLimitStatus[];
}

const formatCurrency = (cents: number | null | undefined): string => {
  if (cents == null) return "$0.00 CAD";
  return `$${(cents / 100).toFixed(2)} CAD`;
};

const FEATURE_LABELS: Record<string, string> = {
  wbsManagement: "WBS Management",
  documentManagement: "Document Management",
  basicReporting: "Basic Reporting",
  officeOnlineIntegration: "Office Online",
  aiAnalytics: "AI Analytics",
  advancedReporting: "Advanced Reporting",
  kongSecurityGateway: "Kong Security Gateway",
  plenumnetEncryption: "PlenumNET Encryption",
  smartInbox: "Smart Inbox",
  customIntegrations: "Custom Integrations",
  dedicatedPlenumNetNode: "Dedicated PlenumNET Node",
  quantumResistantAllOperations: "Quantum-Resistant Ops",
};

export default function SubscriptionManagement() {
  const [selectedProvince, setSelectedProvince] = useState<string>("");
  const { toast } = useToast();

  const { data: current, isLoading: currentLoading, error: currentError } = useQuery<CurrentSubscriptionResponse>({
    queryKey: ["/api/subscriptions/current"],
  });

  const { data: plans, isLoading: plansLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ["/api/subscriptions/plans"],
  });

  const { data: usage, isLoading: usageLoading } = useQuery<UsageResponse>({
    queryKey: ["/api/subscriptions/usage"],
  });

  const { data: provinces } = useQuery<CanadianProvinceTax[]>({
    queryKey: ["/api/subscriptions/provinces"],
  });

  const { data: calculation, isLoading: calcLoading } = useQuery<BillingCalculation>({
    queryKey: ["/api/subscriptions/calculate", selectedProvince],
    enabled: !!selectedProvince,
  });

  const changePlanMutation = useMutation({
    mutationFn: async (planCode: string) => {
      if (current?.subscription) {
        return apiRequest("PATCH", "/api/subscriptions/plan", { planCode });
      }
      return apiRequest("POST", "/api/subscriptions", { planCode, billingInterval: "monthly", userSeats: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/usage"] });
      toast({ title: "Plan updated", description: "Your subscription plan has been changed." });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to change plan. Please try again.", variant: "destructive" });
    },
  });

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "active": return "default";
      case "trialing": return "secondary";
      case "past_due": return "destructive";
      case "canceled": return "destructive";
      default: return "outline";
    }
  };

  if (currentError) {
    return (
      <div className="p-6" data-testid="page-subscription-management">
        <h1 className="text-2xl font-semibold mb-6" data-testid="text-page-title">Subscription Management</h1>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground" data-testid="text-error">No active subscription found. Select a plan below to get started.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6" data-testid="page-subscription-management">
      <div className="flex items-center gap-3 flex-wrap">
        <CreditCard className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-semibold" data-testid="text-page-title">Subscription Management</h1>
      </div>

      {currentLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-48 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
      ) : current?.subscription && current?.plan ? (
        <>
          <Card data-testid="card-current-plan">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-lg">Current Plan</CardTitle>
              <Badge variant={getStatusVariant(current.subscription.status)} data-testid="badge-subscription-status">
                {current.subscription.status}
              </Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Plan Name</span>
                  <span className="font-medium" data-testid="text-plan-name">{current.plan.name}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Billing Interval</span>
                  <span className="font-medium capitalize" data-testid="text-billing-interval">{current.subscription.billingInterval}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">User Seats</span>
                  <span className="font-medium" data-testid="text-user-seats">{current.subscription.userSeats}</span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Period Start</span>
                  <span className="font-medium flex items-center gap-1" data-testid="text-period-start">
                    <Calendar className="h-3 w-3" />
                    {current.subscription.currentPeriodStart
                      ? new Date(current.subscription.currentPeriodStart).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Period End</span>
                  <span className="font-medium flex items-center gap-1" data-testid="text-period-end">
                    <Calendar className="h-3 w-3" />
                    {current.subscription.currentPeriodEnd
                      ? new Date(current.subscription.currentPeriodEnd).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Security Mode</span>
                  <Badge variant="outline" data-testid="badge-security-mode">
                    <Shield className="h-3 w-3 mr-1" />
                    {current.subscription.securityMode || "zero"}
                  </Badge>
                </div>
              </div>
              {(current.subscription.lockedBasePriceCents != null || current.subscription.lockedPerUserPriceCents != null) && (
                <div className="mt-4 p-3 bg-muted/50 rounded-md flex items-start gap-2">
                  <Lock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">Locked Pricing</span>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      <span data-testid="text-locked-base-price">Base: {formatCurrency(current.subscription.lockedBasePriceCents)}</span>
                      <span data-testid="text-locked-per-user-price">Per User: {formatCurrency(current.subscription.lockedPerUserPriceCents)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {usageLoading ? (
            <Skeleton className="h-40 w-full rounded-md" />
          ) : usage ? (
            <Card data-testid="card-usage-summary">
              <CardHeader>
                <CardTitle className="text-lg">Usage Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {usage.limits.map((limit) => {
                    const icon = limit.metric === "users" ? <Users className="h-4 w-4" /> :
                      limit.metric === "projects" ? <FolderKanban className="h-4 w-4" /> :
                      limit.metric === "storage" ? <HardDrive className="h-4 w-4" /> :
                      <Zap className="h-4 w-4" />;
                    return (
                      <div key={limit.metric} className="flex flex-col gap-2" data-testid={`usage-metric-${limit.metric}`}>
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {icon}
                            <span className="text-sm font-medium capitalize">{limit.metric}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {limit.current} / {limit.limit === -1 ? "Unlimited" : limit.limit}
                            </span>
                            {limit.warningThreshold && (
                              <Badge variant="destructive" data-testid={`badge-warning-${limit.metric}`}>
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                {limit.percentUsed}%
                              </Badge>
                            )}
                            {limit.exceeded && (
                              <Badge variant="destructive" data-testid={`badge-exceeded-${limit.metric}`}>
                                Exceeded
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Progress
                          value={limit.limit === -1 ? 0 : Math.min(limit.percentUsed, 100)}
                          className="h-2"
                          data-testid={`progress-${limit.metric}`}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground" data-testid="text-no-subscription">No active subscription. Select a plan below to get started.</p>
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="text-xl font-semibold mb-4" data-testid="text-available-plans-title">Available Plans</h2>
        {plansLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-80 rounded-md" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {plans?.map((plan) => {
              const isCurrent = current?.plan?.code === plan.code;
              const features = (plan.features as Record<string, boolean>) || {};
              const enabledFeatures = Object.entries(features)
                .filter(([, v]) => v === true)
                .map(([k]) => FEATURE_LABELS[k] || k);

              return (
                <Card key={plan.id} className={isCurrent ? "border-primary" : ""} data-testid={`card-plan-${plan.code}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <CardTitle className="text-base">{plan.name}</CardTitle>
                      {isCurrent && <Badge data-testid={`badge-current-${plan.code}`}>Current</Badge>}
                    </div>
                    <div className="text-2xl font-bold" data-testid={`text-price-${plan.code}`}>
                      {formatCurrency(plan.basePriceMonthlyCents)}
                      <span className="text-sm font-normal text-muted-foreground">/mo</span>
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-3 w-3" />
                      <span>Up to {plan.maxUsers} users</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderKanban className="h-3 w-3" />
                      <span>{plan.maxProjects == null ? "Unlimited" : plan.maxProjects} projects</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <HardDrive className="h-3 w-3" />
                      <span>{plan.storageGb} GB storage</span>
                    </div>
                    <div className="border-t pt-2">
                      <ul className="flex flex-col gap-1">
                        {enabledFeatures.slice(0, 6).map((f) => (
                          <li key={f} className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Check className="h-3 w-3 text-green-600" />
                            {f}
                          </li>
                        ))}
                        {enabledFeatures.length > 6 && (
                          <li className="text-xs text-muted-foreground">+{enabledFeatures.length - 6} more</li>
                        )}
                      </ul>
                    </div>
                    {plan.plenumnetEnabled && (
                      <Badge variant="outline" className="self-start" data-testid={`badge-plenumnet-${plan.code}`}>
                        <Shield className="h-3 w-3 mr-1" />
                        PlenumNET: {plan.securityMode}
                      </Badge>
                    )}
                  </CardContent>
                  <CardFooter>
                    {!isCurrent && (
                      <Button
                        className="w-full"
                        onClick={() => changePlanMutation.mutate(plan.code)}
                        disabled={changePlanMutation.isPending}
                        data-testid={`button-upgrade-${plan.code}`}
                      >
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        {current?.subscription ? "Switch Plan" : "Select Plan"}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Card data-testid="card-tax-preview">
        <CardHeader>
          <CardTitle className="text-lg">Billing Calculation Preview</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm font-medium">Province for Tax Calculation:</span>
            <Select value={selectedProvince} onValueChange={setSelectedProvince} data-testid="select-province">
              <SelectTrigger className="w-48" data-testid="select-province-trigger">
                <SelectValue placeholder="Select province" />
              </SelectTrigger>
              <SelectContent>
                {provinces?.map((p) => (
                  <SelectItem key={p.code} value={p.code} data-testid={`option-province-${p.code}`}>
                    {p.name} ({p.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {calcLoading ? (
            <Skeleton className="h-24 rounded-md" />
          ) : calculation ? (
            <div className="border rounded-md p-4 flex flex-col gap-2" data-testid="section-billing-calculation">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Base Plan</span>
                <span data-testid="text-calc-base">{formatCurrency(calculation.basePlanCents)}</span>
              </div>
              {calculation.userChargesCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Additional Users ({calculation.additionalUsers})</span>
                  <span data-testid="text-calc-users">{formatCurrency(calculation.userChargesCents)}</span>
                </div>
              )}
              {calculation.overageChargesCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overage Charges</span>
                  <span data-testid="text-calc-overage">{formatCurrency(calculation.overageChargesCents)}</span>
                </div>
              )}
              {calculation.plenumnetChargesCents > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">PlenumNET Charges</span>
                  <span data-testid="text-calc-plenumnet">{formatCurrency(calculation.plenumnetChargesCents)}</span>
                </div>
              )}
              <div className="border-t pt-2 flex justify-between text-sm font-medium">
                <span>Subtotal</span>
                <span data-testid="text-calc-subtotal">{formatCurrency(calculation.subtotalCents)}</span>
              </div>
              {calculation.taxBreakdown && (
                <div className="flex flex-col gap-1 pl-4">
                  {calculation.taxBreakdown.gst > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>GST</span>
                      <span data-testid="text-calc-gst">{formatCurrency(calculation.taxBreakdown.gst)}</span>
                    </div>
                  )}
                  {calculation.taxBreakdown.hst > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>HST</span>
                      <span data-testid="text-calc-hst">{formatCurrency(calculation.taxBreakdown.hst)}</span>
                    </div>
                  )}
                  {calculation.taxBreakdown.pst > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>PST</span>
                      <span data-testid="text-calc-pst">{formatCurrency(calculation.taxBreakdown.pst)}</span>
                    </div>
                  )}
                  {calculation.taxBreakdown.qst > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>QST</span>
                      <span data-testid="text-calc-qst">{formatCurrency(calculation.taxBreakdown.qst)}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span data-testid="text-calc-tax">{formatCurrency(calculation.taxAmountCents)}</span>
              </div>
              <div className="border-t pt-2 flex justify-between font-bold">
                <span>Total</span>
                <span data-testid="text-calc-total">{formatCurrency(calculation.totalCents)}</span>
              </div>
            </div>
          ) : selectedProvince ? (
            <p className="text-sm text-muted-foreground">Unable to calculate billing for selected province.</p>
          ) : (
            <p className="text-sm text-muted-foreground">Select a province to preview billing calculations.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
