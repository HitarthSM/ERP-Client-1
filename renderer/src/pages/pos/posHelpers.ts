import type { CustomerType, Product } from "../../types";

export type Mode = "sales" | "purchase";
export type PrintDoc = "receipt" | "debtor" | "statement" | "delivery";
export type PriceTier = "p1" | "p2" | "p3" | "p4";

export interface BillLine {
  id: number;
  productId: string;
  sku: string;
  name: string;
  qty: number;
  rate: number;
  taxPct: number;
  unitLabel: string;
  officialRate: number;
  /** Tier prices shown in sales order grid */
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  activeTier?: PriceTier;
  storeCode?: string;
  /** Product manufacturer/brand — shown in purchase line items table */
  manufacturer?: string;
  /** Product pack size — units per pack, null when sold individually */
  packSize?: number;
}

export function customerTypeToTier(ct: CustomerType | string): PriceTier {
  switch (ct) {
    case "shop":
    case "big_customer":
      return "p3";
    case "regular":
      return "p2";
    case "new":
    default:
      return "p1";
  }
}

export function tierPriceFromProduct(p: Product, tier: PriceTier): number {
  switch (tier) {
    case "p1":
      return Number(p.retailPrice ?? 0);
    case "p2":
      return Number(p.loyaltyPrice ?? p.retailPrice ?? 0);
    case "p3":
      return Number(p.wholesalePrice ?? p.retailPrice ?? 0);
    case "p4":
      return Number(p.transferPrice ?? p.costPrice ?? 0);
  }
}

export function productTierPrices(p: Product) {
  return {
    p1: tierPriceFromProduct(p, "p1"),
    p2: tierPriceFromProduct(p, "p2"),
    p3: tierPriceFromProduct(p, "p3"),
    p4: tierPriceFromProduct(p, "p4"),
  };
}

export interface ExtraCharge {
  id: number;
  label: string;
  amount: number;
}

export function fmt(n: number) {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function lineTax(l: BillLine) {
  return (l.qty * l.rate * l.taxPct) / 100;
}

export function lineTotal(l: BillLine) {
  return l.qty * l.rate + lineTax(l);
}

export function productRate(p: Product, mode: Mode): number {
  if (mode === "purchase")
    return Number(p.costPrice ?? p.wholesalePrice ?? p.retailPrice ?? 0);
  return Number(p.retailPrice ?? p.wholesalePrice ?? p.costPrice ?? 0);
}
