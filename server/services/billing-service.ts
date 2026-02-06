import { storage } from "../storage";
import type { SubscriptionInvoice } from "@shared/schema";
import { subscriptionService } from "./subscription-service";
import type { InvoiceLineItem } from "../../shared/types/billing";

export class BillingService {
  async getInvoices(tenantId: string): Promise<SubscriptionInvoice[]> {
    return storage.getSubscriptionInvoices(tenantId);
  }

  async getInvoice(id: number): Promise<SubscriptionInvoice | undefined> {
    return storage.getSubscriptionInvoice(id);
  }

  async generateInvoice(tenantId: string, province: string = "ON"): Promise<SubscriptionInvoice> {
    const billing = await subscriptionService.calculateBilling(tenantId, province);
    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) throw new Error("No subscription found");

    const plan = await storage.getSubscriptionPlan(sub.planId);

    const lineItems: InvoiceLineItem[] = [
      {
        description: `${plan?.name ?? "Plan"} - Base`,
        amount: billing.basePlanCents,
        quantity: 1,
        unitPrice: billing.basePlanCents,
        category: "base",
      },
    ];

    if (billing.additionalUsers > 0) {
      lineItems.push({
        description: `Additional Users (${billing.additionalUsers})`,
        amount: billing.userChargesCents,
        quantity: billing.additionalUsers,
        unitPrice: sub.lockedPerUserPriceCents ?? plan?.perUserPriceCents ?? 0,
        category: "users",
      });
    }

    if (billing.taxAmountCents > 0) {
      lineItems.push({
        description: `Tax (${province})`,
        amount: billing.taxAmountCents,
        quantity: 1,
        unitPrice: billing.taxAmountCents,
        category: "tax",
      });
    }

    return storage.createSubscriptionInvoice({
      tenantSubscriptionId: sub.id,
      tenantId,
      amountDueCents: billing.totalCents,
      amountPaidCents: 0,
      taxAmountCents: billing.taxAmountCents,
      currency: "CAD",
      status: "draft",
      lineItems,
      periodStart: sub.currentPeriodStart,
      periodEnd: sub.currentPeriodEnd,
      province,
      taxBreakdown: billing.taxBreakdown ?? {},
    });
  }

  async markInvoicePaid(id: number, stripeInvoiceId?: string): Promise<SubscriptionInvoice> {
    const invoice = await storage.getSubscriptionInvoice(id);
    if (!invoice) throw new Error("Invoice not found");

    const updates: Partial<SubscriptionInvoice> = {
      status: "paid",
      amountPaidCents: invoice.amountDueCents,
    };
    if (stripeInvoiceId) {
      updates.stripeInvoiceId = stripeInvoiceId;
    }

    return (await storage.updateSubscriptionInvoice(id, updates))!;
  }
}

export const billingService = new BillingService();
