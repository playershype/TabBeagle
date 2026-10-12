import { authenticatedClient, body, databaseError, HttpError, json, route } from '../../../../lib/http';
import { customerArchiveInput, customerUpdateInput, profileForDatabase, uuid } from '../../../../lib/validation';
export const dynamic = 'force-dynamic';
const customerId = (request: Request) => uuid.parse(new URL(request.url).pathname.split('/').pop());
export const GET = route(async request => {
  const db = await authenticatedClient(request);
  const { data, error } = await db.from('customers').select('*').eq('id', customerId(request)).maybeSingle();
  databaseError(error);
  if (!data) throw new HttpError(404, 'Customer not found.');
  return json(data);
});
export const PATCH = route(async request => {
  const db = await authenticatedClient(request);
  const i = await body(request, customerUpdateInput);
  const { data, error } = await db.rpc('update_customer_profile', {
    p_organization_id: i.organizationId, p_customer_id: customerId(request),
    p_display_name: i.displayName, p_billing_email: i.billingEmail, p_profile: profileForDatabase(i),
  });
  // P0002 = the customer does not exist in this organization (or is archived).
  if (error?.code === 'P0002') throw new HttpError(404, 'Customer not found.');
  databaseError(error);
  return json(data);
});
// Archiving hides the customer from lists and keeps the invoice history. Customers with unpaid invoices are refused.
export const DELETE = route(async request => {
  const db = await authenticatedClient(request);
  const i = await body(request, customerArchiveInput);
  const { data, error } = await db.rpc('archive_customer', { p_organization_id: i.organizationId, p_customer_id: customerId(request) });
  if (error?.code === 'P0002') throw new HttpError(404, 'Customer not found.');
  if (error?.code === 'P0004') throw new HttpError(409, 'This customer has unpaid invoices. Mark them paid or void them before archiving.');
  databaseError(error);
  return json(data);
});
