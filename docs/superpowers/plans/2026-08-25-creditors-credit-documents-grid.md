# Creditors Credit Documents Grid Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Creditors split view with a dense org-wide credit documents grid (credit sales, payments, adjustments) backed by a new org-scoped API.

**Architecture:** Add `GET /api/v1/credit-transactions` in the credit-approvals module (QueryBuilder join customer + bill, org-scoped). Frontend Creditors page becomes a single full-width table with type filter and search, driven by that endpoint. Bill `saleType` search exposure is out of scope (YAGNI — credit sales already exist as `credit_sale` rows).

**Tech Stack:** NestJS + CQRS + TypeORM (core-apis), React + React Query + Vitest (ERP-Client)

**Spec:** `docs/superpowers/specs/2026-08-25-creditors-credit-documents-grid-design.md`

## Global Constraints

- Nav path stays `/sales/creditors`; nav title stays “Creditors”.
- Org admin must never call SuperAdmin-only `GET /organizations/list`.
- Org scope via customer.organizationId join — never cross-org.
- Roles on the new list: `StoreManager`, `OrgManager`, `OrgAdmin`, `SuperAdmin` (same manager tier as customer admin reads).
- No new Credit Note entity or numbering scheme.
- Do not clone Windows desktop chrome.

---

## File map

