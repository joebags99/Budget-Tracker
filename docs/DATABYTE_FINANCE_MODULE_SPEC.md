# Budget Tracker → Databyte Finance Module

Breakdown of the Daedabyte Budget Tracker into three components for rebuilding inside the Databyte CRM / HRIS admin system.

The current app is a Vite + React single-page app with all state in one reducer and persisted to browser `localStorage` (`src/context/FinancialContext.jsx`). Every rule that matters to the business is hard-coded in `src/utils/calculations.js`, `src/utils/irsMapping.js`, and `src/utils/exportUtils.js`. The rebuild keeps the behavior, moves the data to the hosted admin database, and turns the hard-coded rules into configurable records.

The three components, in dependency order:

| # | Component | One-line purpose | Depends on |
|---|-----------|------------------|------------|
| 1 | **Finance Tracker (ledger)** | Source of truth for clients, subscriptions, projects, income, expenses, and tax payments. Imports from Mercury and Stripe. | nothing |
| 2 | **Profit Sharing & Compensation Engine** | Models who gets paid what: members, profit-sharing agreements, addendums, 1099 contractors, business reserve. | 1 |
| 3 | **Reporting** | Period reports for co-owners, tax exports (Form 1065 / K-1), dashboard metrics, analytics. | 1, 2 |

The user described these as "parts one and two" (reporting + modular profit sharing) and "finally" the finance tracker. They are listed here in build order instead, because the reports cannot be generated until the ledger and the agreement model exist.

---

## What the current app does (inventory)

Seven tabs, one reducer, no backend.

| Tab | Component files | What it does |
|-----|-----------------|--------------|
| Dashboard | `src/components/dashboard/*` | Date-filtered revenue / expenses / net profit, member distribution cards, estimated tax, recurring overhead vs. MRR, alerts for unlogged monthly expenses and upcoming quarterly tax deadlines |
| Projects | `src/components/projects/*` | Support plans (subscriptions) with MRR overview, one-off projects with paid/remaining tracking, record-a-payment forms, payment history |
| Expenses | `src/components/expenses/*` | Expense entry with category → IRS Form 1065 line auto-mapping, recurring flag |
| Clients | `src/components/clients/*` | Client contact records, client detail roll-up of plans, projects, and lifetime revenue |
| Analytics | `src/components/analytics/Analytics.jsx` | 12-month revenue vs. expense line chart, expense category pie, MRR trend, project vs. support split |
| Tax Planning | `src/components/taxPlanning/TaxPlanning.jsx` | Editable federal / VA state / self-employment rates, annualized projections, quarterly estimated payment log |
| Reports | `src/components/reports/*` | Co-owner financial report (printable), Form 1065 / K-1 CSV export, JSON backup import / export, per-entity CSV exports |

### Current data model (as stored in localStorage)

```
clients[]       { id, name, contactName, email, phone, website, contractStart, contractEnd, notes, createdAt }
supportPlans[]  { id, clientName, planType, monthlyAmount, billingDay, startDate, endDate, status, services }
projects[]      { id, clientName, projectType, totalAmount, paidAmount, startDate, paymentSchedule, status, notes }
payments[]      { id, clientName, amount, date, type: 'project'|'support', projectId?, supportPlanId?, notes }
expenses[]      { id, description, amount, date, vendor, category, irsLine, recurring: 'no'|'monthly'|'quarterly'|'annually' }
taxPayments[]   { id, quarter: 'Q1'..'Q4', amount, date }
taxRates        { federal: 22, state: 5.75, selfEmployment: 15.3 }
```

Enumerations in use:

- `supportPlans.planType`: basic ($50/mo), standard ($100/mo), premium ($200/mo), enterprise ($350/mo), custom
- `supportPlans.status`: active, paused, cancelled
- `projects.projectType`: basic ($750), standard ($2,000), premium ($3,000+), custom
- `projects.paymentSchedule`: full, 2pay, 3pay
- `projects.status`: active, completed, on-hold
- `expenses.category`: software, marketing, equipment, office, professional, travel, meals, utilities, insurance, repairs, taxes, other

### Hard-coded business rules that must become data

These are the "income guidelines" and the biggest reason the rebuild needs to be modular.

