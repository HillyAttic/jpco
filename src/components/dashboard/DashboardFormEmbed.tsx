'use client';

import React, { useState, useEffect } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DashboardFormEmbed() {
  const { user } = useAuthEnhanced();
  const [formUrl, setFormUrl] = useState('');
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchConfig();
    }
  }, [user]);

  const fetchConfig = async () => {
    try {
      const response = await authenticatedFetch('/api/mis-config');
      const data = await response.json();

      if (response.ok && data.success) {
        setFormUrl(data.data.formUrl || '');
        setHasAccess(data.data.hasFormAccess || false);
      }
    } catch (error) {
      console.error('Error fetching form config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !hasAccess || !formUrl) {
    return null;
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>MIS Form</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
          <iframe
            src={formUrl}
            width="100%"
            height="997"
            style={{ border: 0 }}
            referrerPolicy="no-referrer-when-downgrade"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            title="MIS Form"
            loading="lazy"
            className="w-full"
          />
        </div>
      </CardContent>
    </Card>
  );
}