| Path | Responsibility |
|---|---|
| `core-apis/.../credit-approvals/domain/credit-transaction-document.ts` | Enriched row type returned by search |
| `core-apis/.../credit-approvals/i-customer-credit-transaction.repo.ts` | Add `searchOrgPagedAsync` |
| `core-apis/.../repositories/customer-credit-transaction.repo.ts` | QueryBuilder implementation |
| `core-apis/.../credit-approvals/queries/search-credit-transactions/*` | Query + handler |
| `core-apis/.../credit-approvals/models/requests/search-credit-transactions.request.ts` | Query DTO |
| `core-apis/.../credit-approvals/models/responses/credit-transaction-document.response.ts` | API response item |
| `core-apis/.../credit-approvals/credit-transactions.controller.ts` | `GET /credit-transactions` |
| `core-apis/.../credit-approvals/credit-approvals.module.ts` | Register controller + handler |
| `core-apis/.../rbac-guard-coverage.spec.ts` | Role coverage for new controller |
| `ERP-Client/.../types.ts` | `CreditTransactionDocument` type |
| `ERP-Client/.../api.ts` | `CreditTransactions.useSearch` |
| `ERP-Client/.../pages/Creditors/documentRow.ts` | Pure display helpers (doc #, signed amount) |
| `ERP-Client/.../pages/Creditors/documentRow.test.ts` | Unit tests for helpers |
| `ERP-Client/.../pages/Creditors/index.tsx` | Replace UI with document grid |
| `ERP-Client/.../pages/Creditors/creditors.ts` | Keep helpers used by Add/print if needed; leave outstandingCreditors for now (unused OK) or delete if unused |

---

### Task 1: Repo contract + org-scoped search (backend)

**Files:**
- Create: `core-apis/src/application/modules/credit-approvals/domain/credit-transaction-document.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/domain/index.ts` (export new type)
- Modify: `core-apis/src/application/modules/credit-approvals/i-customer-credit-transaction.repo.ts`
- Modify: `core-apis/src/infrastructure/persistence/repositories/customer-credit-transaction.repo.ts`
- Test: `core-apis/src/application/modules/credit-approvals/domain/credit-transaction-document.spec.ts` (shape/doc helper if any — prefer testing pure mapper in Task 3; for this task add a focused unit test that documents the filter type shape via a small pure `buildCreditTransactionSearchWhere` helper OR skip unit and rely on handler test — **prefer:** extract SQL filter assembly is hard without DB; instead write a **repo interface compile check** via implementing method and a **handler unit test in Task 2**. For Task 1, implement repo method and a minimal Jest test that mocks QueryBuilder.)

**Interfaces:**
- Consumes: `CustomerCreditTransactionEntity`, `IPageable`, customer/bill tables
- Produces:

```ts
export interface CreditTransactionDocument {
  id: string;
  customerId: string;
  customerName: string | null;
  billId: string | null;
  billNumber: string | null;
  walkInName: string | null;
  type: 'credit_sale' | 'payment' | 'adjustment';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string | null;
  note: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  billedAt: Date | null;
  createdAt: Date;
}

export type SearchCreditTransactionsFilter = {
  organizationId: string;
  type?: 'credit_sale' | 'payment' | 'adjustment';
  customerId?: string;
  search?: string;
  $page: number;
  $perPage: number;
};

// on ICustomerCreditTransactionRepo:
searchOrgPagedAsync(filter: SearchCreditTransactionsFilter): Promise<IPageable<CreditTransactionDocument>>;
```

- [ ] **Step 1: Add domain type file**

```ts
// credit-transaction-document.ts
export type CreditTransactionDocumentType = 'credit_sale' | 'payment' | 'adjustment';

export interface CreditTransactionDocument {
  id: string;
  customerId: string;
  customerName: string | null;
  billId: string | null;
  billNumber: string | null;
  walkInName: string | null;
  type: CreditTransactionDocumentType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  paymentMethod: string | null;
  note: string | null;
  subtotal: number | null;
  discountAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  billedAt: Date | null;
  createdAt: Date;
}

export type SearchCreditTransactionsFilter = {
  organizationId: string;
  type?: CreditTransactionDocumentType;
  customerId?: string;
  search?: string;
  $page: number;
  $perPage: number;
};
```

Export from `domain/index.ts`.

- [ ] **Step 2: Extend repo interface**

Add to `i-customer-credit-transaction.repo.ts`:

```ts
import { IPageable } from '../../../common';
import { CreditTransactionDocument, SearchCreditTransactionsFilter } from './domain/credit-transaction-document';

// on the type:
searchOrgPagedAsync(filter: SearchCreditTransactionsFilter): Promise<IPageable<CreditTransactionDocument>>;
```

- [ ] **Step 3: Implement QueryBuilder in repo**

In `customer-credit-transaction.repo.ts`, implement `searchOrgPagedAsync`:

- `createQueryBuilder('tx')`
- `innerJoin('tx.customer', 'customer')`
- `leftJoin('tx.bill', 'bill')`
- `where('customer.organizationId = :organizationId', { organizationId })`
- optional `andWhere('tx.type = :type')`, `andWhere('tx.customerId = :customerId')`
- optional search: `(customer.name ILIKE :q OR bill.billNumber ILIKE :q OR tx.note ILIKE :q)` with `q = %${search}%`
- order by `tx.createdAt DESC`
- `skip`/`take` from `$page`/`$perPage`
- `getManyAndCount()` then map entities to `CreditTransactionDocument` (read joined `customer.name`, bill fields)
- return `{ items, page, perPage, totalCount, totalPages }` matching existing `IPageable` shape used elsewhere (check `BaseRepo.pagedAsync` return fields and match exactly)

- [ ] **Step 4: Smoke-compile**

Run: `cd core-apis && npx tsc -p tsconfig.build.json --noEmit` (or project’s usual typecheck script)  
Expected: no errors related to new method

- [ ] **Step 5: Commit** (only if user asked to commit)

```bash
git add core-apis/src/application/modules/credit-approvals/domain \
  core-apis/src/application/modules/credit-approvals/i-customer-credit-transaction.repo.ts \
  core-apis/src/infrastructure/persistence/repositories/customer-credit-transaction.repo.ts
git commit -m "$(cat <<'EOF'
feat: add org-scoped credit transaction search on repo

EOF
)"
```

---

### Task 2: Search query + HTTP endpoint (backend)

**Files:**
- Create: `core-apis/src/application/modules/credit-approvals/queries/search-credit-transactions/search-credit-transactions.query.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/search-credit-transactions/search-credit-transactions.query-handler.ts`
- Create: `core-apis/src/application/modules/credit-approvals/queries/search-credit-transactions/index.ts`
- Create: `core-apis/src/application/modules/credit-approvals/models/requests/search-credit-transactions.request.ts`
- Create: `core-apis/src/application/modules/credit-approvals/models/responses/credit-transaction-document.response.ts`
- Create: `core-apis/src/application/modules/credit-approvals/credit-transactions.controller.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/queries/index.ts`
- Modify: `core-apis/src/application/modules/credit-approvals/models/index.ts` (+ requests/responses index if present)
- Modify: `core-apis/src/application/modules/credit-approvals/credit-approvals.module.ts`
- Modify: `core-apis/src/common/auth/rbac-guard-coverage.spec.ts`
- Test: `core-apis/src/application/modules/credit-approvals/queries/search-credit-transactions/search-credit-transactions.query-handler.spec.ts`

**Interfaces:**
- Consumes: `ICustomerCreditTransactionRepo.searchOrgPagedAsync`
- Produces: `GET /api/v1/credit-transactions` → paged `CreditTransactionDocumentResponse[]`

- [ ] **Step 1: Write failing handler unit test**

```ts
describe('SearchCreditTransactionsQueryHandler', () => {
  it('passes organizationId and filters to repo.searchOrgPagedAsync', async () => {
    const repo = {
      searchOrgPagedAsync: jest.fn().mockResolvedValue({
        items: [],
        page: 1,
        perPage: 20,
        totalCount: 0,
        totalPages: 0,
      }),
    };
    const handler = new SearchCreditTransactionsQueryHandler(repo as any, { info: jest.fn() } as any);
    const query = Object.assign(new SearchCreditTransactionsQuery(), {
      organizationId: 'org-1',
      type: 'payment',
      search: 'Ann',
      $page: 2,
      $perPage: 10,
    });
    await handler.execute(query);
    expect(repo.searchOrgPagedAsync).toHaveBeenCalledWith({
      organizationId: 'org-1',
      type: 'payment',
      customerId: undefined,
      search: 'Ann',
      $page: 2,
      $perPage: 10,
    });
  });
});
```

- [ ] **Step 2: Run test — expect FAIL** (handler missing)

Run: `cd core-apis && npm test -- search-credit-transactions.query-handler.spec.ts`

- [ ] **Step 3: Implement query + handler**

```ts
// query
export class SearchCreditTransactionsQuery extends QueryBase {
  public organizationId: string;
  public type?: CreditTransactionDocumentType;
  public customerId?: string;
  public search?: string;
  public $page?: number;
  public $perPage?: number;
}

// handler execute → repo.searchOrgPagedAsync with defaults $page=1, $perPage=20
```

Register handler in `queries/index.ts` `CreditApprovalQueryHandlers` array.

- [ ] **Step 4: Request/response DTOs + controller**

Controller:

```ts
@ApiBearerAuth()
@ApiTags('Credit Transactions')
@Controller({ path: 'credit-transactions', version: '1' })
@UseGuards(ClerkAuthGuard, RolesGuard)
export class CreditTransactionsController {
  @Get()
  @Roles(ERole.StoreManager, ERole.OrgManager, ERole.OrgAdmin, ERole.SuperAdmin)
  @HttpCode(HttpStatus.OK)
  public async search(
    @CurrentUser() user: AuthenticatedUser,
    @Query() filter: SearchCreditTransactionsRequest,
  ): Promise<CreditTransactionsDocumentsPagedResponse> {
    const organizationId = requireOrganizationId(user);
    const query = new SearchCreditTransactionsQuery();
    query.organizationId = organizationId;
    query.type = filter.type;
    query.customerId = filter.customerId;
    query.search = filter.search;
    query.$page = filter.$page ?? 1;
    query.$perPage = filter.$perPage ?? 20;
    const result = await this.mediator.execute<SearchCreditTransactionsQuery, IPageable<CreditTransactionDocument>>(query);
    return {
      ...result,
      items: result.items.map(/* to CreditTransactionDocumentResponse — manual map is fine */),
    };
  }
}
```

`SearchCreditTransactionsRequest`: optional `type` enum, `customerId` UUID, `search` string, `$page`, `$perPage` with `@Type(() => Number)`.

Register `CreditTransactionsController` in module `controllers` array.

- [ ] **Step 5: RBAC coverage test**

Add describe block in `rbac-guard-coverage.spec.ts` reading `credit-approvals/credit-transactions.controller.ts`, asserting class has `ClerkAuthGuard`+`RolesGuard`, method `search` roles equal manager tier list above.

- [ ] **Step 6: Run tests**

Run: `cd core-apis && npm test -- search-credit-transactions.query-handler.spec.ts rbac-guard-coverage.spec.ts`  
Expected: PASS

- [ ] **Step 7: Commit** (only if user asked)

```bash
git commit -m "$(cat <<'EOF'
feat: expose GET /credit-transactions org search

EOF
)"
```

---

### Task 3: Frontend API + row helpers

**Files:**
- Modify: `ERP-Client/renderer/src/types.ts`
- Modify: `ERP-Client/renderer/src/api.ts`
- Create: `ERP-Client/renderer/src/pages/Creditors/documentRow.ts`
- Create: `ERP-Client/renderer/src/pages/Creditors/documentRow.test.ts`

**Interfaces:**
- Consumes: `GET /api/v1/credit-transactions`
- Produces: `CreditTransactions.useSearch`, `docNumber()`, `signedAmountLabel()`

- [ ] **Step 1: Write failing Vitest for helpers**

```ts
import { describe, it, expect } from 'vitest';
import { docNumber, signedAmountLabel, typeFilterToApi } from './documentRow';

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

describe('typeFilterToApi', () => {
  it('maps UI filter to API type or undefined', () => {
    expect(typeFilterToApi('all')).toBeUndefined();
    expect(typeFilterToApi('credit_sale')).toBe('credit_sale');
    expect(typeFilterToApi('payment')).toBe('payment');
    expect(typeFilterToApi('adjustment')).toBe('adjustment');
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

Run: `cd ERP-Client && npm test -- renderer/src/pages/Creditors/documentRow.test.ts`

- [ ] **Step 3: Implement helpers + types + API hook**

Add `CreditTransactionDocument` to `types.ts` mirroring API fields (dates as `string`).

In `api.ts`:

```ts
export const CreditTransactions = {
  useSearch(params?: {
    page?: number;
    perPage?: number;
    type?: 'credit_sale' | 'payment' | 'adjustment';
    search?: string;
    customerId?: string;
    enabled?: boolean;
  }) {
    return useQuery({
      queryKey: ['credit-transactions', params?.page ?? 1, params?.perPage ?? 20, params?.type ?? 'all', params?.search ?? '', params?.customerId ?? ''],
      queryFn: () =>
        get<PaginatedResponse<CreditTransactionDocument>>('/api/v1/credit-transactions', {
          $page: params?.page ?? 1,
          $perPage: params?.perPage ?? 20,
          ...(params?.type ? { type: params.type } : {}),
          ...(params?.search ? { search: params.search } : {}),
          ...(params?.customerId ? { customerId: params.customerId } : {}),
        }),
      enabled: params?.enabled ?? true,
    });
  },
};
```

Implement `documentRow.ts` helpers to satisfy tests.

- [ ] **Step 4: Run tests — expect PASS**

Run: `cd ERP-Client && npm test -- renderer/src/pages/Creditors/documentRow.test.ts`

- [ ] **Step 5: Commit** (only if user asked)

---

### Task 4: Replace Creditors page UI

**Files:**
- Modify: `ERP-Client/renderer/src/pages/Creditors/index.tsx`
- Optionally leave: `creditors.ts` / `creditors.test.ts` (still valid utilities; unused by page is OK until a cleanup task)

**Interfaces:**
- Consumes: `CreditTransactions.useSearch`, `documentRow` helpers, `printCreditorStatement`, `CustomerFormDrawer`
- Produces: full-width grid UX per spec

- [ ] **Step 1: Rewrite page**

Structure:

```tsx
export default function CreditorsPage() {
  const { organization } = useSession(); // no Organizations.useList unless isSuperAdmin needed for print extras — prefer session only
  const [typeFilter, setTypeFilter] = useState<'all' | 'credit_sale' | 'payment' | 'adjustment'>('all');
  const { setSearch, debouncedSearch, page, setPage } = usePagination(); // if hook lacks page, use local useState page
  const { data, isLoading, isError, error, refetch } = CreditTransactions.useSearch({
    page,
    search: debouncedSearch || undefined,
    type: typeFilterToApi(typeFilter),
  });
  const rows = data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // toolbar: Add, Print (selected row's customerId), Refresh, type chips, search
  // table columns per spec
  // onClick row: if billId navigate(`/bills/${billId}`); else navigate(`/customers/${customerId}`) or existing customer detail route
}
```

Verify customer detail route path in `App.tsx` before wiring navigation (use exact existing path).

Remove: aside list, `CustomerDetailContent` embed, ungated org list.

Keep: `CustomerFormDrawer` with `requireCreditLimit`; Print calls `printCreditorStatement({ customerId: selected.customerId, orgName: organization?.name ?? 'Account statement', logoUrl: organization?.logoUrl })`.

- [ ] **Step 2: Manual verification checklist**

1. Org admin opens Creditors — no organizations 403 toast.
2. Type chips change results.
3. Search filters rows.
4. Row with bill opens bill; payment without bill opens customer.
5. Print disabled with no selection; works with selection.

- [ ] **Step 3: Run frontend tests**

Run: `cd ERP-Client && npm test -- renderer/src/pages/Creditors/`  
Expected: PASS (documentRow + existing creditors tests)

- [ ] **Step 4: Commit** (only if user asked)

```bash
git commit -m "$(cat <<'EOF'
feat: replace Creditors page with credit documents grid

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| Org-scoped GET credit-transactions | 1–2 |
| Type / customer / search filters | 1–2 |
| Enriched bill + customer fields | 1 |
| Manager-tier roles | 2 |
| Replace Creditors UI with dense grid | 4 |
| Type filter chips + search + print + add | 4 |
| No org list for org_admin | 4 |
| Row navigation bill/customer | 4 |
| Optional bill saleType filter | **Skipped (YAGNI)** |

## Self-review notes

- No client merge of bills + txs — single endpoint as refined in spec.
- Commit steps gated on user request to honor repo commit rules.
- Pagination: confirm `usePagination` exposes `page`; if not, use local state in Task 4.
