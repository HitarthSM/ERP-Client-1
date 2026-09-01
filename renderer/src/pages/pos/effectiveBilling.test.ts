import { describe, expect, it } from 'vitest';
import type { Customer, CustomerTypeRule } from '../../types';
import {
  creditSaleRequiresApproval,
  effectiveSkipOverLimitApproval,
} from './effectiveBilling';

describe('creditSaleRequiresApproval', () => {
  it('allows a sale that stays within the limit (equal to limit is ok)', () => {
    expect(creditSaleRequiresApproval(50_000, 0, 50_000, false)).toBe(false);
  });

  it('requires approval when the sale would push owed over the limit', () => {
    expect(creditSaleRequiresApproval(50_000, 0, 52_000, false)).toBe(true);
  });

  it('does not require approval when skip-over-limit exception is on', () => {
    expect(creditSaleRequiresApproval(50_000, 0, 52_000, true)).toBe(false);
  });

  it('after paying down, only the remaining room can be bought without approval', () => {
    const limit = 50_000;
    const owedAfterPay = 52_000 - 3_000; // 49,000
    const remaining = limit - owedAfterPay; // 1,000
    expect(remaining).toBe(1_000);
    expect(creditSaleRequiresApproval(limit, owedAfterPay, 1_000, false)).toBe(false);
    expect(creditSaleRequiresApproval(limit, owedAfterPay, 1_000.01, false)).toBe(true);
  });
});

describe('effectiveSkipOverLimitApproval', () => {
  const shopSkip: CustomerTypeRule = {
    id: 'r1',
    organizationId: 'o1',
    customerType: 'shop',
    discountPercent: 0,
    skipOverLimitApproval: true,
  };

  it('uses the customer flag when it is set', () => {
    const customer = { id: 'c1', skipOverLimitApproval: true } as Customer;
    expect(effectiveSkipOverLimitApproval(customer, 'regular', [shopSkip])).toBe(true);
  });

  it('customer false wins over a type rule that skips', () => {
    const customer = { id: 'c1', skipOverLimitApproval: false } as Customer;
    expect(effectiveSkipOverLimitApproval(customer, 'shop', [shopSkip])).toBe(false);
  });

  it('inherits skip from the bill customer type when the customer has no override', () => {
    const customer = { id: 'c1' } as Customer;
    expect(effectiveSkipOverLimitApproval(customer, 'shop', [shopSkip])).toBe(true);
    expect(effectiveSkipOverLimitApproval(customer, 'regular', [shopSkip])).toBe(false);
  });
});
