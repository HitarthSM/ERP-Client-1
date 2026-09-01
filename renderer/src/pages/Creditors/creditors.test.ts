import { describe, it, expect } from 'vitest';
import type { Customer } from '../../types';
import { remainingCredit, outstandingCreditors } from './creditors';

function customer(partial: Partial<Customer> & { id: string }): Customer {
  return partial;
}

describe('outstandingCreditors', () => {
  it('keeps only customers who currently owe money, highest owed first', () => {
    const rows = outstandingCreditors([
      customer({ id: 'a', name: 'Ann', creditBalance: 0, creditLimit: 500 }),
      customer({ id: 'b', name: 'Ben', creditBalance: 80, creditLimit: 200 }),
      customer({ id: 'c', name: 'Cam', creditBalance: 250, creditLimit: 300 }),
      customer({ id: 'd', name: 'Dee' }),
    ]);

    expect(rows.map((c) => c.id)).toEqual(['c', 'b']);
  });
});

describe('remainingCredit', () => {
  it('is limit minus owed, including negative when over limit', () => {
    expect(remainingCredit(customer({ id: '1', creditLimit: 100, creditBalance: 40 }))).toBe(60);
    expect(remainingCredit(customer({ id: '2', creditLimit: 100, creditBalance: 150 }))).toBe(-50);
    expect(remainingCredit(customer({ id: '3' }))).toBe(0);
  });
});
