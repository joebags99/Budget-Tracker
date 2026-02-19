export const MEMBERS = [
  { id: 'jon',  name: 'Jonathan Bartholomew',     share: 0.35 },
  { id: 'alex', name: 'Alejandro Marquez Grande', share: 0.33 },
  { id: 'joe',  name: 'Joseph Konkle',            share: 0.32 },
];

export const DISTRIBUTION_POOL_RATE = 0.4; // 40% of net profit goes to members
export const BUSINESS_RESERVE_RATE  = 0.6; // 60% stays in business

export function calcRevenue(payments, fromDate, toDate) {
  const filtered = payments.filter(p => {
    const d = new Date(p.date);
    return d >= fromDate && d <= toDate;
  });
  const project = filtered.filter(p => p.type === 'project' || !p.type).reduce((s, p) => s + p.amount, 0);
  const support = filtered.filter(p => p.type === 'support').reduce((s, p) => s + p.amount, 0);
  return { project, support, total: project + support, filtered };
}

export function calcExpenses(expenses, fromDate, toDate) {
  const filtered = expenses.filter(e => {
    const d = new Date(e.date);
    return d >= fromDate && d <= toDate;
  });
  return { total: filtered.reduce((s, e) => s + e.amount, 0), filtered };
}

export function calcDistributions(netProfit) {
  const pool = netProfit * DISTRIBUTION_POOL_RATE;
  const reserve = netProfit * BUSINESS_RESERVE_RATE;
  const memberAmounts = MEMBERS.map(m => ({ ...m, amount: pool * m.share }));
  return { pool, reserve, memberAmounts };
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
