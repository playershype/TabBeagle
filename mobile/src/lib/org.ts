import { createContext, useContext } from 'react';
import type { Organization } from '../types';
export const OrganizationContext = createContext<Organization | null>(null);
export function useOrganization() {
  const organization = useContext(OrganizationContext);
  if (!organization) throw new Error('Choose an organization first.');
  return organization;
}
