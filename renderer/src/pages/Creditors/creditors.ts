import type { Customer } from '../../types';

export function remainingCredit(c: Customer): number {
  return (c.creditLimit ?? 0) - (c.creditBalance ?? 0);
}

/** People who currently owe money, highest owed first. */
export function outstandingCreditors(customers: Customer[]): Customer[] {
  return customers
    .filter((c) => (c.creditBalance ?? 0) > 0)
    .sort((a, b) => (b.creditBalance ?? 0) - (a.creditBalance ?? 0));
}
