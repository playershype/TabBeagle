import { authenticatedClient, databaseError, HttpError, json, route } from '../../../../lib/http';
import { uuid } from '../../../../lib/validation';
export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const db = await authenticatedClient(request);
  const id = uuid.parse(new URL(request.url).pathname.split('/').pop());
  const { data, error } = await db.from('invoices').select('*,customer:customers(display_name,billing_email),ar_case:ar_cases(id,state,version)').eq('id', id).maybeSingle();
  databaseError(error);
  if (!data) throw new HttpError(404, 'Invoice not found.');
  return json(data);
});