| Rule | Where | Current value |
|------|-------|---------------|
| Members and ownership shares | `calculations.js` `MEMBERS` | Jonathan Bartholomew 34%, Alejandro Marquez Grande 33%, Joseph Konkle 33% |
| Distribution pool | `calculations.js` `DISTRIBUTION_POOL_RATE` | 40% of net profit to members |
| Business reserve | `calculations.js` `BUSINESS_RESERVE_RATE` | 60% of net profit retained |
| K-1 allocation | `exportUtils.js` `exportTaxCSV` | Ordinary business income × ownership share (uses the same 34/33/33, not the 40% pool) |
| Default tax rates | `FinancialContext.jsx` `DEFAULT_TAX_RATES` | 22% federal, 5.75% VA state, 15.3% self-employment |
| Co-owner report tax rates | `CoOwnerReport.jsx` `TAX_RATES` | Separate hard-coded copy of the same defaults. Ignores the user-edited rates. This is a bug to not carry forward. |
| Expense category → IRS line + deductible % | `irsMapping.js` | 12 categories, meals at 50% deductible |
| Plan and project price presets | `SupportPlanForm.jsx`, `ProjectForm.jsx` | See enumerations above |
| Quarterly tax deadlines | `TaxReminderBanner.jsx`, `TaxPlanning.jsx` | Apr 15, Jun 15, Sep 15, Jan 15 |

### Known weaknesses to fix in the rebuild

- **Clients are joined by name string.** Projects, plans, and payments carry `clientName`, not a client id. Renaming a client orphans its history. The rebuild must use foreign keys.
- **Net profit is cash-basis within the selected date range only.** Revenue is payments received in range, expenses are expenses dated in range. There is no accrual, no invoicing, no accounts receivable. Keep cash basis (it matches how the owners think about money) but make the basis explicit in every report header.
- **Project `paidAmount` is a denormalized counter** incremented by `RECORD_PROJECT_PAYMENT`. Derive it from payments instead.
- **The `recurring` flag on an expense is a template hint, not a schedule.** The dashboard's recurring alert matches by lowercase description to see whether this month's copy was logged. Replace with real recurring expense records (component 1).
- **Annual projections** (`calcAnnualProjections`) annualize total revenue by months-since-first-payment. Fine as a rough number, but it ignores the date filter and the tax year. Reporting should project per tax year.
- **MRR history** is approximated from plan start / end dates, so a plan whose `monthlyAmount` changed shows the current amount for all past months. The rebuild should snapshot subscription price changes.

---

## Component 1: Finance Tracker (ledger)

**Purpose.** The single source of truth for money in and money out. Every other component reads from it and never writes to it. Mercury and Stripe feed it, but the operator's edits win.

### Entities

```
Client
  id, name, contactName, email, phone, website, contractStart, contractEnd, notes, status
  (in Databyte this is the CRM account record; the finance module links to it rather than owning it)

Subscription                      (today: supportPlan)
  id, clientId, planTypeId | null, name, monthlyAmount, billingDay, startDate, endDate, status (active|paused|cancelled)
  services (text), stripeSubscriptionId | null, notes
  priceHistory[]  { effectiveFrom, monthlyAmount }       ← new, fixes the MRR trend problem

Project                           (one-off, fixed-fee work)
  id, clientId, projectTypeId | null, name, totalAmount, startDate, paymentSchedule, status (active|completed|on-hold), notes
  paidAmount is DERIVED = sum(IncomeTransaction where projectId = id)

IncomeTransaction                 (today: payment)
  id, clientId, date, amount, kind (subscription|project|other), subscriptionId | null, projectId | null
  description, notes
  source (manual|stripe|mercury), externalId | null, externalRaw (json) | null
  reviewStatus (confirmed|needs_review)

ExpenseTransaction                (today: expense)
  id, date, amount, description, vendor, categoryId, notes
  recurringExpenseId | null         ← links an occurrence to its template
  source (manual|mercury), externalId | null, externalRaw (json) | null
  reviewStatus (confirmed|needs_review)

RecurringExpense                  (today: expense.recurring flag)
  id, description, vendor, categoryId, amount, cadence (monthly|quarterly|annually), dayOfMonth, startDate, endDate, status
  Used for: overhead comparison, "not yet logged this month" alert, auto-matching imported Mercury debits

ExpenseCategory                   (today: irsMapping.js)
  id, key, label, irsLine, irsLabel, deductiblePct, sortOrder, active
  Seed with the 12 existing categories so old data imports cleanly

PlanType / ProjectType            (today: hard-coded presets)
  id, key, label, defaultAmount, active

TaxPayment
  id, taxYear, quarter (Q1..Q4), amount, date, paidBy (business | memberId), notes

ExternalAccount
  id, provider (mercury|stripe), displayName, externalAccountId, credentials ref, lastSyncAt, enabled

MatchRule                         (new, for auto-categorizing imports)
  id, provider, matchField (description|counterparty|customerId), pattern, action
  action: { assignClientId?, assignSubscriptionId?, assignCategoryId?, rename?, kind? }
```

