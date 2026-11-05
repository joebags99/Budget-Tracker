# Budget Tracker → Databyte Finance Module

Breakdown of the Daedabyte Budget Tracker into three components for rebuilding inside the Databyte CRM / HRIS admin system. Based on `main` at commit `e277eab` (April 2026 payout model, CCC Legacy split, vendor subscriptions).

The current app is a Vite + React single-page app with all state in one reducer and persisted to browser `localStorage` (`src/context/FinancialContext.jsx`). Every rule that matters to the business is hard-coded in `src/utils/calculations.js`, `src/utils/irsMapping.js`, and `src/utils/exportUtils.js`. The rebuild keeps the behavior, moves the data to the hosted admin database, and turns the hard-coded rules into dated, configurable records.

The three components, in dependency order:

| # | Component | One-line purpose | Depends on |
|---|-----------|------------------|------------|
| 1 | **Finance Tracker (ledger)** | Source of truth for clients, support plans, projects, income, expenses, vendor subscriptions, and tax payments. Imports from Mercury and Stripe. | nothing |
| 2 | **Profit Sharing & Compensation Engine** | Models who gets paid what: members, profit-sharing agreements, addendums (the April 2026 split change is one), per-transaction scope (CCC Legacy), savings floor, 1099 contractors. | 1 |
| 3 | **Reporting** | Period reports for co-owners, tax exports (Form 1065 / K-1), dashboard metrics, analytics. | 1, 2 |

The user described these as "parts one and two" (reporting + modular profit sharing) and "finally" the finance tracker. They are listed here in build order instead, because the reports cannot be generated until the ledger and the agreement model exist.

### Terminology

The app uses two words that are easy to confuse. This document keeps the app's meaning.

- **Support plan** = a client's monthly plan. Money **in**. Drives MRR.
- **Subscription** = a vendor service the business pays for monthly (G-Suite, AWS, GitHub, Claude Code, Buffer, DocuSign, Notes Bot). Money **out**. Each has a history of actual monthly charges.

"The consistent list of month-to-month subscriptions and month-to-month income" is therefore two rosters: vendor subscriptions (expense side) and support plans (income side).

---

## What the current app does (inventory)

Seven tabs, one reducer, no backend.

| Tab | Component files | What it does |
|-----|-----------------|--------------|
| Dashboard | `src/components/dashboard/*` | Date-filtered revenue / expenses / net profit; member distribution cards with the Mercury savings floor and a manual month-end balance input; estimated tax; recurring overhead vs. MRR; alerts for unlogged monthly expenses and upcoming quarterly tax deadlines |
| Projects | `src/components/projects/*` | Support plans with MRR overview, one-off projects with paid/remaining tracking, record-a-payment forms (with a "use legacy split" checkbox for CCC Legacy), payment history |
| Expenses | `src/components/expenses/*` | One-off expenses with category → IRS Form 1065 line auto-mapping; **Monthly Subscriptions** tracker (vendor, category, per-month actual charge, average); one-click migration of old `recurring: monthly` expenses into subscriptions |
| Clients | `src/components/clients/*` | Client contact records and a per-client roll-up. **No client records exist in the real data**; every client is just a name string on plans, projects, and payments. |
| Analytics | `src/components/analytics/Analytics.jsx` | 12-month revenue vs. expense (including subscription charges), expense category pie, MRR trend, project vs. support split |
| Tax Planning | `src/components/taxPlanning/TaxPlanning.jsx` | Editable federal / VA state / self-employment rates, annualized projections, quarterly estimated payment log |
| Reports | `src/components/reports/*` | Co-owner financial report (printable), Form 1065 / K-1 CSV export, JSON backup import / export, per-entity CSV exports |

### Current data model (as stored in localStorage and in the backup JSON, `version: '2.0'`)

