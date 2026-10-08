import { z } from 'zod';
const calendarDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
});
export const organizationSchema = z.object({
  id: z.string().uuid(), name: z.string(), timezone: z.string(), status: z.literal('ACTIVE'),
});
export const customerSchema = z.object({
  id: z.string().uuid(), organization_id: z.string().uuid(), display_name: z.string(),
  billing_email: z.string().nullable(), status: z.enum(['ACTIVE','ARCHIVED']),
});
export const invoiceSchema = z.object({
  id: z.string().uuid(), organization_id: z.string().uuid(), customer_id: z.string().uuid(),
  invoice_number: z.string(), currency: z.string().regex(/^[A-Z]{3}$/),
  original_amount_minor: z.number().int().nonnegative().safe(),
  outstanding_amount_minor: z.number().int().nonnegative().safe(),
  issue_date: calendarDate, due_date: calendarDate, payment_status: z.enum(['UNPAID','PARTIALLY_PAID','PAID','VOID']),
  customer: z.object({ display_name: z.string(), billing_email: z.string().nullable() }).nullable().optional(),
  ar_case: z.object({ id: z.string().uuid(), state: z.enum(['OPEN','DUE','OVERDUE','PROMISED','DISPUTED','PAUSED','ESCALATED','PAID','CLOSED']), version: z.number().int() }).nullable().optional(),
});
export type Organization = z.infer<typeof organizationSchema>;
export type Customer = z.infer<typeof customerSchema>;
export type Invoice = z.infer<typeof invoiceSchema>;
export type AgingBucket = 'current' | '1-30' | '31-60' | '61-90' | '90+';
export type RootStackParams = {
  Dashboard: undefined; AccountPassword: undefined; AddCustomer: undefined; AddInvoice: undefined; InvoiceDetail: { invoiceId: string };
};
