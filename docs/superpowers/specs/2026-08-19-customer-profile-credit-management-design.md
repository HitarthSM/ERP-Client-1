# Customer Profile, Credit Management & Billing UX Enhancement — Design

**Date:** 2026-08-19
**Status:** Approved
**Repos:** `ERP-Client` (`renderer/`) + `core-apis` (new endpoints)

## Background

Currently customers are a flat list with a generic `ViewDrawer`. No customer detail page exists. When a customer is selected in Sales Billing, only credit limit/balance/remaining is shown. There is no way to see purchase history, record payments, or manually adjust credit balance from anywhere in the UI. The `CustomerCreditTransaction` entity already exists in the backend (types: `credit_sale`, `payment`, `adjustment`) but has no API endpoints exposed for listing or creating manual transactions.

## Goal

1. **Customer Detail Page** (`/customers/:id`) — full account statement for a customer.
2. **Enhanced Customer Card in Sales Billing** — richer context when a customer is selected during a sale, with inline payment recording and credit adjustment.
3. **Five UX fixes** identified during design review:
   - Credit status badge in customer search dropdown results
   - "Record Payment" quick action in billing
   - Clickable customer rows → detail page
   - Post-credit-sale success modal shows updated balance
   - Outstanding balance warning banner on customer selection

## Decisions (locked)

| Choice | Value |
|---|---|
| Flow order | Billing-first (products → customer). No change to existing order. |
| Credit adjustment audit | Every manual adjustment and payment logged to `CustomerCreditTransaction` with `performedById` + `note` (new column — see backend below). |
| Customer detail page route | `/customers/:id` — new page, no existing one. |
| Customer list → detail | Each customer row in the list becomes a link/clickable row → `/customers/:id`. Edit/delete actions preserved. |
| History data source | Bills API filtered by `customerId` (existing filter). Credit transactions via new `GET /customers/:id/credit-transactions` endpoint. |
| Record Payment | Creates a `CustomerCreditTransaction` of type `payment` (negative amount reduces `creditBalance`). Same handler as manual adjustment, different type. |
| Manual Adjustment | Creates a `CustomerCreditTransaction` of type `adjustment` (positive or negative). |
| Note field | New nullable `note` column on `CustomerCreditTransaction` entity + migration. Used for audit reason. Required for `adjustment` type, optional for `payment`. |
| Who can record payment | All roles including `StoreStaff` — payment is just recording cash received. |
| Who can adjust credit | `OrgAdmin`, `OrgManager`, `SuperAdmin`, `StoreManager` only. `StoreStaff` can record payments but cannot create adjustments. |
| Outstanding balance warning | Shown only when `saleType === 'credit'` AND `creditBalance > 0` — informational only, not a blocker. Switching to Credit mode on a customer with a balance triggers it immediately. |

## Out of scope

- Changing existing credit approval / over-limit / send-for-approval flow.
- Customer statements as printable PDF (deferred).
- Bulk payment recording.
- Customer portal / external access.

---

## Backend changes (core-apis)

### 1. Migration — add `note` and `payment_method` to `customer_credit_transactions`

- New nullable `varchar` column `note` on `CustomerCreditTransactionEntity`.
- New nullable `varchar` column `payment_method` — values: `cash | bank_transfer | cheque | other`. Only populated for `type = payment`.

### 2. New endpoint — list customer credit transactions

```
GET /v1/customers/:id/credit-transactions
```

- Auth: `ClerkAuthGuard` + `assertOrgOwnership`
- Query params: `$page`, `$perPage` (default 20)
- Returns: paginated `CustomerCreditTransactionResponse[]`
  - Fields: `id`, `type`, `amount`, `balanceBefore`, `balanceAfter`, `billId?`, `note?`, `performedById?`, `createdAt`

### 3. New endpoint — record payment or manual adjustment

```
POST /v1/customers/:id/credit-transactions
```

- Auth: `ClerkAuthGuard` + `RolesGuard(StoreManager, OrgManager, OrgAdmin, SuperAdmin)`
- Body: `{ type: 'payment' | 'adjustment', amount: number, paymentMethod?: 'cash' | 'bank_transfer' | 'cheque' | 'other', note?: string }`
- `paymentMethod` is required when `type = payment`, ignored for `adjustment`
- Handler:
  1. Load customer, assert org ownership
  2. Compute `balanceBefore = customer.creditBalance`
  3. For `payment`: reduce `creditBalance` by `amount` (amount must be > 0)
  4. For `adjustment`: add `amount` to `creditBalance` (amount can be positive or negative)
  5. Save `CustomerCreditTransaction` row with `note`, `performedById`
  6. Save updated `customer.creditBalance`
  7. Return updated `CustomerResponse`

