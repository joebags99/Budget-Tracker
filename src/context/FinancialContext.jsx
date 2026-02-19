import { createContext, useContext, useReducer, useEffect } from 'react';
import { getIRSLine } from '../utils/irsMapping.js';
import { generateId } from '../utils/calculations.js';

const STORAGE_KEY = 'daedabyteFinancials';

export const DEFAULT_TAX_RATES = { federal: 22, state: 5.75, selfEmployment: 15.3 };

const initialState = {
  projects: [],
  expenses: [],
  payments: [],
  taxPayments: [],
  supportPlans: [],
  clients: [],
  subscriptions: [],
  subscriptionCharges: [],
  taxRates: { ...DEFAULT_TAX_RATES },
};

function migrateExpenses(expenses) {
  return expenses.map(e => ({
    ...e,
    irsLine: e.irsLine || getIRSLine(e.category),
  }));
}

// Old app used Date.now() (number) as IDs. Normalize to strings so strict
// equality comparisons work correctly after HTML select coerces values to strings.
function migrateIds(items) {
  return (items || []).map(item => ({ ...item, id: String(item.id) }));
}

function reducer(state, action) {
  switch (action.type) {
    case 'ADD_PROJECT':
      return { ...state, projects: [...state.projects, { ...action.payload, id: generateId() }] };
    case 'UPDATE_PROJECT':
      return { ...state, projects: state.projects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PROJECT':
      return { ...state, projects: state.projects.filter(p => p.id !== action.payload) };

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

    case 'ADD_PAYMENT':
      return { ...state, payments: [...state.payments, { ...action.payload, id: generateId() }] };
    case 'UPDATE_PAYMENT':
      return { ...state, payments: state.payments.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'DELETE_PAYMENT':
      return { ...state, payments: state.payments.filter(p => p.id !== action.payload) };

    case 'ADD_TAX_PAYMENT':
      return { ...state, taxPayments: [...state.taxPayments, { ...action.payload, id: generateId() }] };
    case 'DELETE_TAX_PAYMENT':
      return { ...state, taxPayments: state.taxPayments.filter(t => t.id !== action.payload) };

    case 'ADD_SUPPORT_PLAN':
      return { ...state, supportPlans: [...state.supportPlans, { ...action.payload, id: generateId() }] };
    case 'UPDATE_SUPPORT_PLAN':
      return { ...state, supportPlans: state.supportPlans.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUPPORT_PLAN':
      return { ...state, supportPlans: state.supportPlans.filter(s => s.id !== action.payload) };

    case 'ADD_CLIENT':
      return { ...state, clients: [...state.clients, { ...action.payload, id: generateId(), createdAt: new Date().toISOString() }] };
    case 'UPDATE_CLIENT':
      return { ...state, clients: state.clients.map(c => c.id === action.payload.id ? action.payload : c) };
    case 'DELETE_CLIENT':
      return { ...state, clients: state.clients.filter(c => c.id !== action.payload) };

    case 'ADD_SUBSCRIPTION':
      return { ...state, subscriptions: [...state.subscriptions, { ...action.payload, id: generateId() }] };
    case 'UPDATE_SUBSCRIPTION':
      return { ...state, subscriptions: state.subscriptions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'DELETE_SUBSCRIPTION':
      return {
        ...state,
        subscriptions: state.subscriptions.filter(s => s.id !== action.payload),
        subscriptionCharges: state.subscriptionCharges.filter(c => c.subscriptionId !== action.payload),
      };
    case 'RECORD_SUBSCRIPTION_CHARGE':
      return { ...state, subscriptionCharges: [...state.subscriptionCharges, { ...action.payload, id: generateId() }] };
    case 'DELETE_SUBSCRIPTION_CHARGE':
      return { ...state, subscriptionCharges: state.subscriptionCharges.filter(c => c.id !== action.payload) };

    case 'UPDATE_TAX_RATES':
      return { ...state, taxRates: { ...state.taxRates, ...action.payload } };

    case 'IMPORT_ALL': {
      const imported = action.payload;
      return {
        projects:            migrateIds(imported.projects),
        expenses:            migrateExpenses(imported.expenses || []),
        payments:            migrateIds(imported.payments),
        taxPayments:         migrateIds(imported.taxPayments),
        supportPlans:        migrateIds(imported.supportPlans),
        clients:             migrateIds(imported.clients),
        subscriptions:       migrateIds(imported.subscriptions),
        subscriptionCharges: migrateIds(imported.subscriptionCharges),
        taxRates:            imported.taxRates || { ...DEFAULT_TAX_RATES },
      };
    }

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
          projects:            migrateIds(data.projects),
          expenses:            migrateExpenses(data.expenses || []),
          payments:            migrateIds(data.payments),
          taxPayments:         migrateIds(data.taxPayments),
          supportPlans:        migrateIds(data.supportPlans),
          clients:             migrateIds(data.clients),
          subscriptions:       migrateIds(data.subscriptions),
          subscriptionCharges: migrateIds(data.subscriptionCharges),
          taxRates:            data.taxRates || { ...DEFAULT_TAX_RATES },
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