```
clients[]              { id, name, contactName, email, phone, website, contractStart, contractEnd, notes, createdAt }
supportPlans[]         { id, clientName, planType, monthlyAmount, billingDay, startDate, endDate, status, services }
projects[]             { id, clientName, projectType, totalAmount, paidAmount, startDate, paymentSchedule, status, notes }
payments[]             { id, clientName, amount, date, type: 'project'|'support', projectId?, supportPlanId?, notes,
                         useLegacySplit: bool }                         ← new: this payment pays out on the old splits
expenses[]             { id, description, amount, date, vendor, category, irsLine, recurring: 'no'|'monthly'|'quarterly'|'annually' }
subscriptions[]        { id, vendor, category, notes }                  ← new: vendor subscription (expense)
subscriptionCharges[]  { id, subscriptionId, vendor, amount, date, notes } ← new: one actual charge per month
taxPayments[]          { id, quarter: 'Q1'..'Q4', amount, date }
taxRates               { federal: 22, state: 5.75, selfEmployment: 15.3 }
mercurySavingsBalance  number                                           ← new: manually typed month-end balance
```

All ids are strings (older exports used numeric `Date.now()` ids; `migrateIds` normalizes on load).

Real data as of the April 21 2026 export: 11 client names, 8 active support plans ($20–$250/mo, $520 MRR), 10 projects (9 completed, CCC Legacy $25,300 active), 61 payments from May 2025 onward, 58 expenses, 7 vendor subscriptions with 40 charges, no tax payments logged, Mercury balance $1,023.

Enumerations in use:

- `supportPlans.planType`: basic ($50/mo), standard ($100/mo), premium ($200/mo), enterprise ($350/mo), custom
- `supportPlans.status`: active, paused, cancelled
- `projects.projectType`: basic ($750), standard ($2,000), premium ($3,000+), custom
- `projects.paymentSchedule`: full, 2pay, 3pay
- `projects.status`: active, completed, on-hold
- `expenses.category` and `subscriptions.category`: software, marketing, equipment, office, professional, travel, meals, utilities, insurance, repairs, taxes, other

### Hard-coded business rules that must become data

These are the "income guidelines." The April 2026 change is exactly the kind of addendum the rebuild has to represent as a record instead of a code edit.

| Rule | Where | Current value |
|------|-------|---------------|
| Ownership shares (K-1 allocation and legacy payouts) | `calculations.js` `MEMBERS` | Jon 35%, Alejandro 33%, Joe 32% |
| Payout splits effective April 1 2026 | `calculations.js` `PAYOUT_SPLITS_V2`, `NEW_SPLITS_EFFECTIVE` | Alejandro 40%, Joe 35%, Jon 25% |
| Distribution pool | `DISTRIBUTION_POOL_RATE` | 90% of net profit paid to members |
| Retained savings | `SAVINGS_RETENTION_RATE` | 10% of net profit kept in Mercury savings |
| Mercury savings floor | `MERCURY_FLOOR` | $1,500 minimum. Any deficit below the floor is withheld from the payout pool before splitting. |
| CCC Legacy carve-out | `CCC_LEGACY_CLIENT`, `payments.useLegacySplit`, `migrateLegacySplits` | Payments flagged `useLegacySplit` pay out on the old 35/33/32 shares even after April 2026. Auto-detect rule for old data: the first two CCC Legacy project payments and the first support payment per CCC Legacy plan. New payments get a checkbox on the record-payment form, shown only when the client is CCC Legacy. |
| Period selection of splits | `calcDistributions` `periodEndDate` | If the report period ends on or after April 1 2026, new splits apply to the non-legacy portion. |
| Default tax rates | `FinancialContext.jsx` `DEFAULT_TAX_RATES` | 22% federal, 5.75% VA state, 15.3% self-employment |
| Co-owner report tax rates | `CoOwnerReport.jsx` `TAX_RATES` | Still a separate hard-coded copy of the defaults. Ignores the user-edited rates. Do not carry forward. |
| Expense category → IRS line + deductible % | `irsMapping.js` | 12 categories, meals at 50% deductible |
| Plan and project price presets | `SupportPlanForm.jsx`, `ProjectForm.jsx` | See enumerations above |
| Quarterly tax deadlines | `TaxReminderBanner.jsx`, `TaxPlanning.jsx` | Apr 15, Jun 15, Sep 15, Jan 15 |

### How `calcDistributions` works today (the algorithm to preserve)

```
if netProfit <= 0: everyone gets 0, savings 0
rawPool  = netProfit × 0.90
savings  = netProfit × 0.10
floorWithholding = min(max(0, 1500 − mercuryBalance), rawPool)
pool     = rawPool − floorWithholding

if period ends before 2026-04-01:        pool × MEMBERS shares (35/33/32)
else if legacyRevenue == 0:              pool × V2 shares (40/35/25)
else if legacyRevenue >= netProfit:      pool × MEMBERS shares
else:                                    f = legacyRevenue / netProfit
                                         pool × f × MEMBERS  +  pool × (1 − f) × V2, summed per person
```

