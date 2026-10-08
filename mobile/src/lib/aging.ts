import type { Invoice, AgingBucket } from '../types';
export function isDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
export function amountMinor(value: string): number {
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value.trim())) throw new Error('Enter a positive amount with up to two decimals.');
  const [whole, fraction = ''] = value.trim().split('.');
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents <= 0 || cents > 999999999999) throw new Error('Amount is outside the allowed range.');
  return cents;
}
export function todayIn(timezone: string, now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(now);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function daysOverdue(dueDate: string, today: string): number {
  if (!isDate(dueDate) || !isDate(today)) throw new Error('Invalid invoice date.');
  return Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(dueDate + 'T00:00:00Z')) / 86400000);
}
export function bucketOf(invoice: Invoice, today: string): AgingBucket | 'settled' {
  if (['PAID','VOID'].includes(invoice.payment_status)) return 'settled';
  const days = daysOverdue(invoice.due_date, today);
  if (days <= 0) return 'current';
  if (days <= 30) return '1-30';
  if (days <= 60) return '31-60';
  if (days <= 90) return '61-90';
  return '90+';
}
export function fmtMoney(minor: number, currency = 'USD') {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(minor / 100);
}
export function outstandingByCurrency(invoices: Invoice[]): Record<string, number> {
  return invoices.filter(i => !['PAID','VOID'].includes(i.payment_status)).reduce((totals, invoice) => {
    totals[invoice.currency] = (totals[invoice.currency] ?? 0) + invoice.outstanding_amount_minor;
    return totals;
  }, {} as Record<string, number>);
}
