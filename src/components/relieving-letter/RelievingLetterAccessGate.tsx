/**
 * RelievingLetterAccessGate
 * Password gate for the Relieving Letter page.
 * Uses the shared PasswordAccessGate component.
 */

'use client';

import { FileText } from 'lucide-react';
import { PasswordAccessGate, type PasswordAccessGateConfig } from '@/components/ui/PasswordAccessGate';

const config: PasswordAccessGateConfig = {
  title: 'Relieving Letter',
  subtitle: 'Password required to access this page',
  icon: FileText,
  apiEndpoint: '/api/relieving-letters/verify-access',
  storageKeyPrefix: 'relieving_letter',
};

export function RelievingLetterAccessGate({ children }: { children: React.ReactNode }) {
  return <PasswordAccessGate config={config}>{children}</PasswordAccessGate>;
}
