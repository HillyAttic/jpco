/**
 * PayrollAccessGate
 * Password gate for the Payroll Panel page (/admin/salary-config).
 * Uses the shared PasswordAccessGate component.
 */

'use client';

import { IndianRupee } from 'lucide-react';
import { PasswordAccessGate, type PasswordAccessGateConfig } from '@/components/ui/PasswordAccessGate';

const config: PasswordAccessGateConfig = {
  title: 'Payroll Panel',
  subtitle: 'Password required to access this page',
  icon: IndianRupee,
  apiEndpoint: '/api/payroll/verify-access',
  storageKeyPrefix: 'payroll',
};

export function PayrollAccessGate({ children }: { children: React.ReactNode }) {
  return <PasswordAccessGate config={config}>{children}</PasswordAccessGate>;
}
