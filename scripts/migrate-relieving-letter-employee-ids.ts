#!/usr/bin/env node
/**
 * Migration Script: Normalize Relieving Letter employeeId to Auth UID
 *
 * Relieving letters must store `employeeId` as the Firebase Auth UID (the users
 * doc id), per the RelievingLetter type contract. Some existing letters were
 * created with the employee NUMBER (e.g. "EMP160") instead. That breaks the
 * employee self-service page, which queries `where('employeeId','==', uid)` —
 * employees could never see their letters even when access was granted.
 *
 * This script resolves each letter's employeeId to the correct Auth UID and
 * updates the document. The `accessGranted` (toggle) state is preserved.
 *
 * Usage:
 *   npm run migrate:relieving-letter-employee-ids
 */

import { config } from 'dotenv';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Initialize Firebase Admin (inline, so dotenv runs before init)
if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const projectId = process.env.FIREBASE_PROJECT_ID || 'jpcopanel';
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (serviceAccountKey) {
    try {
      const serviceAccount = JSON.parse(serviceAccountKey);
      initializeApp({ credential: cert(serviceAccount), projectId });
    } catch (error) {
      console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT_KEY:', error);
      process.exit(1);
    }
  } else if (clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else {
    console.error('❌ Firebase credentials not found in .env.local');
    process.exit(1);
  }
}

const db = getFirestore();

interface Letter {
  id: string;
  letterNumber?: string;
  employeeId?: string;
  employeeName?: string;
  accessGranted?: boolean;
}

/**
 * Resolve a letter's employeeId to the real Auth UID.
 * Mirrors resolveEmployeeUid in src/app/api/relieving-letters/[id]/route.ts.
 * Returns null if no matching user is found.
 */
async function resolveUid(employeeId: string): Promise<string | null> {
  if (!employeeId) return null;

  // Case 1: employeeId is already the user doc id (uid)
  const directDoc = await db.collection('users').doc(employeeId).get();
  if (directDoc.exists) return employeeId;

  // Case 2: employeeId is the employee number — find the user doc by that field
  const byEmployeeId = await db
    .collection('users')
    .where('employeeId', '==', employeeId)
    .limit(1)
    .get();
  if (!byEmployeeId.empty) return byEmployeeId.docs[0].id;

  return null;
}

async function migrate() {
  console.log('🚀 Starting migration: Normalize relieving letter employeeId → Auth UID\n');

  const lettersSnapshot = await db.collection('relieving-letters').get();

  if (lettersSnapshot.empty) {
    console.log('ℹ️  No relieving letters found');
    return;
  }

  const letters = lettersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Letter[];
  console.log(`📊 Found ${letters.length} relieving letter(s)\n`);

  const batch = db.batch();
  let updatedCount = 0;
  let skippedCount = 0;
  let unresolvedCount = 0;

  for (const letter of letters) {
    const storedEmployeeId = letter.employeeId;
    if (!storedEmployeeId) {
      console.log(`⏭️  ${letter.letterNumber} - no employeeId, skipped`);
      skippedCount++;
      continue;
    }

    const resolvedUid = await resolveUid(storedEmployeeId);

    if (!resolvedUid) {
      console.log(
        `⚠️  ${letter.letterNumber} (${letter.employeeName || 'unknown'}) - could not resolve uid for "${storedEmployeeId}", left unchanged`
      );
      unresolvedCount++;
      continue;
    }

    if (resolvedUid === storedEmployeeId) {
      console.log(
        `⏭️  ${letter.letterNumber} (${letter.employeeName || 'unknown'}) - already uid, skipped`
      );
      skippedCount++;
      continue;
    }

    batch.update(db.collection('relieving-letters').doc(letter.id), {
      employeeId: resolvedUid,
      updatedAt: new Date(),
    });
    updatedCount++;
    console.log(
      `✅ ${letter.letterNumber} (${letter.employeeName || 'unknown'}): "${storedEmployeeId}" → "${resolvedUid}"`
    );
  }

  if (updatedCount > 0) {
    console.log(`\n📝 Committing ${updatedCount} update(s)...`);
    await batch.commit();
  }

  console.log('\n✨ Migration complete!');
  console.log('📊 Summary:');
  console.log(`   - Total letters:      ${letters.length}`);
  console.log(`   - Updated (→ uid):    ${updatedCount}`);
  console.log(`   - Skipped (already):  ${skippedCount}`);
  console.log(`   - Unresolved:         ${unresolvedCount}`);
}

migrate()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });
