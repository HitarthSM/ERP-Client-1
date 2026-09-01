import type { CreditTransactionDocument } from '../../types';
import { fmt } from '../pos/posHelpers';

export type DocumentTypeFilter = 'all' | 'credit_sale' | 'payment' | 'adjustment';

export function docNumber(row: Pick<CreditTransactionDocument, 'billNumber' | 'id'>): string {
  if (row.billNumber) return row.billNumber;
  return row.id.slice(0, 8);
}

export function signedAmountLabel(row: Pick<CreditTransactionDocument, 'type' | 'amount'>): number {
  if (row.type === 'payment') return -row.amount;
  return row.amount;
}

export function formatSignedAmount(amount: number): string {
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  return `${sign}${fmt(Math.abs(amount))}`;
}

export function typeFilterToApi(
  filter: DocumentTypeFilter,
): 'credit_sale' | 'payment' | 'adjustment' | undefined {
  if (filter === 'all') return undefined;
  return filter;
}
