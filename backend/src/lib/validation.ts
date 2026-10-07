import { z } from 'zod';

export const uuid = z.string().uuid();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z');
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Use a real calendar date (YYYY-MM-DD).');
export const organizationInput = z.object({
  name: z.string().trim().min(1).max(120),
  timezone: z.string().max(80).refine(value => {
    try { new Intl.DateTimeFormat('en', { timeZone: value }); return true; } catch { return false; }
  }, 'Invalid timezone.'),
}).strict();
export const customerInput = z.object({
  organizationId: uuid, requestId: uuid,
  displayName: z.string().trim().min(1).max(160),
  billingEmail: z.string().trim().email().max(254).nullable(),
}).strict();
export const invoiceInput = z.object({
  organizationId: uuid, customerId: uuid, requestId: uuid,
  invoiceNumber: z.string().trim().min(1).max(80),
  amountMinor: z.number().int().positive().max(999999999999),
  currency: z.literal('USD'), issueDate: date, dueDate: date,
}).strict().refine(value => value.dueDate >= value.issueDate, {
  message: 'Due date cannot precede issue date.', path: ['dueDate'],
});
