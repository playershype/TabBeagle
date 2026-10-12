-- Customer archive (soft delete). Customers keep invoice history, so they are archived, never removed.
-- Customers with unpaid invoices cannot be archived, so no open balance disappears from collections.
create function public.archive_customer(p_organization_id uuid, p_customer_id uuid)
returns public.customers language plpgsql security definer set search_path = '' as $$
declare result public.customers;
begin
  if not public.is_organization_member(p_organization_id,true) then raise insufficient_privilege; end if;
  if exists(select 1 from public.invoices where organization_id = p_organization_id and customer_id = p_customer_id
            and payment_status in ('UNPAID','PARTIALLY_PAID')) then
    raise exception 'Customer has unpaid invoices' using errcode = 'P0004';
  end if;
  update public.customers set status = 'ARCHIVED', updated_at = now()
    where organization_id = p_organization_id and id = p_customer_id and status = 'ACTIVE'
    returning * into result;
  if not found then raise exception 'Customer not found' using errcode = 'P0002'; end if;
  insert into public.audit_events(organization_id,event_type,actor_id,correlation_id,outcome)
    values(p_organization_id,'CUSTOMER_ARCHIVED',auth.uid(),gen_random_uuid(),jsonb_build_object('customer_id',result.id));
  return result;
end;
$$;

revoke all on function public.archive_customer(uuid,uuid) from public, anon, authenticated;
grant execute on function public.archive_customer(uuid,uuid) to authenticated;