### Behaviors

1. **CRUD for every entity above**, replacing the current forms. Client pickers use ids, with "create new client inline" preserved (today's forms accept free text).
2. **Record a payment against a subscription or project.** Today's "Record Payment" forms on `SupportPlansTable.jsx` and `ProjectsTable.jsx`. Keep the project "remaining balance" display, derived.
3. **Monthly subscription roster.** The user specifically values "a consistent list of month-to-month subscriptions and month-to-month income." Provide a view that, for a chosen month, lists every active subscription, its expected amount, whether a matching income transaction was received, and the variance. This is the MRR overview plus a received / expected reconciliation column, which the current app lacks.
4. **Monthly recurring expense roster.** Same shape for `RecurringExpense`: expected, logged, missing. Replaces the dismissible yellow alert on the dashboard with a working list.
5. **Import (one-time migration).** Accept the existing backup JSON (`exportAllDataJSON`, `version: '2.0'`). Mapping:
   - `clients[]` → Client (match existing CRM accounts by name, create the rest)
   - `supportPlans[]` → Subscription, resolving `clientName` → `clientId`
   - `projects[]` → Project, dropping `paidAmount`
   - `payments[]` → IncomeTransaction, `type` → `kind`, `source: manual`, `reviewStatus: confirmed`
   - `expenses[]` → ExpenseTransaction; rows with `recurring != 'no'` also seed one `RecurringExpense` per unique lowercase description
   - `taxPayments[]` → TaxPayment, deriving `taxYear` from the date (Q4 paid in January belongs to the prior year)
   - `taxRates` → the tax rate settings in component 3
   Also accept the four per-entity CSVs as a fallback.
6. **Mercury sync.** Pull transactions for each enabled Mercury account. Credits become `IncomeTransaction` with `needs_review`; debits become `ExpenseTransaction` with `needs_review`. Run `MatchRule`s first, then match recurring expenses by amount + counterparty + day-of-month window, then match subscriptions by client + amount. Anything unmatched lands in a review queue.
7. **Stripe sync.** Pull paid invoices / charges / payouts. Stripe `customer` → Client (store `stripeCustomerId` on Client), Stripe `subscription` → Subscription, each paid invoice → `IncomeTransaction` (`kind: subscription`). Decide whether revenue is recorded gross (Stripe charge) or net (Mercury payout); recommend gross on the Stripe side with Stripe fees recorded as an `ExpenseTransaction` in a "Payment processing" category, and have the Mercury payout matched as a transfer, not income, so it is not double counted.
8. **Review queue.** One screen listing every `needs_review` transaction from either provider with: rename, assign client, assign subscription or project, assign category, mark as transfer / ignore, confirm. Confirming can optionally "create a rule like this" to populate `MatchRule`. Edits never write back to Mercury or Stripe. The ledger is the source of truth.
9. **Dedup.** `(provider, externalId)` is unique. Re-syncing never creates duplicates and never overwrites a confirmed transaction's operator edits (name, client, category); it may update amount or date if the provider changed them, flagging the row back to `needs_review`.

### Out of scope for this component

Invoicing, accounts receivable, bank balances, and accrual accounting. The current app has none of these and the reports are cash basis.

---

## Component 2: Profit Sharing & Compensation Engine

**Purpose.** Replace the three hard-coded `MEMBERS` and the fixed 40 / 60 split with a data model that can express the actual profit-sharing agreements, their addendums, future members, and 1099 contractors, so that "who is owed what for this period" is a query, not a code change.

### Entities

```
Person                             (Databyte HRIS person record; the engine links to it)
  id, name, email, role, taxClassification (member | contractor_1099 | w2), ...

ProfitSharingAgreement
  id, name, effectiveFrom, effectiveTo | null, status (draft|active|superseded)
  poolRate            e.g. 0.40   share of net profit distributed
  reserveRate         e.g. 0.60   share retained (must sum to 1 with poolRate, or treat reserve as remainder)
  profitBasis         (cash_net_profit | cash_net_profit_after_tax_reserve | custom)
  notes, documentUrl  (the signed agreement in Drive)

AgreementParticipant               (one row per member per agreement version)
  id, agreementId, personId, shareOfPool (e.g. 0.34), ownershipPct (e.g. 0.34, used for K-1), effectiveFrom, effectiveTo | null

AgreementAddendum
  id, agreementId, name, effectiveFrom, effectiveTo | null, documentUrl, notes
  changes: one or more of
    - set poolRate / reserveRate
    - set a participant's shareOfPool or ownershipPct
    - add or remove a participant
    - add a scope rule (below)

ScopeRule                          (what revenue / expense the agreement applies to)
  id, agreementId | addendumId, kind (include|exclude), target (all | subscriptionId | projectId | clientId | categoryId | incomeKind)
  Lets you say "this addendum gives Person X 10% of the pool from Client Y's subscription only", or
  "contractor payments are excluded from the distributable pool".

ContractorEngagement               (1099 workers, not in the pool)
  id, personId, startDate, endDate | null, rateType (hourly|fixed|per_project|percent_of_project), rate
  scope: projectId | subscriptionId | clientId | null
  Payments to contractors are ExpenseTransactions in a "Contractor (1099)" category linked to the engagement,
  which both reduces net profit before the pool is calculated and feeds the 1099-NEC total per contractor.

DistributionRun
  id, periodStart, periodEnd, agreementId, status (draft|approved|paid)
  netProfit, poolAmount, reserveAmount, generatedAt, approvedBy
  lines[] { personId, basisAmount, shareOfPool, amount, paidTransactionId | null }
```

### Resolution algorithm (what replaces `calcDistributions`)

For a period `[from, to]`:

1. Find the active `ProfitSharingAgreement` as of `to`. Apply every `AgreementAddendum` effective in the period in `effectiveFrom` order to produce the effective pool rate, reserve rate, and participant share table. If an addendum takes effect mid-period, split the period at that date and run each sub-period separately, then sum per person.
2. Compute net profit from component 1 for the sub-period: confirmed income minus confirmed expenses, honoring `ScopeRule`s (default: all income, all expenses).
3. `pool = netProfit × poolRate`, `reserve = netProfit × reserveRate`.
4. For each participant, `amount = pool × shareOfPool`. Participants whose `ScopeRule` limits them to a subset get their share computed on that subset's net profit only.
5. Validate: participant shares sum to 1.0 (±0.001), rates are non-negative, no two addendums set the same field for overlapping dates.
6. Persist as a `DistributionRun` (draft). Approving locks the numbers; marking paid links each line to the Mercury transfer that paid it.

Negative net profit produces a zero pool and a negative reserve, which is how the current app behaves (it just shows negative member cards). Make the zero-floor explicit and show the shortfall against reserve.

### Why ownership % is separate from share of pool

Today both are the same number (34 / 33 / 33), used for distributions and for the K-1 Box 1 split. They can diverge: a new member could get 10% of the distribution pool under an addendum without being a 10% owner, and a contractor gets a share of nothing but still needs a 1099 total. Keep `shareOfPool` (component 2 distributions) and `ownershipPct` (component 3 K-1) as separate fields seeded with the same values.

### Modularity requirements the user called out

- **Add a person later** to the pool or as a 1099 contractor without code changes: create the Person, then either an `AgreementAddendum` that adds a participant or a `ContractorEngagement`.
- **Add or subtract parts of the business plan per client or subscription**: `ScopeRule`s on an agreement or addendum. Example: a referral addendum that grants someone 15% of the pool derived from one client's subscription for 12 months.
- **Historic accuracy.** Because every agreement, participant, and addendum is dated, re-running a past period reproduces the numbers that applied then, even after later changes. The current app cannot do this.

### Migration seed

One `ProfitSharingAgreement` named "Operating Agreement (original)", effective from the earliest payment date in the import, `poolRate 0.40`, `reserveRate 0.60`, three participants with `shareOfPool` and `ownershipPct` of 0.34 / 0.33 / 0.33 linked to the three HRIS person records. The actual signed agreement and any existing addendums should be entered by the owners during setup; the seed only reproduces what the code does today.

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
| **Co-Owner Financial Report** | `CoOwnerReport.jsx` | period preset (this / last month, this / last quarter, YTD, custom) | Header with period and generated date; totals: revenue (split subscription vs. project), expenses, net profit, estimated tax; member distribution cards from a `DistributionRun` (or a draft run computed on the fly); business reserve; revenue by client; expenses by category; current MRR / ARR; tax breakdown. Printable / PDF. |
| **Period Dashboard** | `Dashboard.jsx` + `MetricsGrid`, `MemberDistributions`, `TaxSummary`, `OverheadComparison` | date range | Same numbers as the co-owner report in card form, plus recurring overhead vs. MRR (monthly and annual surplus / deficit). |
| **Tax Export, Form 1065 / Schedule K-1** | `exportTaxCSV` | tax year, section toggles (income, deductions, K-1, estimated payments) | Multi-section CSV for H&R Block / TaxAct. Income: Lines 1a, 1b, 1c, 7 with subscription vs. project detail. Deductions: expenses grouped by IRS line in Form 1065 line order with deductible amount (meals 50%), Line 22 total, ordinary business income, plus every transaction. K-1: per participant, `ownershipPct × ordinary business income` for Box 1 and Box 14. Estimated payments: Q1–Q4 with due dates, recorded payments, total. |
| **1099-NEC summary** | not in current app | tax year | Per contractor: total paid from `ExpenseTransaction`s linked to a `ContractorEngagement`, flag those at or above the IRS filing threshold. New, follows from the 1099 requirement. |
| **Tax Planning / Projections** | `TaxPlanning.jsx` | tax year | Annualized revenue, expenses, profit, and tax at current rates; quarterly payment log; amount paid vs. projected. Project per tax year rather than since-first-payment. |
| **Analytics** | `Analytics.jsx` | trailing 12 months (make the window selectable) | Revenue vs. expenses vs. net by month, expense category pie, MRR trend (from `priceHistory`, so past months show the price that applied then), project vs. subscription revenue split. |
| **Distribution History** | not in current app | all time | List of `DistributionRun`s with status and per-person totals, so each owner can see what was distributed to them by period and year. |
| **Alerts** | `RecurringAlert.jsx`, `TaxReminderBanner.jsx` | today | Quarterly estimated tax due within 30 days (urgent within 7) and not yet recorded for the current year; recurring expenses expected this month with no logged occurrence; subscriptions expected this month with no received payment (new, from component 1's roster). Surface on the admin dashboard, not as dismissible banners. |

### Report rules

- Cash basis, stated in the header of every report.
- Only `reviewStatus: confirmed` transactions count. Show a "N transactions awaiting review" note when the period has unconfirmed rows, so a report run before the review queue is cleared is visibly incomplete.
- Every generated co-owner report and distribution run is stored with its inputs (period, agreement version, rates) so it can be reopened unchanged later. The current app regenerates from live data and cannot reproduce an old report.
- Exports stay available (CSV for the tax package, PDF for the co-owner report). Full-backup JSON export is no longer needed because the admin system is persistent, but a per-entity CSV export is cheap and worth keeping.

---

## Integration points with the rest of Databyte

- **CRM account ↔ Client.** The finance module should reference the CRM account rather than keep its own client table. Contract start / end and contact fields already exist on the CRM side.
- **HRIS person ↔ Participant / Contractor.** Members and 1099 contractors are HRIS people. Tax classification lives on the person; the engine only stores the financial relationship.
- **Documents.** Agreements and addendums link to the signed file (Drive or DocuSign) via `documentUrl`.
- **Permissions.** Co-owners see everything. A future contractor should see only their own engagement and 1099 totals. Reports that reveal other members' distributions must be restricted to members.

---

## Suggested build order

1. Component 1 entities, CRUD, and JSON import. Load the current backup and confirm the dashboard totals match the old app for the same date ranges.
2. Component 2 with the seed agreement. Confirm distribution numbers match the old app for the same periods.
3. Component 3 co-owner report, dashboard, and tax export. Diff the Form 1065 CSV against the old app's export for the same year.
4. Mercury sync and review queue, then Stripe sync. Match rules last.
5. Addendums, scope rules, contractor engagements, 1099 summary, distribution history.

Steps 1 through 3 reproduce today's app on the hosted system. Steps 4 and 5 are the new capabilities.

## Open questions for the owners

- Should Stripe revenue be recorded gross with fees as an expense, or net as it lands in Mercury? The doc recommends gross.
- Does the signed operating agreement define the profit basis as cash net profit, as the app assumes, or something else (for example after a tax reserve is set aside)?
- Are there existing addendums that should be entered during migration, and do any of them scope to specific clients?
- Is the 60% reserve a target the owners track against a Mercury balance, or just the remainder after distributions? If tracked, add a reserve balance view to component 3.
