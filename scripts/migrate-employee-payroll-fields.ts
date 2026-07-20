/**
 * Migration Script: Add Payroll Fields to Existing Employees
 *
 * This script adds payroll-related fields to all existing employees in the users collection:
 * - doj: null (Date of Joining)
 * - pan: null (PAN number)
 * - designation: '' (Job title)
 * - grossSalary: 0 (Monthly gross salary)
 *
 * Usage: npx ts-node scripts/migrate-employee-payroll-fields.ts
 */

import { adminDb } from '../src/lib/firebase-admin';

async function migratePayrollFields() {
  console.log('🚀 Starting migration: Add payroll fields to employees...\n');

  try {
    // Fetch all users
    const usersSnapshot = await adminDb.collection('users').get();

    if (usersSnapshot.empty) {
      console.log('❌ No users found in database.');
      return;
    }

    const totalUsers = usersSnapshot.size;
    console.log(`📊 Found ${totalUsers} users to migrate.\n`);

    // Process users in batches (Firestore limit is 500 operations per batch)
    const batchSize = 499;
    let batch = adminDb.batch();
    let batchCount = 0;
    let processedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();

      // Skip if payroll fields already exist
      if (userData.doj !== undefined && userData.pan !== undefined && userData.designation !== undefined && userData.grossSalary !== undefined) {
        console.log(`⏭️  Skipping ${userData.displayName || userData.email} - already has payroll fields`);
        skippedCount++;
        continue;
      }

      // Add payroll fields
      const updatePayload: any = {
        updatedAt: new Date(),
      };

      if (userData.doj === undefined) updatePayload.doj = null;
      if (userData.pan === undefined) updatePayload.pan = null;
      if (userData.designation === undefined) updatePayload.designation = '';
      if (userData.grossSalary === undefined) updatePayload.grossSalary = 0;

      batch.update(doc.ref, updatePayload);
      batchCount++;
      processedCount++;

      console.log(`✏️  Updated ${userData.displayName || userData.email} with payroll fields`);

      // Commit batch when it reaches the size limit
      if (batchCount === batchSize) {
        await batch.commit();
        console.log(`\n💾 Committed batch of ${batchCount} updates\n`);
        batch = adminDb.batch();
        batchCount = 0;
      }
    }

    // Commit remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`\n💾 Committed final batch of ${batchCount} updates\n`);
    }

    console.log('\n✅ Migration completed!');
    console.log(` Total processed: ${processedCount}`);
    console.log(`✏️  Updated: ${updatedCount || processedCount - skippedCount}`);
    console.log(`⏭️  Skipped (already had fields): ${skippedCount}`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Run migration
migratePayrollFields()
  .then(() => {
    console.log('\n Migration script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n Migration script failed:', error);
    process.exit(1);
  });
