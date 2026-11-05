import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import ExpenseForm          from './ExpenseForm.jsx';
import ExpensesTable        from './ExpensesTable.jsx';
import SubscriptionForm     from './SubscriptionForm.jsx';
import SubscriptionsTable   from './SubscriptionsTable.jsx';
import MigrateSubscriptions from './MigrateSubscriptions.jsx';

export default function Expenses() {
  const { state } = useFinancial();
  const [editExpense, setEditExpense] = useState(null);
  const [editSub,     setEditSub]     = useState(null);

  return (
    <div className="tab-content">
      <MigrateSubscriptions />
      <SubscriptionForm editSub={editSub} onDone={() => setEditSub(null)} />
      <SubscriptionsTable
        subscriptions={state.subscriptions || []}
        subscriptionCharges={state.subscriptionCharges || []}
        onEdit={setEditSub}
      />
      <ExpenseForm editExpense={editExpense} onDone={() => setEditExpense(null)} />
      <ExpensesTable expenses={state.expenses} onEdit={setEditExpense} />
    </div>
  );
}
