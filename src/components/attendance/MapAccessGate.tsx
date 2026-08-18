/**
 * MapAccessGate
 * Thin wrapper that configures PasswordModal for map location access.
 * Uses its own MAP_ACCESS_PASSWORD endpoint (independent of payroll).
 */

'use client';

import { MapPin } from 'lucide-react';
import { PasswordModal } from '@/components/ui/PasswordModal';
import type { PasswordAccessGateConfig } from '@/components/ui/PasswordAccessGate';

const config: PasswordAccessGateConfig = {
  title: 'Map Access',
  subtitle: 'Password required to view locations',
  icon: MapPin,
  apiEndpoint: '/api/map/verify-access',
  storageKeyPrefix: 'map_access',
  gradient: 'from-blue-600 via-cyan-600 to-teal-600',
};

interface MapAccessGateProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MapAccessGate({ isOpen, onClose, onSuccess }: MapAccessGateProps) {
  return (
    <PasswordModal
      isOpen={isOpen}
      onClose={onClose}
      onSuccess={onSuccess}
      config={config}
    />
  );
}