`legacyRevenue` is the sum of payments in the period with `useLegacySplit: true`.

### Known weaknesses to fix in the rebuild

- **Clients are joined by name string.** Projects, plans, and payments carry `clientName`. The `clients[]` table is empty in real data. Renaming a client would orphan its history. The rebuild must use foreign keys and backfill client records from the 11 distinct names.
- **The legacy fraction divides revenue by profit.** `f = legacyRevenue / netProfit` mixes a revenue number with a profit number, so the legacy slice is overstated whenever expenses are non-zero, and once legacy revenue exceeds profit the whole pool flips to old splits. The engine below allocates expenses proportionally so the legacy share is computed on legacy net profit.
- **Mercury balance is typed by hand** and is a single global value, not per period. Re-running last month's report uses this month's balance and gives a different payout. The engine stores the balance per distribution run; the Mercury integration can fill it automatically.
- **Floor withholding is not tracked.** The amount held back is shown but never added to a running savings balance, so nobody can see when the floor was replenished.
- **Net profit is cash-basis within the selected date range only.** Keep cash basis (it matches how the owners think about money) but state it in every report header.
- **Project `paidAmount` is a denormalized counter.** Derive it from payments.
- **Two expense mechanisms coexist.** Old `recurring: monthly` expenses and the new vendor subscriptions both feed overhead math (`calcOverhead` adds static monthly expenses plus the average charge per subscription). The migration tool converts the old ones. The rebuild should have one model.
- **The co-owner report uses stale hard-coded tax rates** (see table above).
- **K-1 export uses `MEMBERS` (35/33/32) for the whole tax year** with no awareness of the April 2026 payout change. That may be correct if ownership did not change and only payout shares did; the owners need to confirm (see open questions).
- **Real financial data is committed to the repo.** Seven `daedabyte-financials-*.json` exports and a PDF report are tracked in git. Fine as the migration source, but the hosted system should be the only copy going forward and these files should be removed from the repo after import.
- **MRR history** is approximated from plan start / end dates, so a plan whose `monthlyAmount` changed shows the current amount for all past months.

---

## Component 1: Finance Tracker (ledger)

**Purpose.** The single source of truth for money in and money out. Every other component reads from it and never writes to it. Mercury and Stripe feed it, but the operator's edits win.

### Entities

```
Client
  id, name, contactName, email, phone, website, contractStart, contractEnd, notes, status
  stripeCustomerId | null
  (in Databyte this is the CRM account record; the finance module links to it rather than owning it)

SupportPlan                        (client monthly plan, income)
  id, clientId, planTypeId | null, name, monthlyAmount, billingDay, startDate, endDate, status (active|paused|cancelled)
  services (text), stripeSubscriptionId | null, notes
  priceHistory[]  { effectiveFrom, monthlyAmount }       ← fixes the MRR trend problem

Project                            (one-off, fixed-fee work)
  id, clientId, projectTypeId | null, name, totalAmount, startDate, paymentSchedule, status (active|completed|on-hold), notes
  paidAmount is DERIVED = sum(IncomeTransaction where projectId = id)

IncomeTransaction                  (today: payment)
  id, clientId, date, amount, kind (support|project|other), supportPlanId | null, projectId | null
  description, notes
  source (manual|stripe|mercury), externalId | null, externalRaw (json) | null
  reviewStatus (confirmed|needs_review)
  tags[]            ← replaces the boolean useLegacySplit; component 2's scope rules match on tags
                      (seed: tag "ccc-legacy-original-contract" on every payment that has useLegacySplit: true)

VendorSubscription                 (today: subscription, expense side)
  id, vendor, categoryId, expectedAmount | null, billingDay | null, startDate, endDate | null, status (active|cancelled), notes
  mercuryCounterpartyPattern | null  ← for auto-matching imported debits

SubscriptionCharge                 (today: subscriptionCharge)
  id, vendorSubscriptionId, date, amount, notes
  source (manual|mercury), externalId | null, reviewStatus

ExpenseTransaction                 (today: expense with recurring = 'no', plus quarterly / annual recurring)
  id, date, amount, description, vendor, categoryId, notes
  recurringExpenseId | null
  source (manual|mercury), externalId | null, externalRaw (json) | null
  reviewStatus (confirmed|needs_review)

RecurringExpense                   (quarterly / annual templates; monthly ones are VendorSubscriptions)
  id, description, vendor, categoryId, amount, cadence (quarterly|annually), startDate, endDate, status

ExpenseCategory                    (today: irsMapping.js)
  id, key, label, irsLine, irsLabel, deductiblePct, sortOrder, active
  Seed with the 12 existing categories so old data imports cleanly

PlanType / ProjectType             (today: hard-coded presets)
  id, key, label, defaultAmount, active

TaxPayment
  id, taxYear, quarter (Q1..Q4), amount, date, paidBy (business | personId), notes

BankBalanceSnapshot                (today: mercurySavingsBalance, one global number)
  id, externalAccountId, asOfDate, balance, source (manual|mercury)

ExternalAccount
  id, provider (mercury|stripe), displayName, externalAccountId, role (operating|savings|payouts), credentials ref, lastSyncAt, enabled

MatchRule                          (auto-categorizing imports)
  id, provider, matchField (description|counterparty|customerId), pattern, action
  action: { assignClientId?, assignSupportPlanId?, assignProjectId?, assignVendorSubscriptionId?, assignCategoryId?, rename?, kind?, markTransfer? }
```

