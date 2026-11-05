// Ownership shares — used for K-1 tax allocation and legacy CCC payout splits
export const MEMBERS = [
  { id: 'jon',  name: 'Jonathan Bartholomew',     share: 0.35 },
  { id: 'alex', name: 'Alejandro Marquez Grande', share: 0.33 },
  { id: 'joe',  name: 'Joseph Konkle',            share: 0.32 },
];

// Payout splits effective April 1 2026 — applies to all revenue EXCEPT CCC Legacy
export const PAYOUT_SPLITS_V2 = [
  { id: 'alex', name: 'Alejandro Marquez Grande', share: 0.40 },
  { id: 'joe',  name: 'Joseph Konkle',            share: 0.35 },
  { id: 'jon',  name: 'Jonathan Bartholomew',     share: 0.25 },
];

export const DISTRIBUTION_POOL_RATE  = 0.9;  // 90% of net profit paid out to members
export const SAVINGS_RETENTION_RATE  = 0.1;  // 10% retained in Mercury savings
export const MERCURY_FLOOR           = 1500; // Minimum Mercury savings balance ($)
export const NEW_SPLITS_EFFECTIVE    = new Date(2026, 3, 1); // April 1, 2026

// clientName value that identifies CCC Legacy payments
export const CCC_LEGACY_CLIENT = 'CCC Legacy';

import { parseDate } from './dateUtils.js';

export function calcRevenue(payments, fromDate, toDate) {
  const filtered = payments.filter(p => {
    const d = parseDate(p.date);
    return d >= fromDate && d <= toDate;
  });
  const project = filtered.filter(p => p.type === 'project' || !p.type).reduce((s, p) => s + p.amount, 0);
  const support = filtered.filter(p => p.type === 'support').reduce((s, p) => s + p.amount, 0);
  return { project, support, total: project + support, filtered };
}

export function calcExpenses(expenses, fromDate, toDate, subscriptionCharges = []) {
  const filteredExp = expenses.filter(e => {
    const d = parseDate(e.date);
    return d >= fromDate && d <= toDate;
  });
  const filteredCharges = subscriptionCharges.filter(c => {
    const d = parseDate(c.date);
    return d >= fromDate && d <= toDate;
  });
  const filtered = [...filteredExp, ...filteredCharges];
  return { total: filtered.reduce((s, e) => s + e.amount, 0), filtered };
}

/**
 * Calculate profit distributions.
 *
 * Options:
 *   cccLegacyRevenue  – revenue from CCC Legacy client (uses original MEMBERS splits)
 *   mercuryBalance    – current Mercury savings balance; floor is replenished first
 *   periodEndDate     – ISO date string; if >= April 1 2026 the new V2 splits apply
 */
export function calcDistributions(netProfit, { cccLegacyRevenue = 0, mercuryBalance = 0, periodEndDate = null } = {}) {
  const useNewSplits = !periodEndDate || new Date(periodEndDate) >= NEW_SPLITS_EFFECTIVE;

  if (netProfit <= 0) {
    const splits = useNewSplits ? PAYOUT_SPLITS_V2 : MEMBERS;
    return { pool: 0, savings: 0, floorWithholding: 0, memberAmounts: splits.map(m => ({ ...m, amount: 0 })) };
  }

  const rawPool = netProfit * DISTRIBUTION_POOL_RATE;
  const savings = netProfit * SAVINGS_RETENTION_RATE;

  // Withhold from payout to bring Mercury savings up to the $1,500 floor
  const floorDeficit    = Math.max(0, MERCURY_FLOOR - mercuryBalance);
  const floorWithholding = Math.min(floorDeficit, rawPool);
  const availablePool   = rawPool - floorWithholding;

  let memberAmounts;
  if (!useNewSplits) {
    // Before April 2026 — original splits for everything
    memberAmounts = MEMBERS.map(m => ({ ...m, amount: availablePool * m.share }));
  } else if (cccLegacyRevenue > 0 && cccLegacyRevenue < netProfit) {
    // Mixed: portion of pool belongs to CCC Legacy (old splits), rest gets new splits
    const cccFraction = cccLegacyRevenue / netProfit;
    const cccPool     = availablePool * cccFraction;
    const otherPool   = availablePool * (1 - cccFraction);

    const totals = {};
    MEMBERS.forEach(m => { totals[m.id] = { ...m, amount: cccPool * m.share }; });
    PAYOUT_SPLITS_V2.forEach(m => {
      if (totals[m.id]) totals[m.id].amount += otherPool * m.share;
      else totals[m.id] = { ...m, amount: otherPool * m.share };
    });
    memberAmounts = Object.values(totals);
  } else if (cccLegacyRevenue >= netProfit) {
    // All revenue is CCC Legacy — original splits
    memberAmounts = MEMBERS.map(m => ({ ...m, amount: availablePool * m.share }));
  } else {
    // No CCC Legacy revenue — new splits
    memberAmounts = PAYOUT_SPLITS_V2.map(m => ({ ...m, amount: availablePool * m.share }));
  }

  return { pool: availablePool, savings, floorWithholding, memberAmounts };
}

