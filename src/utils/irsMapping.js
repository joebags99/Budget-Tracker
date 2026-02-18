// IRS Form 1065 line mapping by expense category
export const IRS_TAX_LINE_MAP = {
  software:     { line: 'Line 20',  label: 'Other Deductions - Software/SaaS',      deductible: 1.0 },
  marketing:    { line: 'Line 20a', label: 'Advertising',                            deductible: 1.0 },
  equipment:    { line: 'Line 16',  label: 'Depreciation / Section 179',             deductible: 1.0 },
  office:       { line: 'Line 20',  label: 'Other Deductions - Office Supplies',     deductible: 1.0 },
  professional: { line: 'Line 20',  label: 'Legal and Professional Fees',            deductible: 1.0 },
  travel:       { line: 'Line 17',  label: 'Travel',                                 deductible: 1.0 },
  meals:        { line: 'Line 19',  label: 'Meals (50% deductible)',                 deductible: 0.5 },
  utilities:    { line: 'Line 20',  label: 'Utilities',                              deductible: 1.0 },
  insurance:    { line: 'Line 20',  label: 'Insurance',                              deductible: 1.0 },
  repairs:      { line: 'Line 11',  label: 'Repairs and Maintenance',                deductible: 1.0 },
  taxes:        { line: 'Line 14',  label: 'Taxes and Licenses',                     deductible: 1.0 },
  other:        { line: 'Line 20',  label: 'Other Deductions',                       deductible: 1.0 },
};

export const EXPENSE_CATEGORIES = [
  { value: 'software',     label: 'Software/SaaS' },
  { value: 'marketing',    label: 'Marketing / Advertising' },
  { value: 'equipment',    label: 'Equipment' },
  { value: 'office',       label: 'Office Supplies' },
  { value: 'professional', label: 'Professional Services' },
  { value: 'travel',       label: 'Travel' },
  { value: 'meals',        label: 'Meals (50% deductible)' },
  { value: 'utilities',    label: 'Utilities' },
  { value: 'insurance',    label: 'Insurance' },
  { value: 'repairs',      label: 'Repairs and Maintenance' },
  { value: 'taxes',        label: 'Taxes and Licenses' },
  { value: 'other',        label: 'Other' },
];

export function getIRSLine(category) {
  const mapping = IRS_TAX_LINE_MAP[category];
  if (!mapping) return 'Line 20 — Other Deductions';
  return `${mapping.line} — ${mapping.label}`;
}

export function getIRSMapping(category) {
  return IRS_TAX_LINE_MAP[category] || IRS_TAX_LINE_MAP.other;
}
