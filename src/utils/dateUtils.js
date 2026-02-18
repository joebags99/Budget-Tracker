export function today() {
  return new Date().toISOString().split('T')[0];
}

export function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

export function startOfQuarter(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), q * 3, 1);
}

export function endOfQuarter(date = new Date()) {
  const q = Math.floor(date.getMonth() / 3);
  return new Date(date.getFullYear(), q * 3 + 3, 0, 23, 59, 59, 999);
}

export function getQuickDateRange(preset) {
  const now = new Date();
  switch (preset) {
    case 'thisMonth':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'lastMonth': {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return { from: startOfMonth(lm), to: endOfMonth(lm) };
    }
    case 'thisQuarter':
      return { from: startOfQuarter(now), to: endOfQuarter(now) };
    case 'lastQuarter': {
      const lq = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      return { from: startOfQuarter(lq), to: endOfQuarter(lq) };
    }
    case 'ytd':
      return { from: new Date(now.getFullYear(), 0, 1), to: now };
    default:
      return { from: startOfMonth(now), to: endOfMonth(now) };
  }
}

export function toDateString(date) {
  return date.toISOString().split('T')[0];
}

export function parseDate(str) {
  // Parse YYYY-MM-DD without timezone shift
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function formatCurrency(amount) {
  return `$${Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDate(str) {
  if (!str) return '';
  const [y, m, d] = str.split('-');
  return `${m}/${d}/${y}`;
}
