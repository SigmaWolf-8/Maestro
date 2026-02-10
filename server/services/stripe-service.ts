import Stripe from "stripe";
import { storage } from "../storage";
import { subscriptionService } from "./subscription-service";
import { billingService } from "./billing-service";
import { ledgerWitnessService } from "./ledger-witness-service";

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

function getStripeClient(): Stripe | null {
  if (!STRIPE_SECRET_KEY) return null;
  return new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2025-01-27.acacia" as any });
}

export class StripeService {
  private get stripe(): Stripe | null {
    return getStripeClient();
  }

  get isConfigured(): boolean {
    return !!STRIPE_SECRET_KEY;
  }

  get webhookSecretConfigured(): boolean {
    return !!STRIPE_WEBHOOK_SECRET;
  }

  async createCustomer(tenantId: string, email: string, name: string): Promise<string> {
    const stripe = this.stripe;
    if (!stripe) throw new Error("Stripe not configured. Set STRIPE_SECRET_KEY.");

    const customer = await stripe.customers.create({
      email,
      name,
      metadata: { tenantId },
    });

    const sub = await storage.getTenantSubscription(tenantId);
    if (sub) {
      await storage.updateTenantSubscription(sub.id, {
        stripeCustomerId: customer.id,
      });
    }

    return customer.id;
  }

