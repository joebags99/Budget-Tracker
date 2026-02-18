import { createContext, useContext, useReducer, useEffect } from 'react';
import { getIRSLine } from '../utils/irsMapping.js';
import { generateId } from '../utils/calculations.js';

const STORAGE_KEY = 'daedabyteFinancials';

const initialState = {
  projects: [],
  expenses: [],
  payments: [],
  taxPayments: [],
  supportPlans: [],
};

function migrateExpenses(expenses) {
  return expenses.map(e => ({
    ...e,
    irsLine: e.irsLine || getIRSLine(e.category),
  }));
}

function reducer(state, action) {
  switch (action.type) {
    // ── Projects ──────────────────────────────────────────────────────
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, { ...action.payload, id: generateId() }] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };

    // ── Expenses ──────────────────────────────────────────────────────
    case 'ADD_EXPENSE': {
      const exp = { ...action.payload, id: generateId(), irsLine: getIRSLine(action.payload.category) };
      return { ...state, expenses: [...state.expenses, exp] };
    }
    case 'UPDATE_EXPENSE':
      return {
        ...state,
        expenses: state.expenses.map(e =>
          e.id === action.payload.id
            ? { ...action.payload, irsLine: getIRSLine(action.payload.category) }
            : e
        ),
      };
    case 'DELETE_EXPENSE':
      return { ...state, expenses: state.expenses.filter(e => e.id !== action.payload) };

    // ── Payments ──────────────────────────────────────────────────────
    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, { ...action.payload, id: generateId() }] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };

    // ── Tax Payments ──────────────────────────────────────────────────
    case 'ADD_TAX_PAYMENT':
      return { ...state, taxPayments: [...state.taxPayments, { ...action.payload, id: generateId() }] };
    case 'DELETE_TAX_PAYMENT':
      return { ...state, taxPayments: state.taxPayments.filter(t => t.id !== action.payload) };

    // ── Support Plans ─────────────────────────────────────────────────
    case 'ADD_SUPPORT_PLAN':
      return { ...state, supportPlans: [...state.supportPlans, { ...action.payload, id: generateId() }] };
    case 'UPDATE_SUPPORT_PLAN':
      return { ...state, supportPlans: state.supportPlans.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPORT_PLAN':
      return { ...state, supportPlans: state.supportPlans.filter(s => s.id !== action.payload) };

    // ── Bulk ops ──────────────────────────────────────────────────────
    case 'IMPORT_ALL': {
      const imported = action.payload;
      return {
        projects:     imported.projects     || [],
        expenses:     migrateExpenses(imported.expenses     || []),
        payments:     imported.payments     || [],
        taxPayments:  imported.taxPayments  || [],
        supportPlans: imported.supportPlans || [],
      };
    }

    // ── Update project paid amount when payment added ──────────────────
    case 'RECORD_PROJECT_PAYMENT': {
      const { projectId, amount, paymentData } = action.payload;
      const updatedProjects = state.projects.map(p =>
        p.id === projectId ? { ...p, paidAmount: (p.paidAmount || 0) + amount } : p
      );
      const newPayment = { ...paymentData, id: generateId(), projectId, type: 'project', amount };
      return { ...state, projects: updatedProjects, payments: [...state.payments, newPayment] };
    }

    case 'RECORD_SUPPORT_PAYMENT': {
      const { paymentData } = action.payload;
      const newPayment = { ...paymentData, id: generateId(), type: 'support' };
      return { ...state, payments: [...state.payments, newPayment] };
    }

    default:
      return state;
  }
}

const FinancialContext = createContext(null);

export function FinancialProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, initialState, (init) => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved);
        return {
          projects:     data.projects     || [],
          expenses:     migrateExpenses(data.expenses     || []),
          payments:     data.payments     || [],
          taxPayments:  data.taxPayments  || [],
          supportPlans: data.supportPlans || [],
        };
      }
    } catch {}
    return init;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  return (
    <FinancialContext.Provider value={{ state, dispatch }}>
      {children}
    </FinancialContext.Provider>
  );
}

export function useFinancial() {
  return useContext(FinancialContext);
}
