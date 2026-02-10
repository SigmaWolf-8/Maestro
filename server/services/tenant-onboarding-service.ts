import { storage } from "../storage";
import { subscriptionService } from "./subscription-service";
import { pricingConfigService } from "./pricing-config-service";
import type { OnboardingResult, OnboardingStep } from "../../shared/types/billing";
import type { BillingInterval } from "../../shared/types/subscriptions";

export class TenantOnboardingService {
  async onboardTenant(
    companyName: string,
    contactEmail: string,
    planCode: string = "essentials",
    billingInterval: BillingInterval = "monthly",
    adminEmail?: string,
    province?: string
  ): Promise<OnboardingResult> {
    const steps: OnboardingStep[] = [];
    let tenantId = "";
    let adminUserId = "";
    let subscriptionId = 0;

    try {
      steps.push({ step: 1, name: "Create Tenant", status: "in_progress" });
      const tenant = await storage.createTenant({
        subdomain: companyName.toLowerCase().replace(/[^a-z0-9]/g, "-").substring(0, 30),
        companyName,
        contactEmail,
        onboardingComplete: false,
        instanceStatus: "active",
      });
      tenantId = tenant.id;
      steps[0].status = "complete";

      steps.push({ step: 2, name: "Create Admin User", status: "in_progress" });
      const user = await storage.createTenantUser({
        tenantId,
        email: adminEmail ?? contactEmail,
        role: "admin",
        isActive: true,
      });
      adminUserId = user.id;
      steps[1].status = "complete";

      steps.push({ step: 3, name: "Create Subscription", status: "in_progress" });
      const sub = await subscriptionService.createSubscription(tenantId, planCode, billingInterval);
      subscriptionId = sub.id;
      steps[2].status = "complete";

      steps.push({ step: 4, name: "Seed Navigation", status: "in_progress" });
      const { seedNavigationForTenant } = await import("../storage");
      await seedNavigationForTenant(tenantId);
      steps[3].status = "complete";

      steps.push({ step: 5, name: "Complete Onboarding", status: "in_progress" });
      await storage.updateTenant(tenantId, { onboardingComplete: true });
      steps[4].status = "complete";

      return {
        success: true,
        tenantId,
        adminUserId,
        subscriptionId,
        loginUrl: `/`,
        steps,
        nextActions: [
          "Configure company branding",
          "Invite team members",
          "Create first project",
          "Set up WBS dimensions",
        ],
      };
    } catch (error: any) {
      const lastStep = steps[steps.length - 1];
      if (lastStep) {
        lastStep.status = "error";
        lastStep.details = error.message;
      }

      return {
        success: false,
        tenantId,
        adminUserId,
        subscriptionId,
        loginUrl: "",
        steps,
        nextActions: ["Resolve onboarding error and retry"],
      };
    }
  }
}

export const tenantOnboardingService = new TenantOnboardingService();
