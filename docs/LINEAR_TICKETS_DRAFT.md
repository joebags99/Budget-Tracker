# Linear ticket drafts — Finance Module

One parent issue with three sub-issues. Full detail lives in `docs/DATABYTE_FINANCE_MODULE_SPEC.md` on branch `claude/pensive-gates-oa3zhv`; each ticket links to its section rather than repeating it.

---

## Parent: Finance Module — port Daedabyte Budget Tracker into Databyte

**Labels:** finance, epic
**Priority:** High

### Summary

Rebuild the standalone Daedabyte Budget Tracker (React + localStorage) as a persistent, hosted module inside the Databyte admin system. The module has three parts, built in order: the ledger, the profit-sharing engine, and reporting.

### Why

- The tracker is the only record of revenue, expenses, and member payouts, and it lives in one browser's localStorage.
- Every business rule (payout shares, 90/10 split, $1,500 Mercury floor, CCC Legacy carve-out, tax rates) is hard-coded. The April 2026 payout change required a code deploy. Future changes, new members, and 1099 contractors should be data entry.
- Clients, members, and documents already exist in Databyte CRM / HRIS. The finance module should link to them, not duplicate them.

### Scope

1. **Finance Tracker (ledger)** — source of truth for money in and out, one-time import, Mercury and Stripe sync with a review queue.
2. **Profit Sharing & Compensation Engine** — dated agreements, addendums, scope rules, reserve policy, contractor engagements, distribution runs.
3. **Reporting** — co-owner report, dashboard, Form 1065 / K-1 export, 1099 summary, analytics, alerts.

### Out of scope

Invoicing, accounts receivable, accrual accounting, writing back to Mercury or Stripe.

### Done when

- The April 21 2026 backup imports cleanly and the dashboard, co-owner report, and 2025 tax export match the old app for the same periods (documented differences only).
- The April 2026 payout change and the CCC Legacy carve-out are represented as records, not code.
- Mercury and Stripe transactions land in a review queue and confirmed rows drive every report.

### Reference

Spec: `docs/DATABYTE_FINANCE_MODULE_SPEC.md` (Budget-Tracker repo, branch `claude/pensive-gates-oa3zhv`)

### Open questions for owners (block parts of sub-issue 2 and 3)

- Did ownership % change in April 2026, or only payout shares? Affects the 2026 K-1.
- When did the 90/10 split and the $1,500 floor take effect?
- Is the floor replenished from the payout pool or from the 10% retention?
- Record Stripe revenue gross (fees as expense) or net as it lands in Mercury?
- Any other addendums beyond CCC Legacy and April 2026?

---

## Sub-issue 1: Finance Tracker (ledger) — entities, import, Mercury/Stripe sync, review queue

**Labels:** finance, backend, integration
**Priority:** High
**Blocks:** sub-issues 2 and 3

### Summary

Build the ledger that every other finance feature reads from. Operator edits are the source of truth; bank and payment-processor data feed it but never overwrite confirmed rows.

### Entities

Client (links to CRM account), SupportPlan (client monthly plan, income, with price history), Project, IncomeTransaction, VendorSubscription (money out), SubscriptionCharge, ExpenseTransaction, RecurringExpense (quarterly / annual only), ExpenseCategory (seeded with the 12 IRS-mapped categories), PlanType / ProjectType, TaxPayment, BankBalanceSnapshot, ExternalAccount, MatchRule.

Field-level definitions: spec, "Component 1: Finance Tracker".

### Tasks

- [ ] Schema and CRUD for all entities above. Clients and members by foreign key, never by name string.
- [ ] Derive project `paidAmount` from income transactions.
- [ ] Record-payment flow against a support plan or project, with a tag picker (replaces the CCC Legacy checkbox).
- [ ] Monthly income roster: per month, each active support plan with expected vs. received and variance.
- [ ] Monthly subscription roster: per month, each active vendor subscription with expected vs. charged, trailing average.
- [ ] One-time importer for the backup JSON (`version: '2.0'`), including: backfill 11 clients from name strings, `useLegacySplit` → tag `ccc-legacy-original-contract`, convert `recurring: monthly` expenses to vendor subscriptions, derive `taxYear` on tax payments, Mercury balance → first balance snapshot. CSV fallback for the four per-entity exports.
- [ ] Mercury sync: transactions and balances per account; credits → income `needs_review`, debits → subscription charge (by counterparty pattern) or expense `needs_review`; daily savings balance snapshots.
- [ ] Stripe sync: customers → clients, subscriptions → support plans, paid invoices → income; fees as expense in a "Payment processing" category; payouts matched as transfers.
- [ ] Review queue: rename, assign client / plan / project / vendor subscription / category / tag, mark transfer or ignore, confirm, "create rule like this".
- [ ] Dedup on `(provider, externalId)`; re-sync never overwrites operator edits, flags amount/date changes back to `needs_review`.

