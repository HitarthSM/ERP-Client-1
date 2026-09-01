# Customer Profile & Credit Management — Implementation Plan

**Date:** 2026-08-19
**Spec:** `docs/superpowers/specs/2026-08-19-customer-profile-credit-management-design.md`
**Repos:** `core-apis` + `ERP-Client`

---

## Task 1 — Migration: add `note` and `payment_method` to `customer_credit_transactions`

**Repo:** `core-apis`

**Files:**
- NEW `src/infrastructure/persistence/migrations/1800000000004-migration.ts`
- EDIT `src/infrastructure/persistence/entities/customer-credit-transaction.entity.ts`

**What to do:**

1. Add two columns to `CustomerCreditTransactionEntity`:
   - `note?: string` — nullable varchar(500), `@Column({ nullable: true })`
   - `paymentMethod?: string` — nullable varchar(50), `@Column({ name: 'payment_method', nullable: true })`

2. New migration file (timestamp `1800000000004`):
```sql
ALTER TABLE "core"."customer_credit_transactions"
  ADD COLUMN "note" character varying(500),
  ADD COLUMN "payment_method" character varying(50);
```
Down: `DROP COLUMN` both.

**Verification:** Migration runs without error. Entity compiles.

---

## Task 2 — Domain model + repo: expose `note` and `paymentMethod`

**Repo:** `core-apis`

**Files:**
- EDIT `src/application/modules/credit-approvals/domain/customer-credit-transaction.model.ts`
- EDIT `src/application/modules/credit-approvals/mapper/credit-approval.profile.ts`

**What to do:**