  async syncProductsAndPrices(): Promise<{ synced: number; errors: string[] }> {
    const stripe = this.stripe;
    if (!stripe) throw new Error("Stripe not configured.");

    const plans = await storage.getSubscriptionPlans();
    let synced = 0;
    const errors: string[] = [];

    for (const plan of plans) {
      try {
        const existing = await storage.getStripeSyncRecords(plan.id);
        let syncRecord = existing.length > 0 ? existing[0] : null;

        let productId = syncRecord?.stripeProductId;
        if (!productId) {
          const product = await stripe.products.create({
            name: `The Maestro - ${plan.name}`,
            description: `${plan.name} subscription plan`,
            metadata: { planCode: plan.code, planId: String(plan.id) },
          });
          productId = product.id;
        }

        let monthlyPriceId = syncRecord?.stripePriceId;
        if (!monthlyPriceId && plan.basePriceMonthlyCents) {
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: plan.basePriceMonthlyCents,
            currency: "cad",
            recurring: { interval: "month" },
            metadata: { planCode: plan.code, interval: "monthly" },
          });
          monthlyPriceId = price.id;
        }

        let yearlyPriceId = syncRecord?.stripePriceIdYearly;
        if (!yearlyPriceId && plan.basePriceYearlyCents) {
          const price = await stripe.prices.create({
            product: productId,
            unit_amount: plan.basePriceYearlyCents,
            currency: "cad",
            recurring: { interval: "year" },
            metadata: { planCode: plan.code, interval: "yearly" },
          });
          yearlyPriceId = price.id;
        }

        if (syncRecord) {
          await storage.updateStripeSyncRecord(syncRecord.id, {
            stripeProductId: productId,
            stripePriceId: monthlyPriceId,
            stripePriceIdYearly: yearlyPriceId,
            syncStatus: "synced",
            syncedAt: new Date(),
          });
        } else {
          await storage.createStripeSyncRecord({
            planId: plan.id,
            stripeProductId: productId,
            stripePriceId: monthlyPriceId,
            stripePriceIdYearly: yearlyPriceId,
            syncStatus: "synced",
            syncAction: "create",
            syncedAt: new Date(),
          });
        }

        synced++;
      } catch (err: any) {
        errors.push(`Plan ${plan.code}: ${err.message}`);
      }
    }

    return { synced, errors };
  }

  async createSubscription(tenantId: string, planCode: string, billingInterval: "monthly" | "yearly" = "monthly"): Promise<{ subscriptionId: string; clientSecret: string | null }> {
    const stripe = this.stripe;
    if (!stripe) throw new Error("Stripe not configured.");

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub?.stripeCustomerId) {
      throw new Error("No Stripe customer ID. Create customer first.");
    }

    const plan = await storage.getSubscriptionPlanByCode(planCode);
    if (!plan) throw new Error(`Plan not found: ${planCode}`);

    const syncRecords = await storage.getStripeSyncRecords(plan.id);
    const syncRecord = syncRecords[0];
    if (!syncRecord) throw new Error(`Plan ${planCode} not synced to Stripe. Run sync first.`);

    const priceId = billingInterval === "yearly" ? syncRecord.stripePriceIdYearly : syncRecord.stripePriceId;
    if (!priceId) throw new Error(`No ${billingInterval} price for plan ${planCode}`);

    const perUserCents = plan.perUserPriceCents ?? 0;
    const includedUsers = plan.maxUsers ?? 1;
    const additionalUsers = Math.max(0, (sub.userSeats ?? 1) - includedUsers);

    const items: Stripe.SubscriptionCreateParams.Item[] = [
      { price: priceId },
    ];

    const stripeSub = await stripe.subscriptions.create({
      customer: sub.stripeCustomerId,
      items,
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        tenantId,
        planCode,
        additionalUsers: String(additionalUsers),
        perUserCents: String(perUserCents),
      },
    });

    await storage.updateTenantSubscription(sub.id, {
      stripeSubscriptionId: stripeSub.id,
      status: stripeSub.status === "active" ? "active" : "trialing",
    });

    const invoice = stripeSub.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;

    return {
      subscriptionId: stripeSub.id,
      clientSecret: paymentIntent?.client_secret || null,
    };
  }

  async cancelSubscription(tenantId: string, atPeriodEnd: boolean = true): Promise<void> {
    const stripe = this.stripe;
    if (!stripe) throw new Error("Stripe not configured.");

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub?.stripeSubscriptionId) throw new Error("No Stripe subscription found.");

    if (atPeriodEnd) {
      await stripe.subscriptions.update(sub.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });
    } else {
      await stripe.subscriptions.cancel(sub.stripeSubscriptionId);
    }

    await subscriptionService.cancelSubscription(tenantId, atPeriodEnd);
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<{ event: string; handled: boolean }> {
    const stripe = this.stripe;
    if (!stripe || !STRIPE_WEBHOOK_SECRET) {
      throw new Error("Stripe webhook not configured.");
    }

    const event = stripe.webhooks.constructEvent(payload, signature, STRIPE_WEBHOOK_SECRET);

    switch (event.type) {
      case "invoice.paid":
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        return { event: event.type, handled: true };

      case "invoice.payment_failed":
        await this.handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        return { event: event.type, handled: true };

      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        return { event: event.type, handled: true };

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        return { event: event.type, handled: true };

      default:
        return { event: event.type, handled: false };
    }
  }

  private async handleInvoicePaid(invoice: Stripe.Invoice) {
    const invoiceAny = invoice as any;
    const tenantId = invoiceAny.metadata?.tenantId || invoiceAny.subscription_details?.metadata?.tenantId;
    if (!tenantId) return;

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) return;

    if (sub.status !== "active") {
      await storage.updateTenantSubscription(sub.id, { status: "active" as any });
    }

    const invoices = await billingService.getInvoices(tenantId);
    const matchingInvoice = invoices.find(inv => inv.stripeInvoiceId === invoice.id);
    if (matchingInvoice) {
      await billingService.markInvoicePaid(matchingInvoice.id, invoice.id);
    }

    try {
      await ledgerWitnessService.witnessTransaction("algorand", {
        type: "stripe_invoice_paid",
        tenantId,
        stripeInvoiceId: invoice.id,
        amountPaid: invoice.amount_paid,
        currency: invoice.currency,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error("[WARN] Ledger witnessing failed for invoice payment:", err);
    }
  }

  private async handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceAny = invoice as any;
    const tenantId = invoiceAny.metadata?.tenantId || invoiceAny.subscription_details?.metadata?.tenantId;
    if (!tenantId) return;

    const sub = await storage.getTenantSubscription(tenantId);
    if (sub) {
      await storage.updateTenantSubscription(sub.id, { status: "past_due" as any });
    }
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub) return;

    const statusMap: Record<string, string> = {
      active: "active",
      past_due: "past_due",
      canceled: "canceled",
      trialing: "trialing",
      incomplete: "provisioning",
    };

    const newStatus = statusMap[subscription.status] || "active";
    await storage.updateTenantSubscription(sub.id, { status: newStatus as any });
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const tenantId = subscription.metadata?.tenantId;
    if (!tenantId) return;

    const sub = await storage.getTenantSubscription(tenantId);
    if (sub) {
      await storage.updateTenantSubscription(sub.id, { status: "canceled" as any });

      try {
        await ledgerWitnessService.witnessSubscriptionChange(tenantId, "canceled");
      } catch (err) {
        console.error("[WARN] Ledger witnessing failed for subscription cancellation:", err);
      }
    }
  }

  async getPaymentMethods(tenantId: string): Promise<Stripe.PaymentMethod[]> {
    const stripe = this.stripe;
    if (!stripe) return [];

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub?.stripeCustomerId) return [];

    const methods = await stripe.paymentMethods.list({
      customer: sub.stripeCustomerId,
      type: "card",
    });

    return methods.data;
  }

  async createSetupIntent(tenantId: string): Promise<{ clientSecret: string }> {
    const stripe = this.stripe;
    if (!stripe) throw new Error("Stripe not configured.");

    const sub = await storage.getTenantSubscription(tenantId);
    if (!sub?.stripeCustomerId) throw new Error("No Stripe customer.");

    const intent = await stripe.setupIntents.create({
      customer: sub.stripeCustomerId,
      payment_method_types: ["card"],
    });

    return { clientSecret: intent.client_secret! };
  }
}

export const stripeService = new StripeService();