### Behaviors

1. **CRUD for every entity above**, replacing the current forms. Client pickers use ids, with "create new client inline" preserved (today's forms accept free text).
2. **Record a payment against a support plan or project.** Keep the project "remaining balance" display, derived. The CCC Legacy checkbox becomes a tag picker that only shows tags component 2 has declared relevant for that client.
3. **Monthly income roster.** For a chosen month, every active support plan, expected amount, received amount, variance, and whether a matching income transaction exists. This is today's MRR overview plus the received / expected reconciliation the current app lacks.
4. **Monthly subscription roster.** For a chosen month, every active vendor subscription, expected amount, actual charge logged (or imported from Mercury), variance, and trailing average. This is today's Monthly Subscriptions card with Mercury filling in the charges.
5. **Import (one-time migration)** from the latest backup JSON. Mapping:
   - distinct `clientName` values across plans, projects, payments → Client (match CRM accounts by name, create the rest); `clients[]` if present → merge contact fields
   - `supportPlans[]` → SupportPlan, resolving `clientName` → `clientId`
   - `projects[]` → Project, dropping `paidAmount`
   - `payments[]` → IncomeTransaction, `type` → `kind`, `source: manual`, `reviewStatus: confirmed`, `useLegacySplit: true` → tag `ccc-legacy-original-contract`. Run the same auto-detect rule as `migrateLegacySplits` for rows missing the flag and show the result for confirmation before committing.
   - `subscriptions[]` → VendorSubscription; `subscriptionCharges[]` → SubscriptionCharge
   - `expenses[]` with `recurring: 'no'` → ExpenseTransaction; with `recurring: 'monthly'` and no matching vendor subscription → create a VendorSubscription and convert the rows to charges (same logic as `MigrateSubscriptions.jsx`); with `quarterly` / `annually` → ExpenseTransaction plus one RecurringExpense template per vendor
   - `taxPayments[]` → TaxPayment, deriving `taxYear` from the date (Q4 paid in January belongs to the prior year)
   - `mercurySavingsBalance` → one BankBalanceSnapshot dated at the export date
   - `taxRates` → tax settings in component 3
   Also accept the four per-entity CSVs as a fallback.
6. **Mercury sync.** Pull transactions and balances for each enabled Mercury account. Credits become IncomeTransaction `needs_review`; debits become SubscriptionCharge (when a vendor subscription's counterparty pattern matches) or ExpenseTransaction `needs_review`. Daily balance snapshots on the savings account feed the floor calculation in component 2, replacing the manual input.
7. **Stripe sync.** Pull paid invoices / charges / payouts. Stripe `customer` → Client, Stripe `subscription` → SupportPlan, each paid invoice → IncomeTransaction (`kind: support`). Record revenue gross on the Stripe side, record Stripe fees as an ExpenseTransaction in a "Payment processing" category, and match the Mercury payout as a transfer so it is not counted twice.
8. **Review queue.** One screen listing every `needs_review` row from either provider: rename, assign client, assign plan / project / vendor subscription, assign category, tag, mark as transfer or ignore, confirm. Confirming can "create a rule like this" to populate MatchRule. Edits never write back to Mercury or Stripe.
9. **Dedup.** `(provider, externalId)` is unique. Re-syncing never creates duplicates and never overwrites a confirmed row's operator edits; it may update amount or date if the provider changed them, flagging the row back to `needs_review`.

### Out of scope for this component

Invoicing, accounts receivable, and accrual accounting. The current app has none of these and the reports are cash basis.

---

## Component 2: Profit Sharing & Compensation Engine

**Purpose.** Replace `MEMBERS`, `PAYOUT_SPLITS_V2`, the fixed 90 / 10 split, the $1,500 floor, and the CCC Legacy special case with dated records, so that the April 2026 change, the next one, a new member, or a 1099 contractor is data entry rather than a code change.

### Entities

```
Person                             (Databyte HRIS person record; the engine links to it)
  id, name, email, role, taxClassification (member | contractor_1099 | w2)

ProfitSharingAgreement
  id, name, effectiveFrom, effectiveTo | null, status (draft|active|superseded)
  poolRate            e.g. 0.90   share of net profit distributed
  retentionRate       e.g. 0.10   share retained in savings
  profitBasis         (cash_net_profit | custom)
  notes, documentUrl  (the signed agreement in Drive)

AgreementParticipant               (one row per member per agreement version)
  id, agreementId, personId, shareOfPool, ownershipPct, effectiveFrom, effectiveTo | null

AgreementAddendum
  id, agreementId, name, effectiveFrom, effectiveTo | null, documentUrl, notes
  changes: one or more of
    - set poolRate / retentionRate
    - set a participant's shareOfPool or ownershipPct
    - add or remove a participant
    - set a reserve policy (below)
    - add a scope rule (below)

ReservePolicy                      (today: MERCURY_FLOOR)
  id, agreementId | addendumId, externalAccountId (the Mercury savings account), floorAmount (1500)
  replenishFrom (payout_pool | retention | none), effectiveFrom, effectiveTo | null

ScopeRule                          (which money a share table applies to)
  id, agreementId | addendumId, priority
  match:   { tag? , clientId?, supportPlanId?, projectId?, categoryId?, incomeKind? }
  applies: { shareTableId }        ← the participant share table to use for matching transactions
  Lets you say "transactions tagged ccc-legacy-original-contract use the original 35/33/32 table"
  or "Client Y's support plan revenue gives Person X 15% of the pool for 12 months".

ContractorEngagement               (1099 workers, not in the pool)
  id, personId, startDate, endDate | null, rateType (hourly|fixed|per_project|percent_of_project), rate
  scope: projectId | supportPlanId | clientId | null
  Payments to contractors are ExpenseTransactions in a "Contractor (1099)" category linked to the engagement,
  which reduces net profit before the pool is calculated and feeds the 1099-NEC total per contractor.

DistributionRun
  id, periodStart, periodEnd, agreementId, status (draft|approved|paid)
  netProfit, poolAmount, retentionAmount, floorWithholding, savingsBalanceUsed, balanceSnapshotId
  generatedAt, approvedBy
  lines[] { personId, basisAmount, shareOfPool, amount, paidTransactionId | null }
  slices[] { scopeRuleId | null, netProfit, pool, shareTableId }   ← audit trail of how the pool was split
```

### Resolution algorithm (replaces `calcDistributions`)

For a period `[from, to]`:

1. Find the active ProfitSharingAgreement as of `to`. Apply every AgreementAddendum effective in the period in `effectiveFrom` order. If an addendum takes effect mid-period, split the period at that date, run each sub-period, and sum per person. This is what `periodEndDate >= NEW_SPLITS_EFFECTIVE` does today, but for any number of changes.
2. Pull confirmed income and expenses for the sub-period from component 1 and compute `netProfit`. If it is zero or negative, every line is zero, retention is zero, and the run records the shortfall.
3. `rawPool = netProfit × poolRate`, `retention = netProfit × retentionRate`.
4. Apply the ReservePolicy: take the latest BankBalanceSnapshot for the savings account on or before `to` (or the manually entered balance if none). `floorWithholding = min(max(0, floor − balance), rawPool)`. `pool = rawPool − floorWithholding`. Record which snapshot was used so the run is reproducible.
5. Partition the period's income by ScopeRule (highest priority wins, default rule = the agreement's base share table). Allocate expenses to each partition in proportion to its revenue, so each slice has its own net profit. `slicePool = pool × (sliceNetProfit / netProfit)`. This replaces today's `legacyRevenue / netProfit` fraction with a revenue-weighted profit fraction that cannot exceed 1.
6. For each slice, `amount = slicePool × shareOfPool` for each participant in that slice's share table. Sum per person across slices and sub-periods.
7. Validate: each share table sums to 1.0 (±0.001), rates are non-negative, no two addendums set the same field for overlapping dates.
8. Persist as a DistributionRun (draft). Approving locks the numbers; marking paid links each line to the Mercury transfer that paid it and appends `floorWithholding + retention` to the savings ledger so the floor's replenishment is visible.

### Why ownership % is separate from share of pool

Today `MEMBERS` (35/33/32) is used for three things: K-1 allocation, pre-April-2026 payouts, and CCC Legacy payouts. `PAYOUT_SPLITS_V2` (40/35/25) is used for everything else after April 2026. Ownership and payout share have already diverged in practice, so the model stores `ownershipPct` (component 3 K-1) and `shareOfPool` (distributions) separately.

### Modularity requirements the user called out

- **Add a person later** to the pool or as a 1099 contractor without code changes: create the Person, then either an AgreementAddendum that adds a participant or a ContractorEngagement.
- **Add or subtract parts of the business plan per client or subscription**: ScopeRules on an agreement or addendum. The CCC Legacy carve-out is the first one.
- **Historic accuracy.** Because every agreement, participant, addendum, reserve policy, and balance snapshot is dated, re-running a past period reproduces the numbers that applied then. Today, changing the Mercury balance input changes every historical report.

### Migration seed (reproduces the code as of April 2026)

```
Agreement "Operating Agreement"           effective 2025-05-01 (earliest payment is 2025-05-16)
  poolRate 0.90, retentionRate 0.10
  participants: Jon 35% / Alejandro 33% / Joe 32%   (shareOfPool and ownershipPct)
  share table A = the above

Addendum "April 2026 payout shares"       effective 2026-04-01
  share table B: Alejandro 40% / Joe 35% / Jon 25%  (shareOfPool only; ownershipPct unchanged, pending confirmation)
  scope rule priority 10: match tag "ccc-legacy-original-contract" → share table A
  scope rule default → share table B

ReservePolicy                             effective 2025-05-01
  Mercury savings account, floor $1,500, replenishFrom payout_pool
```

Whether the 90/10 split and the $1,500 floor existed from the start or were introduced later with the April 2026 change is not recoverable from the code (git history shows them landing in the same commit). The owners should set the effective dates from the signed documents.

---

## Component 3: Reporting

**Purpose.** Generate the reports the owners already rely on, from the ledger (1) and the engine (2), with the period selected at run time and the numbers reproducible later.

### Settings owned by this component

```
TaxSettings (per tax year)
  federalRate, stateRate, stateName, selfEmploymentRate       (seed: 22 / 5.75 "Virginia" / 15.3)
  quarterlyDueDates  Q1 Apr 15, Q2 Jun 15, Q3 Sep 15, Q4 Jan 15 next year
  entityType         (partnership_1065 today)
```

One copy of the rates. The current app has two, and the co-owner report silently uses the stale hard-coded copy.

### Reports to rebuild

| Report | Today | Inputs | Output |
|--------|-------|--------|--------|
| **Co-Owner Financial Report** | `CoOwnerReport.jsx` | period preset (this / last month, this / last quarter, YTD, custom) | Header with period and generated date; totals: revenue (support vs. project), expenses (one-off plus subscription charges), net profit, estimated tax; member distribution cards from a DistributionRun; retained savings; floor status and any withholding; revenue by client; expenses by category (subscription charges resolved to their vendor's category); current MRR / ARR; tax breakdown. Printable / PDF. |
| **Period Dashboard** | `Dashboard.jsx` and children | date range | Same numbers in card form, plus Mercury savings balance vs. floor (from the latest snapshot, editable if no Mercury connection) and recurring overhead vs. MRR using average subscription charges. |
| **Tax Export, Form 1065 / Schedule K-1** | `exportTaxCSV` | tax year, section toggles | Multi-section CSV for H&R Block / TaxAct. Income: Lines 1a, 1b, 1c, 7 with support vs. project detail. Deductions: expenses and subscription charges grouped by IRS line in Form 1065 line order with deductible amount (meals 50%), Line 22 total, ordinary business income, plus every transaction. K-1: per participant, `ownershipPct × ordinary business income` for Box 1 and Box 14, using the ownership table in effect for that tax year. Estimated payments: Q1–Q4 with due dates, recorded payments, total. |
| **1099-NEC summary** | not in current app | tax year | Per contractor: total paid from ExpenseTransactions linked to a ContractorEngagement, flagged at the IRS filing threshold. |
| **Tax Planning / Projections** | `TaxPlanning.jsx` | tax year | Annualized revenue, expenses, profit, and tax at current rates; quarterly payment log; paid vs. projected. Project per tax year rather than since-first-payment. |
| **Analytics** | `Analytics.jsx` | trailing 12 months (make the window selectable) | Revenue vs. expenses vs. net by month, expense category pie, MRR trend from `priceHistory`, project vs. support split, and a new subscription cost trend by vendor. |
| **Distribution History** | not in current app | all time | Every DistributionRun with status, per-person totals, floor withholding, and the savings balance it used, so each owner can see what was distributed to them by period and year. |
| **Alerts** | `RecurringAlert.jsx`, `TaxReminderBanner.jsx` | today | Quarterly estimated tax due within 30 days (urgent within 7) and not recorded for the current year; vendor subscriptions expected this month with no charge logged; support plans expected this month with no received payment (new); savings balance below floor (new). Surface on the admin dashboard rather than as dismissible banners. |

### Report rules

- Cash basis, stated in the header of every report.
- Only `reviewStatus: confirmed` transactions count. Show "N transactions awaiting review" when the period has unconfirmed rows.
- Every generated co-owner report and distribution run is stored with its inputs (period, agreement version, addendums applied, balance snapshot, tax rates) so it can be reopened unchanged later.
- Exports stay available (CSV for the tax package, PDF for the co-owner report). Full-backup JSON export is no longer needed because the admin system is persistent; per-entity CSV export is cheap and worth keeping.

---

## Integration points with the rest of Databyte

- **CRM account ↔ Client.** The finance module references the CRM account rather than keeping its own client table. Backfill 11 accounts from the payment data on import.
- **HRIS person ↔ Participant / Contractor.** Members and 1099 contractors are HRIS people. Tax classification lives on the person; the engine only stores the financial relationship.
- **Documents.** Agreements and addendums link to the signed file (Drive or DocuSign) via `documentUrl`.
- **Permissions.** Co-owners see everything. A future contractor sees only their own engagement and 1099 totals. Reports that reveal other members' distributions are restricted to members.

---

## Suggested build order

1. Component 1 entities, CRUD, and JSON import. Load the April 21 2026 backup and confirm dashboard totals match the old app for the same date ranges.
2. Component 2 with the seed agreement, addendum, scope rule, and reserve policy. Confirm distribution numbers match the old app for March 2026 (all old splits), April 2026 (mixed), and a month with no CCC Legacy payments (all new splits). Expect small differences in mixed months because of the revenue-over-profit fix; document them.
3. Component 3 co-owner report, dashboard, and tax export. Diff the Form 1065 CSV against the old app's export for 2025.
4. Mercury sync (transactions and savings balance), then the review queue, then Stripe sync. Match rules last.
5. Contractor engagements, 1099 summary, distribution history, subscription cost trend.
6. Remove the committed `daedabyte-financials-*.json` and PDF files from the repo once the hosted system holds the data.

Steps 1 through 3 reproduce today's app on the hosted system. Steps 4 through 6 are the new capabilities and cleanup.

## Open questions for the owners

- Did ownership percentages change in April 2026, or only payout shares? The K-1 export still uses 35/33/32 for the whole year. If ownership changed, the 2026 K-1 needs a weighted allocation.
- When did the 90/10 split and the $1,500 floor take effect? The code applies them to all history.
- Should the floor be replenished from the payout pool (as the code does) or from the 10% retention first?
- Should Stripe revenue be recorded gross with fees as an expense, or net as it lands in Mercury? The doc recommends gross.
- Are there other addendums or side agreements beyond CCC Legacy and the April 2026 change that should be entered during migration?
