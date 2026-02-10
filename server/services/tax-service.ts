import type { CanadianProvinceTax, TaxBreakdown } from "../../shared/types/billing";

const CANADIAN_PROVINCES: Record<string, CanadianProvinceTax> = {
  AB: { code: "AB", name: "Alberta", gstRateBps: 500, hstRateBps: 0, pstRateBps: 0, qstRateBps: 0, regime: "GST" },
  BC: { code: "BC", name: "British Columbia", gstRateBps: 500, hstRateBps: 0, pstRateBps: 700, qstRateBps: 0, regime: "GST+PST" },
  MB: { code: "MB", name: "Manitoba", gstRateBps: 500, hstRateBps: 0, pstRateBps: 700, qstRateBps: 0, regime: "GST+PST" },
  NB: { code: "NB", name: "New Brunswick", gstRateBps: 0, hstRateBps: 1500, pstRateBps: 0, qstRateBps: 0, regime: "HST" },
  NL: { code: "NL", name: "Newfoundland and Labrador", gstRateBps: 0, hstRateBps: 1500, pstRateBps: 0, qstRateBps: 0, regime: "HST" },
  NS: { code: "NS", name: "Nova Scotia", gstRateBps: 0, hstRateBps: 1500, pstRateBps: 0, qstRateBps: 0, regime: "HST" },
  NT: { code: "NT", name: "Northwest Territories", gstRateBps: 500, hstRateBps: 0, pstRateBps: 0, qstRateBps: 0, regime: "GST" },
  NU: { code: "NU", name: "Nunavut", gstRateBps: 500, hstRateBps: 0, pstRateBps: 0, qstRateBps: 0, regime: "GST" },
  ON: { code: "ON", name: "Ontario", gstRateBps: 0, hstRateBps: 1300, pstRateBps: 0, qstRateBps: 0, regime: "HST" },
  PE: { code: "PE", name: "Prince Edward Island", gstRateBps: 0, hstRateBps: 1500, pstRateBps: 0, qstRateBps: 0, regime: "HST" },
  QC: { code: "QC", name: "Quebec", gstRateBps: 500, hstRateBps: 0, pstRateBps: 0, qstRateBps: 997, regime: "GST+QST" },
  SK: { code: "SK", name: "Saskatchewan", gstRateBps: 500, hstRateBps: 0, pstRateBps: 600, qstRateBps: 0, regime: "GST+PST" },
  YT: { code: "YT", name: "Yukon", gstRateBps: 500, hstRateBps: 0, pstRateBps: 0, qstRateBps: 0, regime: "GST" },
};

export class TaxService {
  getProvince(code: string): CanadianProvinceTax | undefined {
    return CANADIAN_PROVINCES[code.toUpperCase()];
  }

  getAllProvinces(): CanadianProvinceTax[] {
    return Object.values(CANADIAN_PROVINCES).sort((a, b) => a.name.localeCompare(b.name));
  }

  getTotalTaxRateBps(provinceCode: string): number {
    const province = this.getProvince(provinceCode);
    if (!province) return 500;
    if (province.regime === "HST") return province.hstRateBps;
    return province.gstRateBps + province.pstRateBps + province.qstRateBps;
  }

  calculateTax(subtotalCents: number, provinceCode: string): TaxBreakdown {
    const province = this.getProvince(provinceCode);
    if (!province) {
      const gst = Math.round((subtotalCents * 500) / 10000);
      return { gst, hst: 0, pst: 0, qst: 0, totalTaxCents: gst, province: provinceCode };
    }

    const gst = Math.round((subtotalCents * province.gstRateBps) / 10000);
    const hst = Math.round((subtotalCents * province.hstRateBps) / 10000);
    const pst = Math.round((subtotalCents * province.pstRateBps) / 10000);
    let qst = 0;
    if (province.qstRateBps > 0) {
      qst = Math.round((subtotalCents * province.qstRateBps) / 10000);
    }
    const totalTaxCents = gst + hst + pst + qst;
    return { gst, hst, pst, qst, totalTaxCents, province: province.code };
  }

  getProvinceRegimeLabel(provinceCode: string): string {
    const province = this.getProvince(provinceCode);
    if (!province) return "GST";
    return province.regime;
  }
}

export const taxService = new TaxService();
