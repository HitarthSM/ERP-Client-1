import { describe, it, expect } from 'vitest';
import { docNumber, formatSignedAmount, signedAmountLabel, typeFilterToApi } from './documentRow';

describe('docNumber', () => {
  it('prefers bill number then short id', () => {
    expect(docNumber({ billNumber: 'B-1', id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })).toBe('B-1');
    expect(docNumber({ billNumber: null, id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee' })).toBe('aaaaaaaa');
  });
});

describe('signedAmountLabel', () => {
  it('payments negative, sales/adjustments positive magnitude', () => {
    expect(signedAmountLabel({ type: 'payment', amount: 50 })).toBe(-50);
    expect(signedAmountLabel({ type: 'credit_sale', amount: 50 })).toBe(50);
    expect(signedAmountLabel({ type: 'adjustment', amount: 10 })).toBe(10);
  });
});

describe('formatSignedAmount', () => {
  it('places the sign before the formatted currency amount', () => {
    expect(formatSignedAmount(-50)).toBe('-$50.00');
    expect(formatSignedAmount(50)).toBe('+$50.00');
    expect(formatSignedAmount(0)).toBe('$0.00');
  });
});

describe('typeFilterToApi', () => {
  it('maps UI filter to API type or undefined', () => {
    expect(typeFilterToApi('all')).toBeUndefined();
    expect(typeFilterToApi('credit_sale')).toBe('credit_sale');
    expect(typeFilterToApi('payment')).toBe('payment');
    expect(typeFilterToApi('adjustment')).toBe('adjustment');
  });
});