### 4. New endpoint — list customer bills

```
GET /v1/customers/:id/bills
```

- Auth: `ClerkAuthGuard` + `assertOrgOwnership`
- Query params: `$page`, `$perPage` (default 10)
- Reuse existing bills search handler with `customerId` filter
- Returns: paginated `BillResponse[]` (existing shape)

### 5. Customer search response — include credit status signal

Add `creditStatus: 'none' | 'available' | 'warning' | 'over'` to `CustomerResponse`:
- `none` — no credit limit set
- `available` — `creditBalance < creditLimit * 0.8`
- `warning` — `creditBalance >= creditLimit * 0.9`
- `over` — `creditBalance >= creditLimit`

Computed field, not stored. Used by frontend to show badge in search dropdown.

---

## Frontend changes (ERP-Client)

### A. Customer Detail Page — `/customers/:id`

New file: `renderer/src/pages/CustomerDetail/index.tsx`

Layout: two-column on desktop, stacked on small screens.

**Left column — Profile + Credit Summary**
- Name, phone, email, GSTIN, customer type badge, discount %
- Credit card:
  - Limit, Balance (what they owe), Available credit, Skip-approval flag
  - "Record Payment" button (opens inline form)
  - "Adjust Credit" button (opens inline form)

**Record Payment form** (inline, not a drawer):
- Amount (number, required, > 0)
- Payment Method (dropdown, required): Cash / Bank Transfer / Cheque / Other
- Note (text, optional, placeholder: "e.g. cheque no. 001234")
- Submit → `POST /customers/:id/credit-transactions` with `type: payment`

**Adjust Credit form** (inline):
- Amount (number, required, can be negative)
- Reason dropdown: `Cash paid outside system` | `Correction` | `Goodwill credit` | `Write-off` | `Other`
- Note (text, required when reason is "Other")
- Submit → `POST /customers/:id/credit-transactions` with `type: adjustment`

**Right column — History tabs**

Tab 1: **Bills** — table: date, bill#, sale type badge, total, status chip. Paginated. Each row links to `/bills/:id`. Black sale bills (`saleType === 'black'`) are filtered out server-side for `StoreStaff` and `StoreManager` — consistent with existing black ledger access rules. `OrgAdmin/OrgManager/SuperAdmin` see all bill types.

Tab 2: **Credit Transactions** — table: date, type badge (credit sale / payment / adjustment), amount (color-coded + green, − red), payment method (for payments), balance before → after, note, who performed it. Paginated.

### B. Customers List — make rows clickable

File: `renderer/src/pages/Customers/index.tsx`

- Each row name becomes a `<Link to={/customers/${row.id}}>` (or row click navigates).
- Edit/Delete action buttons preserved.
- Add `creditStatus` badge column: colored dot (grey = none, green = available, amber = warning, red = over).

### C. Sales Billing — Enhanced Customer Card

File: `renderer/src/pages/pos/components/CheckoutPanel.tsx`

When a customer is selected (`customerId` set), the existing credit info block expands to show:

**Customer Card additions:**
- Last purchase: date + amount (fetched from `GET /customers/:id/bills?$perPage=1`)
- Total outstanding (= `creditBalance`) — shown for ALL sale types, not just credit
- Outstanding balance warning banner: when `creditBalance > 0`, show amber banner: `"Outstanding: ₹{creditBalance}"` — informational only
- "View full history →" link — opens `CustomerDetailDrawer` (see below)
- "Record Payment" button — opens a mini inline form (same as detail page form, same endpoint)

**Credit status in search dropdown:**
File: `renderer/src/pages/pos/components/CheckoutPanel.tsx` (customer suggestions list)
- Each suggestion row shows a colored dot based on `customer.creditStatus`
- Tooltip on hover: "Over limit", "Near limit", "Credit available", "No credit"

### D. CustomerDetailDrawer — new reusable component

New file: `renderer/src/components/CustomerDetailDrawer.tsx`

A right-side drawer (same pattern as `FormDrawer`) that renders the Customer Detail page content (profile + credit summary + history tabs) without navigating away. Used in billing context.

