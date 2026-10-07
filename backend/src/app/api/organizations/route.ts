import { authenticatedClient, body, databaseError, json, route } from '../../../lib/http';
import { organizationInput } from '../../../lib/validation';
export const dynamic = 'force-dynamic';
export const GET = route(async request => {
  const db = await authenticatedClient(request);
  const { data, error } = await db.from('organizations').select('id,name,timezone,status').order('created_at');
  databaseError(error);
  return json(data);
});
export const POST = route(async request => {
  const db = await authenticatedClient(request);
  const input = await body(request, organizationInput);
  const { data, error } = await db.rpc('create_organization', { p_name: input.name, p_timezone: input.timezone });
  databaseError(error);
  return json(data, 201);
});
