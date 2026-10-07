import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
const A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const V = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const customerKey = '11111111-1111-4111-8111-111111111111';
const invoiceKey = '22222222-2222-4222-8222-222222222222';
async function login(db: PGlite, user: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
  await db.exec('set role authenticated');
}
async function org(db: PGlite, name: string) {
  return (await db.query<{ id: string }>("select * from public.create_organization($1,'America/Puerto_Rico')", [name])).rows[0].id;
}
async function customer(db: PGlite, organization: string, key = customerKey) {
  return (await db.query<{ id: string }>('select * from public.create_customer($1,$2,$3,$4)', [organization, key, 'Test customer', 'billing@example.test'])).rows[0].id;
}
async function invoice(db: PGlite, organization: string, customer: string, key = invoiceKey, amount = 125050, number = 'TB-1001') {
  return (await db.query<{ id: string; outstanding_amount_minor: number }>("select * from public.create_invoice($1,$2,$3,$4,$5,'USD','2026-10-01','2026-11-01')", [organization, customer, key, number, amount])).rows[0];
}
test('real PostgreSQL migration: persisted flow, tenant boundaries, retry binding and protected writes', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'tabbeagle-pg-'));
  let db = new PGlite(directory);
  try {
    // Supabase supplies these roles and auth.uid() in a deployed environment.
    // This shim emulates only the verified JWT identity, not the Auth HTTP service.
    await db.exec(`create role anon; create role authenticated; create schema auth;
      alter default privileges in schema public grant execute on functions to anon, authenticated;
      alter default privileges in schema public grant all on tables to anon, authenticated;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      grant usage on schema public, auth to anon, authenticated;
      insert into auth.users values('${A}'),('${B}'),('${V}');`);
    await db.exec(await readFile(new URL('../supabase/migrations/202610070001_first_persistent_flow.sql', import.meta.url), 'utf8'));
    await login(db, A); const orgA = await org(db, 'Business A');
    const customerA = await customer(db, orgA); const invoiceA = await invoice(db, orgA, customerA);
    await t.test('creates one invoice, one AR case and audit event atomically', async () => {
      assert.equal(Number(invoiceA.outstanding_amount_minor), 125050);
      assert.equal((await db.query('select * from public.ar_cases')).rows.length, 1);
      assert.equal((await db.query("select * from public.audit_events where event_type='INVOICE_AND_CASE_CREATED'")).rows.length, 1);
    });
    await t.test('same request returns the same records; changed payload is rejected', async () => {
      assert.equal(await org(db, 'Business A'), orgA);
      assert.equal(await customer(db, orgA), customerA);
      assert.equal((await invoice(db, orgA, customerA)).id, invoiceA.id);
      await assert.rejects(invoice(db, orgA, customerA, invoiceKey, 42), /Different retry payload/);
      await assert.rejects(db.query('select * from public.create_customer($1,$2,$3,$4)', [orgA,customerKey,'Someone else','billing@example.test']), /Different retry payload/);
      assert.equal((await db.query('select * from public.ar_cases')).rows.length, 1);
    });
    await t.test('duplicate invoice number with another key and invalid amounts do not create extra cases', async () => {
      await assert.rejects(invoice(db, orgA, customerA, '33333333-3333-4333-8333-333333333333'), /unique/);
      await assert.rejects(invoice(db, orgA, customerA, '44444444-4444-4444-8444-444444444444', -1, 'BAD'), /check constraint/);
      assert.equal((await db.query('select * from public.invoices')).rows.length, 1);
    });
    await t.test('client cannot mark paid, forge an audit or change its membership', async () => {
      await assert.rejects(db.query("update public.invoices set payment_status='PAID',outstanding_amount_minor=0"), /permission denied/);
      await assert.rejects(db.query('delete from public.audit_events'), /permission denied/);
      await assert.rejects(db.query("update public.organization_members set role='OWNER'"), /permission denied/);
    });
    await login(db, B); const orgB = await org(db, 'Business B'); const customerB = await customer(db, orgB);
    await t.test('another tenant cannot read or mutate the first tenant', async () => {
      assert.equal((await db.query('select * from public.invoices where id=$1', [invoiceA.id])).rows.length, 0);
      assert.equal((await db.query('select * from public.customers where id=$1', [customerA])).rows.length, 0);
      assert.equal((await db.query('select * from public.audit_events where organization_id=$1', [orgA])).rows.length, 0);
      await assert.rejects(customer(db, orgA), /insufficient_privilege|permission denied/);
      await assert.rejects(invoice(db, orgA, customerA), /insufficient_privilege|permission denied/);
      await assert.rejects(invoice(db, orgB, customerA), /Invalid customer/);
    });
    await t.test('composite foreign key rejects cross-tenant data even for privileged insertion', async () => {
      await db.exec('reset role');
      await assert.rejects(db.query("insert into public.invoices(organization_id,customer_id,invoice_number,currency,original_amount_minor,outstanding_amount_minor,issue_date,due_date,source_record_id) values($1,$2,'FK-TEST','USD',10,10,'2026-10-01','2026-10-02','fk')", [orgA, customerB]), /foreign key/);
      await db.query("insert into public.organization_members(organization_id,user_id,role) values($1,$2,'VIEWER')", [orgA,V]);
      await login(db,V);
      assert.equal((await db.query('select * from public.invoices')).rows.length,1);
      await assert.rejects(customer(db,orgA), /insufficient_privilege|permission denied/);
    });
    await t.test('suspended organization and anonymous callers fail closed', async () => {
      await db.exec('reset role');
      await db.query("update public.organizations set status='SUSPENDED' where id=$1",[orgB]);
      await login(db,B);
      assert.equal((await db.query('select * from public.customers')).rows.length,0);
      await assert.rejects(customer(db,orgB), /insufficient_privilege|permission denied/);
      await db.exec('reset role; set role anon');
      await assert.rejects(org(db,'Anonymous'), /permission denied/);
    });
    await t.test('invoice survives a database close and a fresh connection', async () => {
      await db.close(); db = new PGlite(directory); await login(db,A);
      const rows = (await db.query<{ id: string; original_amount_minor: number }>('select * from public.invoices')).rows;
      assert.equal(rows.length,1); assert.equal(rows[0].id,invoiceA.id); assert.equal(Number(rows[0].original_amount_minor),125050);
    });
  } finally { await db.close(); await rm(directory,{recursive:true,force:true}); }
});
