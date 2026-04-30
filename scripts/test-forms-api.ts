/**
 * Test script to verify forms API and create sample data if needed
 */

import { adminDb } from '../src/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

async function testFormsCollection() {
  try {
    console.log('Testing form_templates collection...');

    // Try to fetch all templates
    const snapshot = await adminDb.collection('form_templates').get();
    console.log(`Found ${snapshot.size} templates in collection`);

    if (snapshot.empty) {
      console.log('Collection is empty. Creating a sample template...');

      const sampleTemplate = {
        title: 'Sample Contact Form',
        description: 'A simple contact form for testing',
        status: 'draft',
        fields: [
          {
            id: 'field_name',
            type: 'text',
            label: 'Full Name',
            required: true,
            order: 0,
          },
          {
            id: 'field_email',
            type: 'email',
            label: 'Email Address',
            required: true,
            order: 1,
          },
          {
            id: 'field_message',
            type: 'textarea',
            label: 'Message',
            required: true,
            order: 2,
          },
        ],
        settings: {
          submitButtonText: 'Submit',
          successMessage: 'Thank you for your submission!',
          allowMultipleSubmissions: false,
        },
        accessControl: {
          type: 'authenticated',
        },
        createdBy: 'system',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        submissionCount: 0,
      };

      const docRef = await adminDb.collection('form_templates').add(sampleTemplate);
      console.log('Sample template created with ID:', docRef.id);
    } else {
      console.log('Templates found:');
      snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`  - ${doc.id}: ${data.title} (${data.status})`);
      });
    }

    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error testing forms collection:', error);
    throw error;
  }
}

testFormsCollection()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
