import { describe, expect, it } from 'vitest';
import type { Bill } from '../../types';
import type { CustomerCreditTransaction } from '../../types';
import { buildCreditorStatement, withRunningBalance } from './statement';

function bill(partial: Partial<Bill> & { id: string }): Bill {
  return {
    billNumber: partial.billNumber ?? partial.id,
    organizationId: 'o1',
    locationId: 'l1',
    createdById: 'u1',
    status: 'COMPLETED',
    subtotal: 0,
    taxAmount: 0,
    discountAmount: 0,
    totalAmount: 0,
    ...partial,
  };
}

function tx(
  partial: Partial<CustomerCreditTransaction> & { id: string },
): CustomerCreditTransaction {
  return {
    customerId: 'c1',
    type: 'payment',
    amount: 0,
    balanceBefore: 0,
    balanceAfter: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  };
}

describe('buildCreditorStatement', () => {
  it('puts a credit sale as one receipt row (no line items)', () => {
    const rows = buildCreditorStatement(
      [
        bill({
          id: 'b1',
          billNumber: '3001',
          saleType: 'credit',
          totalAmount: 52000,
          billedAt: '2026-03-01T10:00:00.000Z',
        }),
      ],
      [],
    );
    expect(rows).toEqual([
      {
        kind: 'receipt',
        date: '2026-03-01T10:00:00.000Z',
        receiptNumber: '3001',
        amount: 52000,
        billId: 'b1',
      },
    ]);
  });

  it('puts a payment as a dated cash/bank row', () => {
    const rows = buildCreditorStatement(
      [],
      [
        tx({
          id: 't1',
          type: 'payment',
          amount: 3000,
          paymentMethod: 'bank_transfer',
          createdAt: '2026-03-05T12:00:00.000Z',
        }),
      ],
    );
    expect(rows).toEqual([
      {
        kind: 'payment',
        date: '2026-03-05T12:00:00.000Z',
        amount: 3000,
        method: 'bank_transfer',
      },
    ]);
  });

  it('skips non-credit bills, drafts, and non-payment transactions', () => {
    const rows = buildCreditorStatement(
      [
        bill({ id: 'cash', billNumber: '1', saleType: 'normal', totalAmount: 10 }),
        bill({
          id: 'draft',
          billNumber: '2',
          saleType: 'credit',
          status: 'DRAFT',
          totalAmount: 10,
        }),
      ],
      [tx({ id: 'adj', type: 'adjustment', amount: 5 })],
    );
    expect(rows).toEqual([]);
  });

  it('sorts oldest first so the statement reads like a ledger', () => {
    const rows = buildCreditorStatement(
      [
        bill({
          id: 'b2',
          billNumber: '3002',
          saleType: 'credit',
          totalAmount: 100,
          billedAt: '2026-03-10T00:00:00.000Z',
        }),
      ],
      [
        tx({
          id: 't1',
          amount: 40,
          paymentMethod: 'cash',
          createdAt: '2026-03-04T00:00:00.000Z',
        }),
      ],
    );
    expect(rows.map((r) => r.kind)).toEqual(['payment', 'receipt']);
  });
});

describe('withRunningBalance', () => {
  it('puts credit sales in debit and payments in credit, ending at current owed', () => {
    const rows = buildCreditorStatement(
      [
        bill({
          id: 'b1',
          billNumber: '3001',
          saleType: 'credit',
          totalAmount: 52_000,
          billedAt: '2026-03-01T00:00:00.000Z',
        }),
      ],
      [
        tx({
          id: 't1',
          amount: 3_000,
          paymentMethod: 'bank_transfer',
          createdAt: '2026-03-05T00:00:00.000Z',
        }),
      ],
    );
    const ledger = withRunningBalance(rows, 49_000);
    expect(ledger).toEqual([
      {
        date: '2026-03-01T00:00:00.000Z',
        invNo: '3001',
        description: 'Credit sale',
        debit: 52_000,
        credit: 0,
        balance: 52_000,
      },
      {
        date: '2026-03-05T00:00:00.000Z',
        invNo: '',
        description: 'Bank Payment',
        debit: 0,
        credit: 3_000,
        balance: 49_000,
      },
    ]);
  });

  it('uses an opening balance when displayed rows are only part of the account', () => {
    const rows = buildCreditorStatement(
      [
        bill({
          id: 'b1',
          billNumber: '3001',
          saleType: 'credit',
          totalAmount: 52_000,
          billedAt: '2026-03-01T00:00:00.000Z',
        }),
      ],
      [],
    );
    const ledger = withRunningBalance(rows, 62_000);
    expect(ledger[0]?.balance).toBe(62_000);
  });
});
