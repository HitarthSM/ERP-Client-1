import type { Customer, CustomerType, CustomerTypeRule } from '../../types';

export function effectiveDiscountPercent(
  customer: Customer | null | undefined,
  billType: CustomerType,
  rules: CustomerTypeRule[],
): number {
  if (customer?.discountPercent != null) return Number(customer.discountPercent);
  const rule = rules.find((r) => r.customerType === billType);
  return Number(rule?.discountPercent ?? 0);
}

export function effectiveSkipOverLimitApproval(
  customer: Customer | null | undefined,
  billType: CustomerType,
  rules: CustomerTypeRule[],
): boolean {
  if (customer?.skipOverLimitApproval != null) return Boolean(customer.skipOverLimitApproval);
  const rule = rules.find((r) => r.customerType === billType);
  return Boolean(rule?.skipOverLimitApproval);
}

/** Same rule as core-apis BillCompletionService.enforceCreditLimit. Equal to limit is allowed. */
export function creditSaleRequiresApproval(
  creditLimit: number,
  creditBalance: number,
  saleTotal: number,
  skipOverLimitApproval: boolean,
): boolean {
  if (skipOverLimitApproval) return false;
  if (!(creditLimit > 0)) return false;
  return creditBalance + saleTotal > creditLimit;
}

export function discountedRate(listRate: number, discountPercent: number): number {
  return Number((listRate * (1 - discountPercent / 100)).toFixed(4));
}
