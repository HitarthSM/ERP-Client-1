# Creditors → Credit Documents Grid

**Date:** 2026-08-25  
**Status:** Approved — plan at `docs/superpowers/plans/2026-08-25-creditors-credit-documents-grid.md`  
**Repos:** ERP-Client `renderer/src/pages/Creditors/`, core-apis bills + credit-transactions

## Problem

The Creditors page is a split master/detail of customers who owe money. The product goal is a dense, spreadsheet-like **credit documents grid** (inspired by ePrompt “Hotel Credit Note”) filled with **our** credit sales, payments, and adjustments—not hotel fields.

## Decisions (locked)

| Decision | Choice |
|---|---|
| Layout target | Dense full-width document grid (not Windows chrome clone) |
| Data | Credit sales **and** payments/adjustments, with type filter |
| Page placement | **Replace** `/sales/creditors` (nav label stays “Creditors”) |
| Approach | Backend-first: org-scoped credit-transactions list + bill enrichment |

## Non-goals

- New “Credit Note” document type or numbering scheme
- Cloning desktop menus / blue sidebar / status bar
- Keeping the current left-list + right-detail split as the primary UX
- Calling SuperAdmin-only `GET /organizations/list` for org_admin

## Domain mapping

There is no Credit Note entity. Rows come from `core.customer_credit_transactions` (`credit_sale` | `payment` | `adjustment`), already written when credit bills complete and when payments/adjustments are recorded.

| Grid column | Source |
|---|---|
| Type | `transaction.type` |
| Doc # | Linked `bill.billNumber` when `billId` set; else short txn id |
| Date | `transaction.createdAt` (or bill `billedAt` when present) |
| Invoice / Bill | `bill.billNumber` |
| Customer | `customer.name` |
| Walk-in | `bill.walkInName` |
| Gross | `bill.subtotal` (blank if no bill) |
| Discount | `bill.discountAmount` |
| Tax | `bill.taxAmount` |
| Amount | `transaction.amount` (signed display: sales +, payments −) |
| Balance after | `transaction.balanceAfter` |
| Note | `transaction.note` / payment method |

## Backend

### 1. Org-scoped credit transactions search (required)

`GET /api/v1/credit-transactions`

- Auth: same role tier as customer credit reads (OrgAdmin, OrgManager, StoreManager, StoreStaff as used on customer credit endpoints today).
- Scope: caller’s `organizationId` via customer join (never cross-org).
- Query: `$page`, `$perPage`, `$orderBy`/`$order` (default `createdAt` desc), optional `type`, `customerId`, `search` (customer name / bill number / note).
- Response item: existing credit-transaction fields **plus** `customerName`, `billNumber`, `walkInName`, `subtotal`, `discountAmount`, `taxAmount`, `totalAmount`, `billedAt` (null when no bill).

Implementation sketch: new controller/query under **credit-approvals** (domain already owns the model/repo) that filters through `CustomerCreditTransactionRepo` with joins to customer + bill; do not N+1. Credit sales appear because bill completion already inserts `type=credit_sale` rows (`bill-completion.service`).

### 2. Bill search `saleType` (optional hardening)

Expose `saleType` on `SearchBillsRequest` / list DTO so `GET /bills` can filter `saleType=credit`. Useful for other screens; Creditors grid **does not depend** on it if (1) ships—credit sales already appear as `type=credit_sale` rows.

### 3. Existing endpoints unchanged

- `GET/POST /customers/:id/credit-transactions` remain for Customer Detail.
- Creditor “Add” still uses customer create with `requireCreditLimit`.

## Frontend

### Route / nav

- Path: `/sales/creditors` unchanged.
- Module key: `creditors` unchanged.
- Page title: “Creditors” with subtitle “Credit sales, payments, and adjustments”.

### Layout

1. **Toolbar** — Refresh; Print statement (requires selected row with `customerId`); Add creditor (`CustomerFormDrawer` + `requireCreditLimit`); type filter: All | Credit sales | Payments | Adjustments; search input.
2. **Grid** — sticky header; optional filter row under headers; compact `text-xs` table; selected row highlight; horizontal scroll if needed.
3. **Row click** — if `billId` → navigate to `/bills/:id`; else → `/customers/:customerId` (credit tab if supported, else detail).
4. **Remove** the current aside list + embedded `CustomerDetailContent` pane.

### Data loading

- Single React Query: `CreditTransactions.useSearch({ page, type, search })` against the new endpoint.
- Type filter maps: All → omit type; Credit sales → `credit_sale`; Payments → `payment`; Adjustments → `adjustment`.
- Keep `Organizations.useList(isSuperAdmin)` only if print header still needs phone/address; otherwise use session org name/logo only (already gated).

### Print

Reuse `printCreditorStatement` for the **customer** of the selected row (same PDF as today). Disable Print when no row selected.

### Empty / error

- Loading and error copy for the grid (reuse `loadErrorMessage(..., 'creditors')`).
- Empty: “No credit documents match.”

## Testing

- Backend: handler/repo filters by org; type filter; pagination; staff without org gets 403/empty per existing auth patterns.
- Frontend: type filter changes query key; row navigation targets; Print disabled without selection; org_admin never calls organizations list.

## Risks

| Risk | Mitigation |
|---|---|
| Duplicate-looking credit_sale vs bill lists elsewhere | Grid is transaction-centric; bill link is secondary |
| Large orgs / merge complexity | Single endpoint + DB pagination; no client fan-out |
| Statement PDF missing phone/address for org_admin | Accept session name/logo; optional later org field on `/me` |

## Success criteria

1. Org admin opens Creditors and sees a full-width document grid (no 403 from organizations list).
2. Type filter switches among all / credit sales / payments / adjustments.
3. Columns show our credit data with bill enrichment when available.
4. Row click reaches bill or customer; Print still produces a customer statement.
