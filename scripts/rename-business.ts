/**
 * Script to rename "My First Business" to "Personal"
 * Run this once to update existing businesses in Firestore
 */

import { collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import { db } from '../src/lib/firebase';

const BUSINESSES_COLLECTION = 'kanban_businesses';

async function renameBusinesses() {
  try {
    console.log('Starting business rename process...');
    
    // Query for businesses named "My First Business"
    const businessesRef = collection(db, BUSINESSES_COLLECTION);
    const q = query(businessesRef, where('name', '==', 'My First Business'));
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No businesses found with name "My First Business"');
      return;
    }
    
    console.log(`Found ${snapshot.size} business(es) to rename`);
    
    // Update each business
    let count = 0;
    for (const docSnapshot of snapshot.docs) {
      const businessRef = doc(db, BUSINESSES_COLLECTION, docSnapshot.id);
      await updateDoc(businessRef, {
        name: 'Personal',
        description: 'Personal workspace'
      });
      count++;
      console.log(`✓ Renamed business ${docSnapshot.id}`);
    }
    
    console.log(`\n✅ Successfully renamed ${count} business(es) to "Personal"`);
  } catch (error) {
    console.error('❌ Error renaming businesses:', error);
    throw error;
  }
}

// Run the script
renameBusinesses()
  .then(() => {
    console.log('\n🎉 Migration complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration failed:', error);
    process.exit(1);
  });