Props: `customerId: string`, `open: boolean`, `onClose: () => void`, `onCreditUpdated: () => void` (callback to refresh customer data in billing after a payment/adjustment).

When a payment or adjustment is saved inside the drawer: fire `onCreditUpdated()` AND show a `sonner` toast — "Credit updated". The billing screen's `onCreditUpdated` handler re-fetches the customer by ID so the checkout card shows the new balance immediately without the cashier doing anything.

### E. Post-credit-sale success modal — show updated balance

File: `renderer/src/pages/pos/POSTerminal.tsx` (`BillSuccessModal`)

When `pendingCreditApproval === false` and `saleType === 'credit'`:
- Show an additional line in the modal: `"New credit balance: ₹{updatedBalance}"` 
- `updatedBalance` comes from the `CheckoutResult` — add `updatedCreditBalance?: number` to `CheckoutResult` and populate it from the bill completion response.

### F. App router — add customer detail route

File: `renderer/src/App.tsx`

Add: `<Route path="customers/:id" element={<CustomerDetail />} />`

---

## API additions to `api.ts`

```ts
Customers.useGetById(id)          // GET /customers/:id — already exists via getById
Customers.useGetBills(id, page)   // GET /customers/:id/bills
Customers.useGetCreditTransactions(id, page) // GET /customers/:id/credit-transactions
Customers.useRecordCreditTransaction(id)     // POST /customers/:id/credit-transactions
```

---

## File map

| Path | Intent |
|---|---|
| `core-apis` — new migration | Add `note` column to `customer_credit_transactions` |
| `core-apis` — `customers.controller.ts` | Add 3 new endpoints: list-bills, list-credit-transactions, create-credit-transaction |
| `core-apis` — new command handler | `CreateCreditTransactionCommand` + handler |
| `core-apis` — new query handler | `ListCustomerBillsQuery`, `ListCustomerCreditTransactionsQuery` |
| `core-apis` — `CustomerResponse` | Add computed `creditStatus` field |
| `ERP-Client` — `renderer/src/pages/CustomerDetail/index.tsx` | New customer detail page |
| `ERP-Client` — `renderer/src/components/CustomerDetailDrawer.tsx` | Reusable drawer wrapping detail page |
| `ERP-Client` — `renderer/src/pages/Customers/index.tsx` | Clickable rows + `creditStatus` badge |
| `ERP-Client` — `renderer/src/pages/pos/components/CheckoutPanel.tsx` | Customer card enhancements + credit badge in dropdown |
| `ERP-Client` — `renderer/src/pages/pos/POSTerminal.tsx` | Pass `updatedCreditBalance` to success modal |
| `ERP-Client` — `renderer/src/pages/pos/checkout.ts` | Add `updatedCreditBalance` to `CheckoutResult` |
| `ERP-Client` — `renderer/src/api.ts` | New hooks for customer bills, credit transactions, record transaction |
| `ERP-Client` — `renderer/src/types.ts` | `CustomerCreditTransaction` type, `creditStatus` on `Customer` |
| `ERP-Client` — `renderer/src/App.tsx` | Add `/customers/:id` route |

---

## Verification

- Customer list: rows are clickable, credit status dot shows correct color
- Customer detail page: profile, credit summary, bills tab, credit transactions tab all load
- Record Payment: submits, `creditBalance` reduces, new transaction row appears
- Adjust Credit: submits with note, `creditBalance` changes by signed amount, row appears
- Sales Billing — search dropdown: colored dot shows per customer
- Sales Billing — customer selected: outstanding banner shows when `creditBalance > 0`
- Sales Billing — "Record Payment" in card: works without leaving the sale screen
- Sales Billing — "View full history": opens drawer, close returns to sale
- Post-credit-sale modal: shows updated credit balance
- Role check: StoreStaff sees customer card but cannot see Record Payment / Adjust Credit buttons

## Risks / assumptions

- `GET /customers/:id/bills` reuses the existing bills search handler — assumes `customerId` filter already works (check `search-bills.query-handler.ts` before wiring).
- `creditStatus` is a computed field on response — no migration needed, but the mapper must compute it each time.
- `CustomerDetailDrawer` shares code with `CustomerDetail` page — extract shared components to avoid duplication.
- `updatedCreditBalance` in `CheckoutResult` depends on the bill completion API returning the updated customer — verify `runSalesCheckout` in `checkout.ts` has access to this after completion.
