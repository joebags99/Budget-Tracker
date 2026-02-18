import { useState } from 'react';
import { useFinancial } from '../../context/FinancialContext.jsx';
import ExpenseForm   from './ExpenseForm.jsx';
import ExpensesTable from './ExpensesTable.jsx';

export default function Expenses() {
  const { state } = useFinancial();
  const [editExpense, setEditExpense] = useState(null);

  return (
    <div className="tab-content">
      <ExpenseForm editExpense={editExpense} onDone={() => setEditExpense(null)} />
      <ExpensesTable expenses={state.expenses} onEdit={setEditExpense} />
    </div>
  );
}
