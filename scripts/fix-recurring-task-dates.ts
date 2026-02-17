/**
 * Migration Script: Fix Recurring Task Next Occurrence Dates
 * 
 * This script updates all recurring tasks where nextOccurrence equals startDate
 * to calculate the proper next occurrence based on today's date and the recurrence pattern.
 * 
 * Run this once to fix existing tasks:
 * npx ts-node scripts/fix-recurring-task-dates.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { calculateNextOccurrence, RecurrencePattern } from '../src/utils/recurrence-scheduler';

// Initialize Firebase Admin
if (getApps().length === 0) {
  initializeApp({
    credential: cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = getFirestore();

async function fixRecurringTaskDates() {
  console.log('🔧 Starting migration: Fix recurring task next occurrence dates...\n');

  try {
    // Get all recurring tasks
    const tasksSnapshot = await db.collection('recurring-tasks').get();
    console.log(`📊 Found ${tasksSnapshot.size} recurring tasks\n`);

    let updatedCount = 0;
    let skippedCount = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const doc of tasksSnapshot.docs) {
      const task = doc.data();
      const taskId = doc.id;

      // Convert Firestore Timestamps to Dates
      const startDate = task.startDate?.toDate ? task.startDate.toDate() : new Date(task.startDate);
      const nextOccurrence = task.nextOccurrence?.toDate ? task.nextOccurrence.toDate() : new Date(task.nextOccurrence);
      
      startDate.setHours(0, 0, 0, 0);
      nextOccurrence.setHours(0, 0, 0, 0);

      // Check if nextOccurrence equals startDate (needs fixing)
      const needsUpdate = nextOccurrence.getTime() === startDate.getTime() && startDate <= today;

      if (needsUpdate) {
        // Calculate the correct next occurrence
        const newNextOccurrence = calculateNextOccurrence(today, task.recurrencePattern as RecurrencePattern);
        
        console.log(`✏️  Updating task: ${task.title}`);
        console.log(`   Pattern: ${task.recurrencePattern}`);
        console.log(`   Start Date: ${startDate.toLocaleDateString()}`);
        console.log(`   Old Next Occurrence: ${nextOccurrence.toLocaleDateString()}`);
        console.log(`   New Next Occurrence: ${newNextOccurrence.toLocaleDateString()}\n`);

        // Update the task
        await db.collection('recurring-tasks').doc(taskId).update({
          nextOccurrence: newNextOccurrence,
        });

        updatedCount++;
      } else {
        console.log(`⏭️  Skipping task: ${task.title} (already has correct next occurrence)`);
        skippedCount++;
      }
    }

    console.log('\n✅ Migration completed!');
    console.log(`   Updated: ${updatedCount} tasks`);
    console.log(`   Skipped: ${skippedCount} tasks`);
    console.log(`   Total: ${tasksSnapshot.size} tasks`);

  } catch (error) {
    console.error('❌ Error during migration:', error);
    throw error;
  }
}

// Run the migration
fixRecurringTaskDates()
  .then(() => {
    console.log('\n🎉 Migration script finished successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Migration script failed:', error);
    process.exit(1);
  });
