/**
 * Firebase Connection Test Script
 * Run this to diagnose Firebase connectivity and configuration issues
 */

import { db } from '../src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

async function testFirebaseConnection() {
  console.log('🔍 Testing Firebase Connection...\n');

  try {
    // Test 1: Check if db is initialized
    console.log('✓ Firebase db object initialized:', !!db);
    console.log('  App name:', db.app.name);
    console.log('  Project ID:', db.app.options.projectId);

    // Test 2: Try to read from employees collection
    console.log('\n📋 Testing employees collection access...');
    const employeesRef = collection(db, 'employees');
    const snapshot = await getDocs(employeesRef);
    
    console.log('✓ Successfully accessed employees collection');
    console.log(`  Documents found: ${snapshot.size}`);
    
    if (snapshot.size > 0) {
      console.log('\n  Sample documents:');
      snapshot.docs.slice(0, 3).forEach((doc, index) => {
        console.log(`    ${index + 1}. ID: ${doc.id}`);
        console.log(`       Data keys: ${Object.keys(doc.data()).join(', ')}`);
      });
    } else {
      console.log('  ⚠️  No documents found in employees collection');
      console.log('     This is normal if you haven\'t added any employees yet.');
    }

    console.log('\n✅ Firebase connection test completed successfully!');
    
  } catch (error: any) {
    console.error('\n❌ Firebase connection test failed!');
    console.error('\nError details:');
    console.error('  Type:', typeof error);
    console.error('  Constructor:', error?.constructor?.name);
    console.error('  Code:', error?.code);
    console.error('  Message:', error?.message);
    console.error('  Keys:', error && typeof error === 'object' ? Object.keys(error) : []);
    console.error('\nFull error object:', error);
    
    if (error?.code === 'permission-denied') {
      console.error('\n💡 Suggestion: Check your Firestore security rules.');
      console.error('   For development, you can use:');
      console.error('   rules_version = \'2\';');
      console.error('   service cloud.firestore {');
      console.error('     match /databases/{database}/documents {');
      console.error('       match /{document=**} {');
      console.error('         allow read, write: if true;');
      console.error('       }');
      console.error('     }');
      console.error('   }');
    }
    
    if (error?.code === 'failed-precondition') {
      console.error('\n💡 Suggestion: You may need to create a composite index.');
      console.error('   Check the Firebase Console for index creation links.');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirebaseConnection();
