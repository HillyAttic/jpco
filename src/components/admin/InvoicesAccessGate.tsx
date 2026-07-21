/**
 * InvoicesAccessGate
 * Password gate for the Pending Invoices page (/admin/pending-invoices).
 * Uses the shared PasswordAccessGate component.
 */

'use client';

import { Receipt } from 'lucide-react';
import { PasswordAccessGate, type PasswordAccessGateConfig } from '@/components/ui/PasswordAccessGate';

const config: PasswordAccessGateConfig = {
  title: 'Pending Invoices',
  subtitle: 'Password required to access this page',
  icon: Receipt,
  apiEndpoint: '/api/invoices/verify-access',
  storageKeyPrefix: 'invoices',
  gradient: 'from-emerald-600 via-teal-600 to-cyan-700',
};

export function InvoicesAccessGate({ children }: { children: React.ReactNode }) {
  return <PasswordAccessGate config={config}>{children}</PasswordAccessGate>;
}
