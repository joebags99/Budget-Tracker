import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import { calcRevenue, calcExpenses, calcDistributions, calcTax, calcOverhead } from '../../utils/calculations.js';
import { getQuickDateRange, toDateString } from '../../utils/dateUtils.js';
import DateFilter          from './DateFilter.jsx';
import MetricsGrid         from './MetricsGrid.jsx';
import OverheadComparison  from './OverheadComparison.jsx';
import MemberDistributions from './MemberDistributions.jsx';
import TaxSummary          from './TaxSummary.jsx';
import RecurringAlert      from './RecurringAlert.jsx';
import TaxReminderBanner   from './TaxReminderBanner.jsx';

function initDateRange() {
  const r = getQuickDateRange('thisMonth');
  return { from: toDateString(r.from), to: toDateString(r.to), preset: 'thisMonth' };
}

export default function Dashboard() {
  const { state } = useFinancial();
  const [dateRange, setDateRange] = useState(initDateRange);

  const fromDate = new Date(dateRange.from + 'T00:00:00');
  const toDate   = new Date(dateRange.to   + 'T23:59:59');

  const rates = {
    federal:        state.taxRates.federal        / 100,
    state:          state.taxRates.state          / 100,
    selfEmployment: state.taxRates.selfEmployment / 100,
  };

  const rev      = calcRevenue(state.payments,  fromDate, toDate);
  const exp      = calcExpenses(state.expenses, fromDate, toDate);
  const netProfit = rev.total - exp.total;
  const dist     = calcDistributions(netProfit);
  const tax      = {
    ...calcTax(netProfit, rates.federal, rates.state, rates.selfEmployment),
    federalRate: rates.federal,
    stateRate:   rates.state,
    selfEmploymentRate: rates.selfEmployment,
  };
  const overhead = calcOverhead(state.supportPlans, state.expenses);

  return (
    <div className="tab-content">
      <RecurringAlert   expenses={state.expenses} />
      <TaxReminderBanner taxPayments={state.taxPayments} />
      <DateFilter
        from={dateRange.from}
        to={dateRange.to}
        activePreset={dateRange.preset}
        onChange={setDateRange}
      />
      <MetricsGrid
        projectRevenue={rev.project}
        supportRevenue={rev.support}
        totalRevenue={rev.total}
        totalExpenses={exp.total}
        netProfit={netProfit}
        distributionPool={dist.pool}
      />
      <OverheadComparison data={overhead} />
      <MemberDistributions memberAmounts={dist.memberAmounts} reserve={dist.reserve} />
      <TaxSummary tax={tax} reserve={dist.reserve} />
    </div>
  );
}