### Acceptance

- Importing the April 21 2026 backup produces the same revenue, expense, net profit, and MRR as the old app for each month from May 2025 through April 2026.
- Running a Mercury sync twice creates no duplicates.
- Reports built on the ledger only count `confirmed` rows.

### Decisions needed

Stripe gross vs. net (see parent).

---

## Sub-issue 2: Profit Sharing & Compensation Engine — agreements, addendums, scope rules, reserve policy, distribution runs

**Labels:** finance, backend, hris
**Priority:** High
**Blocked by:** sub-issue 1

### Summary

Replace the hard-coded `MEMBERS`, `PAYOUT_SPLITS_V2`, 90/10 split, `MERCURY_FLOOR`, and CCC Legacy special case with dated records so payout changes, new members, and 1099 contractors are data entry. Every past period must be reproducible.

### Entities

Person (links to HRIS), ProfitSharingAgreement, AgreementParticipant (shareOfPool and ownershipPct stored separately), AgreementAddendum, ReservePolicy, ScopeRule, ContractorEngagement, DistributionRun (with per-slice audit trail).

Field-level definitions and the resolution algorithm: spec, "Component 2".

### Tasks

- [ ] Schema and admin UI for agreements, participants, addendums, reserve policies, scope rules, contractor engagements.
- [ ] Resolution algorithm: split period at addendum boundaries; compute net profit from confirmed ledger rows; pool and retention; floor withholding from the balance snapshot at period end; partition income by scope rule and allocate expenses proportionally; split each slice by its share table; sum per person.
- [ ] Validation: share tables sum to 1.0, no overlapping addendum changes to the same field, rates non-negative.
- [ ] DistributionRun lifecycle: draft → approved (locks numbers) → paid (links lines to Mercury transfers, appends withholding + retention to the savings ledger).
- [ ] Contractor payments as expense transactions linked to an engagement, excluded from the pool and summed for 1099 reporting.
- [ ] Migration seed: base agreement (90/10, Jon 35 / Alejandro 33 / Joe 32), April 1 2026 addendum (Alejandro 40 / Joe 35 / Jon 25), scope rule tag `ccc-legacy-original-contract` → base table, reserve policy $1,500 floor on Mercury savings.

### Acceptance

- March 2026 (all old splits), April 2026 (mixed), and a month with no CCC Legacy payments match the old app's distribution numbers, except for the documented mixed-month correction (legacy share computed on legacy net profit, not revenue ÷ profit).
- Changing today's Mercury balance does not change an approved past run.
- Adding a fourth participant via an addendum requires no code change.

### Decisions needed

Ownership vs. payout change in April 2026; effective dates for 90/10 and the floor; floor replenishment source (see parent).

---

## Sub-issue 3: Reporting — co-owner report, dashboard, tax export, 1099 summary, analytics, alerts

**Labels:** finance, frontend, reporting
**Priority:** Medium
**Blocked by:** sub-issues 1 and 2

### Summary

Rebuild the reports the owners already use, driven by the ledger and the engine, with stored inputs so any past report can be reopened unchanged.

### Settings

TaxSettings per tax year: federal, state (name + rate), self-employment rates; quarterly due dates; entity type. Seed 22 / 5.75 Virginia / 15.3. One copy only (the old app has two, and the co-owner report uses the stale one).

### Tasks

- [ ] Co-owner financial report with period presets and custom range; totals, distribution cards from a DistributionRun, retained savings, floor status, revenue by client, expenses by category (subscription charges resolved to vendor category), MRR / ARR, tax breakdown; print / PDF.
- [ ] Period dashboard: same numbers as cards, savings balance vs. floor, recurring overhead vs. MRR.
- [ ] Form 1065 / Schedule K-1 CSV export by tax year with section toggles; K-1 uses the ownership table in effect for that year.
- [ ] 1099-NEC summary per contractor with filing-threshold flag.
- [ ] Tax planning: per-tax-year projections, quarterly payment log, paid vs. projected.
- [ ] Analytics with selectable window: revenue vs. expenses vs. net, category pie, MRR trend from price history, project vs. support split, subscription cost by vendor.
- [ ] Distribution history: every run with status, per-person totals, withholding, balance used.
- [ ] Alerts on the admin dashboard: quarterly tax due (30 / 7 days), subscriptions with no charge this month, support plans with no payment this month, savings below floor.
- [ ] Every report header states cash basis and the count of transactions awaiting review.
- [ ] Store report inputs (period, agreement version, addendums, balance snapshot, tax rates) with each generated report.

### Acceptance

- Co-owner report for any month from May 2025 to April 2026 matches the old app except for documented differences (stale tax rates fixed, mixed-month distribution correction).
- 2025 Form 1065 CSV diffs clean against the old app's export.
- Reopening a stored report after a later addendum shows the original numbers.
