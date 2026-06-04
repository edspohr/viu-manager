import type { Customer } from '../data/mockData';

export function generateQuotationCode(customer: Customer): string {
  const code = (customer.clientCode ?? '???')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const seq = (customer.initialCorrelative ?? 1) + (customer.orderCount ?? 0);
  return `${code}${String(seq).padStart(3, '0')}`;
}