1. Add `note?: string` and `paymentMethod?: string` to `CustomerCreditTransaction` domain model.
2. Ensure automapper profile maps `CustomerCreditTransactionEntity → CustomerCreditTransaction` includes these fields (add explicit `forMember` if `@AutoMap` doesn't pick them up).

---

## Task 3 — New command: `CreateCreditTransactionCommand`

**Repo:** `core-apis`

**Files (all new):**
- `src/application/modules/customers/commands/create-credit-transaction/create-credit-transaction.command.ts`
- `src/application/modules/customers/commands/create-credit-transaction/create-credit-transaction.command-handler.ts`
- `src/application/modules/customers/commands/create-credit-transaction/index.ts`

**Command shape:**
```ts
export class CreateCreditTransactionCommand {
  customerId: string;
  organizationId: string;
  type: 'payment' | 'adjustment';
  amount: number;           // always positive for payment; signed for adjustment
  paymentMethod?: string;   // required when type = payment
  note?: string;
  performedById?: string;
}
```

**Handler logic:**
1. Load customer by `customerId`, assert `customer.organizationId === command.organizationId`
2. `balanceBefore = customer.creditBalance`
3. If `type === 'payment'`: `newBalance = balanceBefore - command.amount` (amount must be > 0, throw `BadRequestException` if not)
4. If `type === 'adjustment'`: `newBalance = balanceBefore + command.amount` (signed, can be negative)
5. `balanceAfter = newBalance`
6. Save `CustomerCreditTransaction` row with all fields including `note`, `paymentMethod`, `performedById`, `balanceBefore`, `balanceAfter`
7. Update `customer.creditBalance = newBalance` via customer repo
8. Return saved `CustomerCreditTransaction`

**Inject:** `CUSTOMER_REPO`, `CUSTOMER_CREDIT_TRANSACTION_REPO` (already defined constants).

**Update:** Add `CreateCreditTransactionCommand` and handler to `src/application/modules/customers/commands/index.ts`.

---

## Task 4 — New queries: list customer bills + list credit transactions

**Repo:** `core-apis`

**Files (all new):**
- `src/application/modules/customers/queries/list-customer-bills/list-customer-bills.query.ts`
- `src/application/modules/customers/queries/list-customer-bills/list-customer-bills.query-handler.ts`
- `src/application/modules/customers/queries/list-customer-bills/index.ts`
- `src/application/modules/customers/queries/list-customer-credit-transactions/list-customer-credit-transactions.query.ts`
- `src/application/modules/customers/queries/list-customer-credit-transactions/list-customer-credit-transactions.query-handler.ts`
- `src/application/modules/customers/queries/list-customer-credit-transactions/index.ts`

**List customer bills query:**
- Fields: `customerId`, `organizationId`, `excludeBlack: boolean`, `$page`, `$perPage`
- Handler: use existing `IBillRepo.findManyAsync` with filter `{ customerId, organizationId }`. If `excludeBlack`, add `saleType != 'black'` to filter.
- Returns `IPageable<Bill>`

**List credit transactions query:**
- Fields: `customerId`, `organizationId`, `$page`, `$perPage`
- Handler: use `ICustomerCreditTransactionRepo.findManyAsync` with filter `{ customerId }`, ordered by `createdAt DESC`
- Returns `IPageable<CustomerCreditTransaction>`

**Update:** Add both new query handlers to `src/application/modules/customers/queries/index.ts`.

---

## Task 5 — New response DTO: `CustomerCreditTransactionResponse`

**Repo:** `core-apis`

**Files:**
- NEW `src/application/modules/customers/models/responses/customer-credit-transaction.response.ts`
- EDIT `src/application/modules/customers/models/responses/index.ts` — export it
- EDIT `src/application/modules/customers/mapper/customer.profile.ts` — add `createMap(mapper, CustomerCreditTransaction, CustomerCreditTransactionResponse)`

**Response fields:**
```ts
id: string
customerId: string
type: string          // 'credit_sale' | 'payment' | 'adjustment'
amount: number
balanceBefore: number
balanceAfter: number
billId?: string
paymentMethod?: string
note?: string
performedById?: string
createdAt: Date
```

---

## Task 6 — `CustomerResponse`: add computed `creditStatus`

**Repo:** `core-apis`

**Files:**
- EDIT `src/application/modules/customers/models/responses/customer.response.ts` — add `creditStatus?: string`
- EDIT `src/application/modules/customers/mapper/customer.profile.ts` — after `createMap(mapper, Customer, CustomerResponse)` add `afterMap` to compute and set `creditStatus`:
  - `none` → no creditLimit or creditLimit = 0
  - `available` → creditBalance < creditLimit * 0.9
  - `warning` → creditBalance >= creditLimit * 0.9 && creditBalance < creditLimit
  - `over` → creditBalance >= creditLimit

---

## Task 7 — Customers controller: 3 new endpoints

**Repo:** `core-apis`

**Files:**
- EDIT `src/application/modules/customers/customers.controller.ts`
- EDIT `src/application/modules/customers/customers.module.ts` — inject `IBillRepo` and `ICustomerCreditTransactionRepo` providers

**Endpoint 1 — List customer bills:**
```
GET /v1/customers/:id/bills
@Roles: all authenticated (ClerkAuthGuard only, no RolesGuard)
```
- Load customer, `assertOrgOwnership`
- Determine `excludeBlack`: true unless user role is `OrgAdmin | OrgManager | SuperAdmin`
- Dispatch `ListCustomerBillsQuery`
- Return paginated `BillResponse[]`

**Endpoint 2 — List customer credit transactions:**
```
GET /v1/customers/:id/credit-transactions
@Roles: all authenticated
```
- Load customer, `assertOrgOwnership`
- Dispatch `ListCustomerCreditTransactionsQuery`
- Return paginated `CustomerCreditTransactionResponse[]`

**Endpoint 3 — Create credit transaction:**
```
POST /v1/customers/:id/credit-transactions
@Roles: all authenticated (role split handled in handler/command via request body type)
```
- Body: `CreateCreditTransactionRequest` — `{ type, amount, paymentMethod?, note? }`
- Validate: if `type === 'adjustment'`, check `user.role` is `StoreManager | OrgManager | OrgAdmin | SuperAdmin`, else throw `ForbiddenException`
- Dispatch `CreateCreditTransactionCommand`
- Return updated `CustomerResponse`

**Update module:** Add `IBillRepo` (token `BILL_REPO`) and `ICustomerCreditTransactionRepo` (token `CUSTOMER_CREDIT_TRANSACTION_REPO`) to `CustomersModule` providers — follow same pattern as `CreditApprovalsModule`.

---

## Task 8 — Frontend types

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/types.ts`

**Add:**
```ts
export type CreditStatus = 'none' | 'available' | 'warning' | 'over';

export interface CustomerCreditTransaction {
  id: string;
  customerId: string;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  billId?: string | null;
  paymentMethod?: string | null;
  note?: string | null;
  performedById?: string | null;
  createdAt: string;
}
```

**Edit `Customer` interface:** add `creditStatus?: CreditStatus`

---

## Task 9 — Frontend API hooks

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/api.ts` — extend the `Customers` export

**Add to `Customers` object:**
```ts
useGetBills(customerId, page?)        // GET /customers/:id/bills?$page=N
useGetCreditTransactions(customerId, page?)  // GET /customers/:id/credit-transactions?$page=N
useRecordCreditTransaction(customerId)       // POST /customers/:id/credit-transactions
                                             // on success: invalidate ['customers', customerId]
```

Pattern: follow existing `Bills.useSearch` / `Bills.useTransition` patterns in `api.ts`.

---

## Task 10 — Customer Detail page

**Repo:** `ERP-Client`

**Files:**
- NEW `renderer/src/pages/CustomerDetail/index.tsx`

**Layout:**
```
┌─────────────────────┬────────────────────────────────┐
│  Profile + Credit   │  Tabs: Bills | Transactions    │
│  Summary            │  (paginated tables)             │
│  [Record Payment]   │                                 │
│  [Adjust Credit]    │                                 │
└─────────────────────┴────────────────────────────────┘
```

**Left panel:**
- Fetch customer via `Customers.useGetById(id)` (existing hook)
- Show: name, phone, email, GSTIN, type badge, discount %, created date
- Credit card: Limit / Balance / Available / Skip-approval chip
- **Record Payment form** (collapsible, default hidden):
  - Amount (number input, required, min 1)
  - Payment Method (select: Cash / Bank Transfer / Cheque / Other, required)
  - Note (text input, optional)
  - Submit → `Customers.useRecordCreditTransaction` with `{ type: 'payment', amount, paymentMethod, note }`
  - On success: show toast "Payment recorded", refetch customer + transactions
- **Adjust Credit form** (collapsible, default hidden, hidden for StoreStaff):
  - Amount (number input, required, can be negative — label: "Amount (negative to reduce)")
  - Reason (select: Cash paid outside system / Correction / Goodwill credit / Write-off / Other)
  - Note (text input, required when reason = Other)
  - Submit → `Customers.useRecordCreditTransaction` with `{ type: 'adjustment', amount, note: reason + note }`
  - On success: show toast "Credit adjusted", refetch

**Right panel — tabs:**

Tab "Bills":
- `Customers.useGetBills(id, page)` — table columns: Date, Bill #, Sale Type badge, Total, Status chip
- Each row links to `/bills/:id`
- Pagination

Tab "Credit Transactions":
- `Customers.useGetCreditTransactions(id, page)` — table columns: Date, Type badge, Payment Method (if payment), Amount (green +/red −), Balance Before → After, Note, Performed By
- Pagination

**Role gating:** use `useAuth()` to get role. Hide "Adjust Credit" form entirely for StoreStaff.

---

## Task 11 — CustomerDetailDrawer component

**Repo:** `ERP-Client`

**Files:**
- NEW `renderer/src/components/CustomerDetailDrawer.tsx`

**Props:**
```ts
interface CustomerDetailDrawerProps {
  customerId: string;
  open: boolean;
  onClose: () => void;
  onCreditUpdated: () => void;
}
```

Wrap the left panel content of `CustomerDetail` (profile + credit + forms) in a `Sheet`/drawer (same pattern as `FormDrawer`). Include the two history tabs as well (full detail page content inside a sheet).

When a payment or adjustment is saved: call `onCreditUpdated()` + show sonner toast "Credit updated".

Extract shared content into an inner `CustomerDetailContent` component used by both `CustomerDetail` page and `CustomerDetailDrawer`.

---

## Task 12 — Customers list: clickable rows + credit status badge

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/pages/Customers/index.tsx`

**Changes:**
1. Add import for `useNavigate` from `react-router-dom`
2. Make each row clickable: `onRowClick={(row) => navigate('/customers/' + row.id)}`
3. Add a `creditStatus` column at the start of the columns array:
   - Render a colored dot: grey (none), green (available), amber (warning), red (over)
   - Tooltip text: "No credit limit" / "Credit available" / "Nearing limit" / "Over limit"
4. Keep Edit and Delete action buttons — stop propagation on those clicks so they don't also navigate

---

## Task 13 — CheckoutPanel: enhanced customer card

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/pages/pos/components/CheckoutPanel.tsx`

**Changes:**

1. **Credit status dot in search dropdown** — in the customer suggestions list (`customerSearchItems.map`), add a colored dot before the customer name based on `c.creditStatus`. Same color scheme as Task 12.

2. **Outstanding balance warning banner** — inside the `{mode === 'sales' && saleType === 'credit' && customerId && selectedCustomer && (` block, add at the top (before the credit limit/balance box):
   ```tsx
   {(selectedCustomer.creditBalance ?? 0) > 0 && (
     <div className="rounded-lg bg-amber-500/10 border border-amber-300/50 px-3 py-2 text-[11px] font-semibold text-amber-800 dark:text-amber-300">
       Outstanding balance: {fmt(selectedCustomer.creditBalance)}
     </div>
   )}
   ```

3. **Last purchase + View history** — after the credit box, add:
   - Last purchase: fetch `Customers.useGetBills(customerId, 1)` (1 item), show "Last purchase: {date} · {fmt(amount)}" or "No previous purchases"
   - "View full history →" button — opens `CustomerDetailDrawer`

4. **Record Payment button** — below "View full history", a small button visible to all roles: "Record Payment" → opens `CustomerDetailDrawer` scrolled to payment form (or just opens the drawer — the form is there)

5. **Add props** to `CheckoutPanelProps`:
   - `onOpenCustomerDrawer: () => void`

6. **Wire `CustomerDetailDrawer`** in `POSTerminal.tsx`:
   - State: `customerDrawerOpen: boolean`
   - Pass `onOpenCustomerDrawer={() => setCustomerDrawerOpen(true)}` to `CheckoutPanel`
   - Render `<CustomerDetailDrawer customerId={customerId} open={customerDrawerOpen} onClose={() => setCustomerDrawerOpen(false)} onCreditUpdated={() => refetchSelectedCustomer()} />`
   - `refetchSelectedCustomer`: invalidate `['customers', customerId]` query

---

## Task 14 — Post-credit-sale modal: show updated balance

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/pages/pos/checkout.ts` — add `updatedCreditBalance?: number` to `CheckoutResult`
- EDIT `renderer/src/pages/pos/POSTerminal.tsx` — populate `updatedCreditBalance` from checkout response and pass to `BillSuccessModal`
- EDIT `BillSuccessModal` (inside `POSTerminal.tsx`) — when `pendingCreditApproval === false` and `saleType === 'credit'` and `updatedCreditBalance !== undefined`, show: `"New credit balance: {fmt(updatedCreditBalance)}"`

**How to get `updatedCreditBalance`:** The bill completion API response includes `customerCreditBalance` in the bill or as a separate field. Check `runSalesCheckout` in `checkout.ts` — if the response doesn't include it, add a `GET /customers/:customerId` call after checkout completes to read the fresh balance and attach it to `CheckoutResult`.

---

## Task 15 — App router: add `/customers/:id` route

**Repo:** `ERP-Client`

**Files:**
- EDIT `renderer/src/App.tsx`

**Change:**
```tsx
const CustomerDetail = lazy(() => import('./pages/CustomerDetail'));
// ...
<Route path="customers/:id" element={<CustomerDetail />} />
```
Place after the existing `<Route path="customers" element={<Customers />} />`.

---

## Execution order

```
Task 1  (migration)
Task 2  (domain model)      — depends on 1
Task 3  (command handler)   — depends on 2
Task 4  (query handlers)    — depends on 2
Task 5  (response DTO)      — depends on 2
Task 6  (creditStatus)      — depends on 5
Task 7  (controller)        — depends on 3, 4, 5, 6
Task 8  (FE types)          — parallel with 1-7
Task 9  (FE api hooks)      — depends on 8
Task 10 (CustomerDetail)    — depends on 9
Task 11 (CustomerDetailDrawer) — depends on 10
Task 12 (Customers list)    — depends on 9
Task 13 (CheckoutPanel)     — depends on 11
Task 14 (post-sale modal)   — depends on 9
Task 15 (router)            — depends on 10
```

---

## Verification checklist

- [ ] Migration runs on fresh DB, rollback works
- [ ] `GET /customers/:id/credit-transactions` returns paginated results
- [ ] `GET /customers/:id/bills` excludes black bills for StoreStaff
- [ ] `POST /customers/:id/credit-transactions` with `type: payment` reduces `creditBalance`, creates transaction row with `paymentMethod`
- [ ] `POST /customers/:id/credit-transactions` with `type: adjustment` by StoreStaff returns 403
- [ ] `CustomerResponse.creditStatus` returns correct value at 89%, 91%, 101% of limit
- [ ] Customer list: rows navigate to `/customers/:id`, credit dot shows correct color
- [ ] Customer detail page: bills tab, transactions tab, record payment, adjust credit all work
- [ ] Billing: credit status dot in search dropdown
- [ ] Billing: outstanding banner shows only on credit sale type with balance > 0
- [ ] Billing: "View full history" opens drawer, recording payment refreshes the card with toast
- [ ] Post-credit-sale modal shows updated credit balance
