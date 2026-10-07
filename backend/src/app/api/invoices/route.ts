import { authenticatedClient, body, databaseError, HttpError, json, route } from '../../../lib/http';
import { invoiceInput, uuid } from '../../../lib/validation';
export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const db = await authenticatedClient(request);
  const org = uuid.parse(new URL(request.url).searchParams.get('organizationId'));
  const { data, error } = await db.from('invoices').select('*,customer:customers(display_name,billing_email),ar_case:ar_cases(id,state,version)').eq('organization_id', org).order('due_date').limit(501);
  databaseError(error);
  if ((data?.length ?? 0) > 500) throw new HttpError(409, 'This pilot supports up to 500 invoices per business. Contact support before adding more.');
  return json(data);
});
export const POST = route(async request => {
  const db = await authenticatedClient(request);
  const i = await body(request, invoiceInput);
  const { data, error } = await db.rpc('create_invoice', {
    p_organization_id: i.organizationId, p_customer_id: i.customerId, p_request_id: i.requestId,
    p_invoice_number: i.invoiceNumber, p_amount_minor: i.amountMinor, p_currency: i.currency,
    p_issue_date: i.issueDate, p_due_date: i.dueDate,
  });
  databaseError(error);
  return json(data, 201);
});
