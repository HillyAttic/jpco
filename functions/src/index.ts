/**
 * Firebase Cloud Functions for Push Notifications
 * TypeScript version - Using v2 API
 * VERSION: 2.0 - Fixed for Android PWA background notifications
 */

import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
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
 * Send push notification when a new notification document is created
 * Triggers automatically when a document is added to the 'notifications' collection
 */
export const sendPushNotification = onDocumentCreated(
  "notifications/{notificationId}",
  async (event) => {
    const snap = event.data;
    if (!snap) {
      console.log("No data associated with the event");
      return null;
    }

    const notification = snap.data();
    const notificationId = event.params.notificationId;

    console.log("New notification created:", notificationId);
    console.log("Notification data:", JSON.stringify(notification));

    // Skip if already sent
    if (notification.sent) {
      console.log("Notification already sent, skipping");
      return null;
    }

    // Get FCM token - check the document first, then look up by userId
    let fcmToken = notification.fcmToken;

    if (!fcmToken && notification.userId) {
      // Try to get the token from the fcmTokens collection
      console.log("No fcmToken in notification doc, looking up by userId:", notification.userId);
      try {
        const tokenDoc = await admin.firestore()
          .collection("fcmTokens")
          .doc(notification.userId)
          .get();

        if (tokenDoc.exists) {
          fcmToken = tokenDoc.data()?.token;
          console.log("Found FCM token from fcmTokens collection");
        }
      } catch (error) {
        console.error("Error looking up FCM token:", error);
      }
    }

    if (!fcmToken) {
      console.error("No FCM token found for notification:", notificationId);
      await snap.ref.update({
        sent: false,
        error: "No FCM token available (not in doc, not in fcmTokens collection)",
      });
      return null;
    }

    // Construct DATA-ONLY message for web push
    // IMPORTANT: Do NOT include top-level 'notification' payload!
    // When FCM sees a 'notification' payload, it auto-displays a basic
    // notification and BYPASSES the service worker's onBackgroundMessage.
    // By using data-only, our service worker gets full control over
    // the notification display (requireInteraction, vibrate, heads-up, etc.)
    const titleText = notification.title || "New Notification";
    const bodyText = notification.body || notification.message || "You have a new notification";

    // All data values MUST be strings for FCM data messages
    const dataPayload: { [key: string]: string } = {
      title: titleText,
      body: bodyText,
      icon: "/images/logo/logo-icon.svg",
      badge: "/images/logo/logo-icon.svg",
      url: notification.data?.url || notification.actionUrl || "/notifications",
      notificationId: notificationId,
      type: notification.data?.type || notification.type || "general",
      taskId: notification.data?.taskId || notification.metadata?.taskId || "",
      timestamp: Date.now().toString(),
    };

    // For PWA on Android, we use web push ONLY.
    // The 'android' block only applies to native Android apps with Firebase SDK.
    // The 'apns' block only applies to native iOS apps.
    // Our PWA runs in Chrome, so ONLY the 'webpush' config matters.
    const message: admin.messaging.Message = {
      // NO top-level 'notification' key - this is intentional for background!
      data: dataPayload,
      token: fcmToken,
      webpush: {
        headers: {
          Urgency: "high",  // Tells push service to wake device immediately
          TTL: "86400",     // 24 hours - keep message if device is offline
        },
        fcmOptions: {
          link: notification.data?.url || notification.actionUrl || "/notifications",
        },
        // No webpush.notification - let service worker handle it fully
      },
      // NOTE: 'android' and 'apns' blocks are NOT included because this is a PWA.
      // PWAs on Android use the webpush protocol, not the native Android push.
      // Including android.notification would have NO effect on Chrome PWA.
    };

    try {
      // Send the notification via FCM
      const response = await admin.messaging().send(message);

      console.log("Notification sent successfully:", response);

      // Mark as sent in Firestore
      await snap.ref.update({
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        messageId: response,
      });

      return { success: true, messageId: response };
    } catch (error: any) {
      console.error("Error sending notification:", error);

      // Handle specific FCM error codes
      let errorAction = "none";
      if (error.code === "messaging/invalid-registration-token" ||
        error.code === "messaging/registration-token-not-registered") {
        // Token is invalid or expired - clean it up
        errorAction = "token_cleanup";
        console.log("Invalid token detected, cleaning up...");

        if (notification.userId) {
          try {
            await admin.firestore()
              .collection("fcmTokens")
              .doc(notification.userId)
              .delete();
            console.log("Cleaned up invalid token for user:", notification.userId);
          } catch (cleanupError) {
            console.error("Error cleaning up token:", cleanupError);
          }
        }
      }

      // Update with error information
      await snap.ref.update({
        sent: false,
        error: error.message,
        errorCode: error.code,
        errorAction,
      });

      return { success: false, error: error.message };
    }
  }
);

/**
 * Clean up old notifications (optional)
 * Runs daily to delete notifications older than 30 days
 * Note: Uses asia-south1 because Cloud Scheduler doesn't support asia-south2
 */
export const cleanupOldNotifications = onSchedule(
  {
    schedule: "every 24 hours",
    region: "asia-south1", // Cloud Scheduler supported region
  },
  async (event) => {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await db
      .collection("notifications")
      .where("createdAt", "<", thirtyDaysAgo)
      .get();

    const batch = db.batch();
    let count = 0;

    oldNotifications.forEach((doc) => {
      batch.delete(doc.ref);
      count++;
    });

    if (count > 0) {
      await batch.commit();
      console.log(`Deleted ${count} old notifications`);
    } else {
      console.log("No old notifications to delete");
    }

    // Return void for onSchedule
    return;
  }
);

/**
 * Handle FCM token refresh (optional)
 * Updates user's FCM token when it changes
 */
export const updateFCMToken = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const { token } = request.data;
  const userId = request.auth.uid;

  if (!token) {
    throw new HttpsError("invalid-argument", "Token is required");
  }

  try {
    const db = admin.firestore();
    await db
      .collection("fcmTokens")
      .doc(userId)
      .set(
        {
          token,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

    return { success: true };
  } catch (error: any) {
    console.error("Error updating FCM token:", error);
    throw new HttpsError("internal", "Failed to update FCM token");
  }
});

/**
 * Send test notification (for debugging)
 * Call this function to test push notifications
 */
export const sendTestNotification = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const userId = request.auth.uid;

  try {
    const db = admin.firestore();

    // Get user's FCM token
    const tokenDoc = await db.collection("fcmTokens").doc(userId).get();

    if (!tokenDoc.exists) {
      throw new HttpsError("not-found", "No FCM token found for user");
    }

    const fcmToken = tokenDoc.data()?.token;

    // Send test notification - DATA-ONLY for web push (PWA)
    const message: admin.messaging.Message = {
      // NO top-level 'notification' - let service worker handle display
      data: {
        title: "Test Notification",
        body: "This is a test notification from Firebase Cloud Functions",
        icon: "/images/logo/logo-icon.svg",
        badge: "/images/logo/logo-icon.svg",
        type: "test",
        url: "/notifications",
        timestamp: Date.now().toString(),
      },
      token: fcmToken,
      webpush: {
        headers: {
          Urgency: "high",
          TTL: "86400",
        },
        fcmOptions: {
          link: "/notifications",
        },
      },
      // No android/apns blocks - this is a PWA, not a native app
    };

    const response = await admin.messaging().send(message);

    console.log("Test notification sent:", response);

    return {
      success: true,
      messageId: response,
      message: "Test notification sent successfully",
    };
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    throw new HttpsError(
      "internal",
      `Failed to send test notification: ${error.message}`
    );
  }
});


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
