import { z } from 'zod';
import { getSupabase } from './supabase';
import { config } from './config';
import { customerSchema, invoiceSchema, organizationSchema } from '../types';
async function request<T>(path: string, schema: z.ZodType<T>, input?: unknown): Promise<T> {
  const { data, error } = await getSupabase().auth.getSession();
  if (error || !data.session) throw new Error('Sign in to continue.');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(`${config.apiUrl}${path}`, {
      method: input === undefined ? 'GET' : 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
      ...(input === undefined ? {} : { body: JSON.stringify(input) }),
    });
    const result: unknown = await res.json().catch(() => null);
    if (!res.ok) {
      if (res.status === 401) {
        await getSupabase().auth.signOut({ scope: 'local' });
        throw new Error('Your session expired. Sign in again.');
      }
      const message = z.object({ error: z.string() }).safeParse(result);
      throw new Error(message.success ? message.data.error : 'The server could not complete the request.');
    }
    const parsed = schema.safeParse(result);
    if (!parsed.success) throw new Error('The server returned an unexpected response. Please contact support.');
    return parsed.data;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') throw new Error('Connection timed out. Retry with the same details; your record will not be duplicated.');
    throw error;
  } finally { clearTimeout(timer); }
}
export const fetchOrganizations = () => request('/api/organizations', organizationSchema.array());
export const createOrganization = (name: string, timezone: string) => request('/api/organizations', organizationSchema, { name, timezone });
export const fetchCustomers = (organizationId: string) => request(`/api/customers?organizationId=${organizationId}`, customerSchema.array());
export const createCustomer = (input: { organizationId: string; requestId: string; displayName: string; billingEmail: string | null }) => request('/api/customers', customerSchema, input);
export const fetchInvoices = (organizationId: string) => request(`/api/invoices?organizationId=${organizationId}`, invoiceSchema.array());
export const createInvoice = (input: { organizationId: string; customerId: string; requestId: string; invoiceNumber: string; amountMinor: number; currency: 'USD'; issueDate: string; dueDate: string }) => request('/api/invoices', invoiceSchema, input);
export const fetchInvoice = (id: string) => request(`/api/invoices/${id}`, invoiceSchema);
