import type { Bill } from '../../types';
import type { CustomerCreditTransaction } from '../../types';

export type CreditorStatementRow =
  | {
      kind: 'receipt';
      date: string;
      receiptNumber: string;
      amount: number;
      billId: string;
    }
  | {
      kind: 'payment';
      date: string;
      amount: number;
      method: string;
    };

function asRecord(value: object): Record<string, unknown> {
  return value as Record<string, unknown>;
}

function receiptNumber(bill: Bill): string {
  const extra = asRecord(bill);
  return bill.billNumber || String(extra.billNumber ?? extra.billNumber ?? bill.id);
}

function billDate(bill: Bill): string {
  const extra = asRecord(bill);
  return bill.billedAt || bill.createdAt || String(extra.billedAt ?? extra.createdAt ?? '');
}

function saleTypeOf(bill: Bill): string {
  const extra = asRecord(bill);
  return String(bill.saleType ?? extra.saleType ?? 'normal');
}

function paymentMethodOf(tx: CustomerCreditTransaction): string {
  const extra = asRecord(tx);
  return String(tx.paymentMethod ?? extra.paymentMethod ?? 'other');
}

export function buildCreditorStatement(
  bills: Bill[],
  transactions: CustomerCreditTransaction[],
): CreditorStatementRow[] {
  const receipts: CreditorStatementRow[] = bills
    .filter((b) => saleTypeOf(b) === 'credit')
    .filter((b) => String(b.status).toUpperCase() === 'COMPLETED')
    .map((b) => ({
      kind: 'receipt' as const,
      date: billDate(b),
      receiptNumber: receiptNumber(b),
      amount: Number(b.totalAmount ?? 0),
      billId: b.id,
    }));

  const payments: CreditorStatementRow[] = transactions
    .filter((t) => t.type === 'payment')
    .map((t) => ({
      kind: 'payment' as const,
      date: t.createdAt,
      amount: Number(t.amount ?? 0),
      method: paymentMethodOf(t),
    }));

  return [...receipts, ...payments].sort((a, b) => a.date.localeCompare(b.date));
}

export type CreditorLedgerRow = {
  date: string;
  invNo: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

function paymentDescription(method: string): string {
  if (method === 'bank_transfer') return 'Bank Payment';
  if (method === 'cash') return 'Cash Payment';
  return 'Payment';
}

export function withRunningBalance(rows: CreditorStatementRow[], currentOwed: number): CreditorLedgerRow[] {
  const net = rows.reduce((sum, row) => sum + (row.kind === 'receipt' ? row.amount : -row.amount), 0);
  let running = currentOwed - net;
  return rows.map((row) => {
    const debit = row.kind === 'receipt' ? row.amount : 0;
    const credit = row.kind === 'payment' ? row.amount : 0;
    running += debit - credit;
    return {
      date: row.date,
      invNo: row.kind === 'receipt' ? row.receiptNumber : '',
      description: row.kind === 'receipt' ? 'Credit sale' : paymentDescription(row.method),
      debit,
      credit,
      balance: running,
    };
  });
}
