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
const optionalText = (max: number) => z.string().trim().max(max).nullable().optional();
export const customerProfileFields = z.object({
  contactName: optionalText(120),
  phone: z.string().trim().regex(/^[0-9+()\-. ]{7,30}$/, 'Use a valid phone number.').nullable().optional(),
  alternateEmail: z.string().trim().email().max(254).nullable().optional(),
  companyName: optionalText(160),
  billingAddress: optionalText(300),
  workAddress: optionalText(300),
  paymentTermsDays: z.number().int().min(0).max(365).nullable().optional(),
  remindersEnabled: z.boolean().optional(),
  collectionDay: z.number().int().min(1).max(28).nullable().optional(),
  notes: optionalText(2000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
});
export const customerInput = z.object({
  organizationId: uuid, requestId: uuid,
  displayName: z.string().trim().min(1).max(160),
  billingEmail: z.string().trim().email().max(254).nullable(),
  ...customerProfileFields.shape,
}).strict();
export const customerArchiveInput = z.object({ organizationId: uuid }).strict();
export const customerUpdateInput = z.object({
  organizationId: uuid,
  displayName: z.string().trim().min(1).max(160),
  billingEmail: z.string().trim().email().max(254).nullable(),
  ...customerProfileFields.shape,
}).strict();
/** Maps the camelCase API profile to the snake_case JSON the SQL functions read. */
export function profileForDatabase(i: z.infer<typeof customerProfileFields>) {
  return {
    contact_name: i.contactName ?? null, phone: i.phone ?? null, alternate_email: i.alternateEmail ?? null,
    company_name: i.companyName ?? null, billing_address: i.billingAddress ?? null, work_address: i.workAddress ?? null,
    payment_terms_days: i.paymentTermsDays ?? null, reminders_enabled: i.remindersEnabled ?? true,
    collection_day: i.collectionDay ?? null, notes: i.notes ?? null, tags: i.tags ?? [],
  };
}
export const invoiceInput = z.object({
  organizationId: uuid, customerId: uuid, requestId: uuid,
  invoiceNumber: z.string().trim().min(1).max(80),
  amountMinor: z.number().int().positive().max(999999999999),
  currency: z.literal('USD'), issueDate: date, dueDate: date,
}).strict().refine(value => value.dueDate >= value.issueDate, {
  message: 'Due date cannot precede issue date.', path: ['dueDate'],
});
