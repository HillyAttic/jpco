/**
 * Firebase Cloud Functions for Push Notifications
 * TypeScript version - Using v2 API
 */

import { onDocumentCreated } from "firebase-functions/v2/firestore";
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

    // Skip if already sent
    if (notification.sent) {
      console.log("Notification already sent, skipping");
      return null;
    }

    // Validate required fields
    if (!notification.fcmToken) {
      console.error("No FCM token found in notification");
      await snap.ref.update({
        sent: false,
        error: "No FCM token provided",
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
    const bodyText = notification.body || "You have a new notification";

    // All data values MUST be strings for FCM data messages
    const dataPayload: { [key: string]: string } = {
      title: titleText,
      body: bodyText,
      icon: "/images/logo/logo-icon.svg",
      badge: "/images/logo/logo-icon.svg",
      url: notification.data?.url || "/notifications",
      notificationId: notificationId,
      type: notification.data?.type || "general",
      taskId: notification.data?.taskId || "",
      timestamp: Date.now().toString(),
    };

    const message: admin.messaging.Message = {
      // NO top-level 'notification' key - this is intentional!
      data: dataPayload,
      token: notification.fcmToken,
      webpush: {
        headers: {
          Urgency: "high",  // Tells push service to wake device immediately
          TTL: "86400",     // 24 hours - don't drop the message
        },
        fcmOptions: {
          link: notification.data?.url || "/notifications",
        },
        // No webpush.notification - let service worker handle it
      },
      android: {
        priority: "high" as const,
        notification: {
          title: titleText,
          body: bodyText,
          icon: "logo_icon",
          color: "#5750F1",
          sound: "default",
          channelId: "high_importance_channel",
          priority: "high" as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          visibility: "public" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",  // Immediate delivery
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
            alert: {
              title: titleText,
              body: bodyText,
            },
          },
        },
      },
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

      // Update with error information
      await snap.ref.update({
        sent: false,
        error: error.message,
        errorCode: error.code,
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

    // Send test notification - DATA-ONLY for web push
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
      android: {
        priority: "high" as const,
        notification: {
          title: "Test Notification",
          body: "This is a test notification from Firebase Cloud Functions",
          icon: "logo_icon",
          color: "#5750F1",
          sound: "default",
          channelId: "high_importance_channel",
          priority: "high" as const,
          defaultSound: true,
          defaultVibrateTimings: true,
          defaultLightSettings: true,
          visibility: "public" as const,
        },
      },
      apns: {
        headers: {
          "apns-priority": "10",
          "apns-push-type": "alert",
        },
        payload: {
          aps: {
            sound: "default",
            badge: 1,
            "content-available": 1,
            alert: {
              title: "Test Notification",
              body: "This is a test notification from Firebase Cloud Functions",
            },
          },
        },
      },
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