export function calcTax(netProfit, federalRate, stateRate, selfEmploymentRate) {
  return {
    federal:        netProfit * federalRate,
    state:          netProfit * stateRate,
    selfEmployment: netProfit * selfEmploymentRate,
    total:          netProfit * (federalRate + stateRate + selfEmploymentRate),
  };
}

export function calcMRR(supportPlans) {
  const active = supportPlans.filter(p => p.status === 'active');
  const mrr = active.reduce((s, p) => s + p.monthlyAmount, 0);
  return { active: active.length, mrr, arr: mrr * 12, avg: active.length ? mrr / active.length : 0 };
}

export function calcOverhead(supportPlans, expenses, subscriptions = [], subscriptionCharges = []) {
  const active = supportPlans.filter(p => p.status === 'active');
  const mrr = active.reduce((s, p) => s + p.monthlyAmount, 0);
  const arr = mrr * 12;

  const staticMonthlyExp = expenses.filter(e => e.recurring === 'monthly').reduce((s, e) => s + e.amount, 0);
  const quarterlyExp     = expenses.filter(e => e.recurring === 'quarterly').reduce((s, e) => s + e.amount, 0);
  const annualExp        = expenses.filter(e => e.recurring === 'annually').reduce((s, e) => s + e.amount, 0);

  // Average actual monthly charges per subscription vendor
  const subAvgMonthly = subscriptions.reduce((sum, sub) => {
    const charges = subscriptionCharges.filter(c => String(c.subscriptionId) === String(sub.id));
    if (charges.length === 0) return sum;
    return sum + charges.reduce((s, c) => s + c.amount, 0) / charges.length;
  }, 0);

  const monthlyRecurringExpenses = staticMonthlyExp + subAvgMonthly;
  const annualRecurringExpenses  = monthlyRecurringExpenses * 12 + quarterlyExp * 4 + annualExp;

  return {
    mrr,
    arr,
    monthlyRecurringExpenses,
    annualRecurringExpenses,
    monthlyNet: mrr - monthlyRecurringExpenses,
    annualNet:  arr - annualRecurringExpenses,
  };
}

export function calcAnnualProjections(payments, expenses, taxRates) {
  const totalRevenue   = payments.reduce((s, p) => s + p.amount, 0);
  const totalExpenses  = expenses.reduce((s, e) => s + e.amount, 0);
  const currentProfit  = totalRevenue - totalExpenses;

  const dates = payments.map(p => new Date(p.date).getTime());
  const monthsOfData = dates.length
    ? Math.max(1, Math.ceil((Date.now() - Math.min(...dates)) / (30 * 24 * 60 * 60 * 1000)))
    : 1;

  const projectedRevenue  = totalRevenue  * (12 / monthsOfData);
  const projectedExpenses = totalExpenses * (12 / monthsOfData);
  const projectedProfit   = projectedRevenue - projectedExpenses;
  const projectedTax      = projectedProfit * (taxRates.federal + taxRates.state + taxRates.selfEmployment);

  return { projectedRevenue, projectedExpenses, projectedProfit, projectedTax };
}

export function getProjectTypeLabel(type) {
  const labels = { basic: 'Basic ($750)', standard: 'Standard ($2,000)', premium: 'Premium ($3,000+)', custom: 'Custom' };
  return labels[type] || type;
}

export function getSupportPlanTypeLabel(type) {
  const labels = { basic: 'Basic ($50/mo)', standard: 'Standard ($100/mo)', premium: 'Premium ($200/mo)', enterprise: 'Enterprise ($350/mo)', custom: 'Custom' };
  return labels[type] || type;
}

export function generateId() {
  return Date.now() + Math.random().toString(36).slice(2);
}
