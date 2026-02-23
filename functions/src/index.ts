/**
 * Firebase Cloud Functions - User Role Management Only
 * Push notifications are handled directly via API routes (no Cloud Functions)
 */

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

// Set global options - MUST match your Firebase project region
setGlobalOptions({
  region: "asia-south2", // Match your Firebase project location
  maxInstances: 10,
});

admin.initializeApp();

/**
 * Set custom claims for a user (role and permissions)
 * This is called when a user's role is updated in Firestore
 * CRITICAL: This syncs Firestore roles with Firebase Auth custom claims
 */
export const setUserClaims = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { uid, role, permissions } = request.data;

  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "uid and role are required");
  }

  try {
    // Set custom claims
    await admin.auth().setCustomUserClaims(uid, {
      role,
      permissions: permissions || [],
      isAdmin: role === "admin",
      lastRoleUpdate: new Date().toISOString(),
    });

    console.log(`Custom claims set for user ${uid}: role=${role}`);

    return {
      success: true,
      message: `Custom claims set successfully for user ${uid}`,
    };
  } catch (error: any) {
    console.error("Error setting custom claims:", error);
    throw new HttpsError(
      "internal",
      `Failed to set custom claims: ${error.message}`
    );
  }
});

/**
 * Sync all user roles from Firestore to Firebase Auth custom claims
 * This is a one-time fix function to sync existing users
 */
export const syncAllUserRoles = onCall(async (request) => {
  // Verify user is authenticated and is admin
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  // Check if user is admin
  const callerDoc = await admin.firestore().collection("users").doc(request.auth.uid).get();
  const callerData = callerDoc.data();

  if (!callerData || callerData.role !== "admin") {
    throw new HttpsError("permission-denied", "Only admins can sync user roles");
  }

  try {
    const db = admin.firestore();
    const usersSnapshot = await db.collection("users").get();

    let successCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const userDoc of usersSnapshot.docs) {
      try {
        const userData = userDoc.data();
        const uid = userDoc.id;
        const role = userData.role || "employee";
        const permissions = userData.permissions || [];

        // Set custom claims
        await admin.auth().setCustomUserClaims(uid, {
          role,
          permissions,
          isAdmin: role === "admin",
          lastRoleUpdate: new Date().toISOString(),
          createdAt: userData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        });

        successCount++;
        console.log(`Synced user ${uid}: role=${role}`);
      } catch (error: any) {
        errorCount++;
        errors.push({ uid: userDoc.id, error: error.message });
        console.error(`Error syncing user ${userDoc.id}:`, error);
      }
    }

    return {
      success: true,
      message: `Synced ${successCount} users successfully, ${errorCount} errors`,
      successCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error: any) {
    console.error("Error syncing user roles:", error);
    throw new HttpsError(
      "internal",
      `Failed to sync user roles: ${error.message}`
    );
  }
});

/**
 * Firestore trigger: Sync user role to custom claims when updated
 * This automatically syncs roles whenever they're changed in Firestore
 */
export const syncUserRoleOnUpdate = onDocumentWritten(
  "users/{userId}",
  async (event) => {
    const userId = event.params.userId;
    const afterData = event.data?.after?.data();

    if (!afterData) {
      console.log("User document deleted, skipping claim sync");
      return null;
    }

    const role = afterData.role || "employee";
    const permissions = afterData.permissions || [];

    try {
      // Set custom claims
      await admin.auth().setCustomUserClaims(userId, {
        role,
        permissions,
        isAdmin: role === "admin",
        lastRoleUpdate: new Date().toISOString(),
        createdAt: afterData.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      });

      console.log(`Auto-synced custom claims for user ${userId}: role=${role}`);

      return { success: true };
    } catch (error: any) {
      console.error(`Error auto-syncing claims for user ${userId}:`, error);
      return { success: false, error: error.message };
    }
  }
);
