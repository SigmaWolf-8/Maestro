import { storage } from "../storage";
import type { PricingConfigEntry } from "../../shared/types/billing";
import { DEFAULT_PRICING_CONFIG } from "../../shared/types/billing";

export class PricingConfigService {
  async getValue(key: string): Promise<string | undefined> {
    const config = await storage.getPricingConfig(key);
    return config?.value;
  }

  async getIntValue(key: string, fallback: number = 0): Promise<number> {
    const val = await this.getValue(key);
    return val !== undefined ? parseInt(val, 10) : fallback;
  }

  async getBoolValue(key: string, fallback: boolean = false): Promise<boolean> {
    const val = await this.getValue(key);
    return val !== undefined ? val === "true" : fallback;
  }

  async getJsonValue<T>(key: string, fallback: T): Promise<T> {
    const val = await this.getValue(key);
    if (val === undefined) return fallback;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }

  async setValue(key: string, value: string, valueType: string = "string", visibility: string = "PRIVATE", description?: string, updatedBy?: string): Promise<void> {
    await storage.upsertPricingConfig({
      key,
      value,
      valueType,
      visibility,
      description,
      updatedBy,
    });
  }

  async getPublicConfigs(): Promise<PricingConfigEntry[]> {
    const configs = await storage.getPricingConfigs("PUBLIC");
    return configs.map(c => ({
      key: c.key,
      value: c.value,
      valueType: c.valueType as PricingConfigEntry["valueType"],
      visibility: c.visibility as "PUBLIC" | "PRIVATE",
      description: c.description ?? undefined,
    }));
  }

  async getAllConfigs(): Promise<PricingConfigEntry[]> {
    const configs = await storage.getPricingConfigs();
    return configs.map(c => ({
      key: c.key,
      value: c.value,
      valueType: c.valueType as PricingConfigEntry["valueType"],
      visibility: c.visibility as "PUBLIC" | "PRIVATE",
      description: c.description ?? undefined,
    }));
  }

  async seedDefaults(): Promise<void> {
    for (const entry of DEFAULT_PRICING_CONFIG) {
      const existing = await storage.getPricingConfig(entry.key);
      if (!existing) {
        await storage.upsertPricingConfig({
          key: entry.key,
          value: entry.value,
          valueType: entry.valueType,
          visibility: entry.visibility,
          description: entry.description,
        });
      }
    }
  }

  async deleteConfig(key: string): Promise<boolean> {
    return storage.deletePricingConfig(key);
  }
}

export const pricingConfigService = new PricingConfigService();
