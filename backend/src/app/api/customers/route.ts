import { authenticatedClient, body, databaseError, json, route } from '../../../lib/http';
import { customerInput, profileForDatabase, uuid } from '../../../lib/validation';
export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const db = await authenticatedClient(request);
  const org = uuid.parse(new URL(request.url).searchParams.get('organizationId'));
  const { data, error } = await db.from('customers').select('*').eq('organization_id', org).order('display_name');
  databaseError(error);
  return json(data);
});
export const POST = route(async request => {
  const db = await authenticatedClient(request);
  const i = await body(request, customerInput);
  const { data, error } = await db.rpc('create_customer_profile', {
    p_organization_id: i.organizationId, p_request_id: i.requestId,
    p_display_name: i.displayName, p_billing_email: i.billingEmail,
    p_profile: profileForDatabase(i),
  });
  databaseError(error);
  return json(data, 201);
});
