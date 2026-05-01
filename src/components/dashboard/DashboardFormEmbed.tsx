'use client';

import React, { useState, useEffect } from 'react';
import { useAuthEnhanced } from '@/hooks/use-auth-enhanced';
import { authenticatedFetch } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormRenderer } from '@/components/forms/renderer/FormRenderer';
import type { FormTemplate } from '@/types/form.types';
import { toast } from 'react-toastify';

export default function DashboardFormEmbed() {
  const { user } = useAuthEnhanced();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const fieldIdCounter = React.useRef(0);

  useEffect(() => {
    if (user) {
      fetchFormData();
    }
  }, [user]);

  const fetchFormData = async () => {
    try {
      // Get MIS config to check access and get form template ID
      const configResponse = await authenticatedFetch('/api/mis-config');
      const configData = await configResponse.json();

      if (!configResponse.ok || !configData.success) {
        console.error('Failed to load MIS config');
        setLoading(false);
        return;
      }

      const hasFormAccess = configData.data.hasFormAccess || false;
      const dailyFormTemplateId = configData.data.dailyFormTemplateId;

      setHasAccess(hasFormAccess);

      // If user has access and there's a form configured, fetch the template
      if (hasFormAccess && dailyFormTemplateId) {
        const templateResponse = await authenticatedFetch(
          `/api/forms/templates/${dailyFormTemplateId}`
        );

        if (templateResponse.ok) {
          const templateResult = await templateResponse.json();
          if (templateResult.success && templateResult.template) {
            // Fix duplicate field IDs if they exist
            const fetchedTemplate = templateResult.template;
            const seenIds = new Set<string>();
            const fixedFields = fetchedTemplate.fields.map((field: any) => {
              if (seenIds.has(field.id)) {
                // Generate new unique ID for duplicate
                return { ...field, id: `field_${Date.now()}_${fieldIdCounter.current++}` };
              }
              seenIds.add(field.id);
              return field;
            });

            setTemplate({ ...fetchedTemplate, fields: fixedFields });
          }
        }
      }
    } catch (error) {
      console.error('Error fetching form data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = (submissionId: string) => {
    toast.success('Form submitted successfully!');
    // Optionally refresh the form or hide it after submission
    // For now, just keep it visible so user can submit again if needed
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  // Don't render anything if loading, no access, or no template
  if (loading || !hasAccess || !template) {
    return null;
  }

  // Don't render if form is not published
  if (template.status !== 'published') {
    return null;
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle>Daily MIS Form</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <FormRenderer
            template={template}
            onSuccess={handleSuccess}
            onError={handleError}
          />
        </div>
      </CardContent>
    </Card>
  );
}
