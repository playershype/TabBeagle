import type { Customer } from '../types';
import type { CustomerProfileInput } from './api';

// Pure form logic for the customer profile. Kept free of React so it can be unit-tested.
export type CustomerDraft = {
  displayName: string; billingEmail: string; contactName: string; phone: string; alternateEmail: string;
  companyName: string; billingAddress: string; workAddress: string; paymentTermsDays: string;
  remindersEnabled: boolean; collectionDay: string; notes: string; tags: string;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[0-9+()\-. ]{7,30}$/;

export function emptyDraft(): CustomerDraft {
  return {
    displayName: '', billingEmail: '', contactName: '', phone: '', alternateEmail: '', companyName: '',
    billingAddress: '', workAddress: '', paymentTermsDays: '30', remindersEnabled: true, collectionDay: '', notes: '', tags: '',
  };
}

export function draftFromCustomer(c: Customer): CustomerDraft {
  return {
    displayName: c.display_name, billingEmail: c.billing_email ?? '', contactName: c.contact_name ?? '',
    phone: c.phone ?? '', alternateEmail: c.alternate_email ?? '', companyName: c.company_name ?? '',
    billingAddress: c.billing_address ?? '', workAddress: c.work_address ?? '',
    paymentTermsDays: c.payment_terms_days == null ? '' : String(c.payment_terms_days),
    remindersEnabled: c.reminders_enabled ?? true, collectionDay: c.collection_day == null ? '' : String(c.collection_day),
    notes: c.notes ?? '', tags: (c.tags ?? []).join(', '),
  };
}

/** Restores a draft saved before an interrupted request. Missing keys from older app versions get defaults. */
export function draftFromPayload(p: Record<string, unknown>): CustomerDraft {
  const text = (v: unknown) => (typeof v === 'string' ? v : '');
  const num = (v: unknown) => (typeof v === 'number' ? String(v) : '');
  const tags = Array.isArray(p.tags) ? p.tags.filter((t): t is string => typeof t === 'string').join(', ') : '';
  return {
    displayName: text(p.displayName), billingEmail: text(p.billingEmail), contactName: text(p.contactName),
    phone: text(p.phone), alternateEmail: text(p.alternateEmail), companyName: text(p.companyName),
    billingAddress: text(p.billingAddress), workAddress: text(p.workAddress),
    paymentTermsDays: num(p.paymentTermsDays) || '30', remindersEnabled: p.remindersEnabled !== false,
    collectionDay: num(p.collectionDay), notes: text(p.notes), tags,
  };
}

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

/** Validates the draft and returns the API payload. Throws with a message the user can read. */
export function toPayload(d: CustomerDraft): CustomerProfileInput {
  const displayName = d.displayName.trim();
  if (!displayName) throw new Error('Enter a customer name.');
  const billingEmail = orNull(d.billingEmail)?.toLowerCase() ?? null;
  if (billingEmail && !EMAIL.test(billingEmail)) throw new Error('Enter a valid billing email or leave it empty.');
  const alternateEmail = orNull(d.alternateEmail)?.toLowerCase() ?? null;
  if (alternateEmail && !EMAIL.test(alternateEmail)) throw new Error('Enter a valid alternate email or leave it empty.');
  const phone = orNull(d.phone);
  if (phone && !PHONE.test(phone)) throw new Error('Enter a valid phone number, with digits and + ( ) - only.');
  const terms = orNull(d.paymentTermsDays);
  const paymentTermsDays = terms === null ? null : Number(terms);
  if (paymentTermsDays !== null && (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0 || paymentTermsDays > 365)) {
    throw new Error('Payment terms must be a whole number of days from 0 to 365.');
  }
  const day = orNull(d.collectionDay);
  const collectionDay = day === null ? null : Number(day);
  if (collectionDay !== null && (!Number.isInteger(collectionDay) || collectionDay < 1 || collectionDay > 28)) {
    throw new Error('Collection day must be from 1 to 28.');
  }
  const notes = orNull(d.notes);
  if (notes && notes.length > 2000) throw new Error('Notes must be 2000 characters or fewer.');
  const tags = d.tags.split(',').map(t => t.trim()).filter(Boolean);
  if (tags.length > 10) throw new Error('Use up to 10 tags.');
  if (tags.some(t => t.length > 30)) throw new Error('Each tag must be 30 characters or fewer.');
  return {
    displayName, billingEmail, contactName: orNull(d.contactName), phone, alternateEmail,
    companyName: orNull(d.companyName), billingAddress: orNull(d.billingAddress), workAddress: orNull(d.workAddress),
    paymentTermsDays, remindersEnabled: d.remindersEnabled, collectionDay, notes, tags,
  };
}

/** Human-readable collection terms for the profile view. */
export function termsLabel(days: number | null | undefined): string {
  return days == null ? 'Not set' : days === 0 ? 'Due on receipt' : `Net ${days}`;
}
