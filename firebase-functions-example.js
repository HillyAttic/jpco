/**
 * Firebase Cloud Functions for Push Notifications
 * 
 * SETUP INSTRUCTIONS:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Login: firebase login
 * 3. Initialize functions: firebase init functions
 * 4. Copy this code to functions/index.js
 * 5. Install dependencies in functions folder:
 *    cd functions
 *    npm install firebase-admin firebase-functions
 * 6. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

/**
 * Send push notification when a new notification document is created
 * Triggers automatically when a document is added to the 'notifications' collection
 */
exports.sendPushNotification = functions.firestore
  .document('notifications/{notificationId}')
  .onCreate(async (snap, context) => {
    const notification = snap.data();
    
    console.log('New notification created:', context.params.notificationId);
    
    // Skip if already sent
    if (notification.sent) {
      console.log('Notification already sent, skipping');
      return null;
    }

    // Validate required fields
    if (!notification.fcmToken) {
      console.error('No FCM token found in notification');
      await snap.ref.update({ 
        sent: false,
        error: 'No FCM token provided'
      });
      return null;
    }

    // Construct the message
    const message = {
      notification: {
        title: notification.title || 'New Notification',
        body: notification.body || 'You have a new notification',
        icon: '/images/logo/logo-icon.svg',
      },
      data: {
        ...(notification.data || {}),
        notificationId: context.params.notificationId,
      },
      token: notification.fcmToken,
      webpush: {
        fcmOptions: {
          link: notification.data?.url || '/notifications',
        },
        notification: {
          icon: '/images/logo/logo-icon.svg',
          badge: '/images/logo/logo-icon.svg',
          requireInteraction: false,
          vibrate: [200, 100, 200],
        },
      },
    };

    try {
      // Send the notification via FCM
      const response = await admin.messaging().send(message);
      
      console.log('Notification sent successfully:', response);
      
      // Mark as sent in Firestore
      await snap.ref.update({ 
        sent: true,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        messageId: response,
      });
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('Error sending notification:', error);
      
      // Update with error information
      await snap.ref.update({ 
        sent: false,
        error: error.message,
        errorCode: error.code,
      });
      
      return { success: false, error: error.message };
    }
  });

/**
 * Clean up old notifications (optional)
 * Runs daily to delete notifications older than 30 days
 */
exports.cleanupOldNotifications = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async (context) => {
    const db = admin.firestore();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldNotifications = await db.collection('notifications')
      .where('createdAt', '<', thirtyDaysAgo)
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
      console.log('No old notifications to delete');
    }

    return { deleted: count };
  });

/**
 * Handle FCM token refresh (optional)
 * Updates user's FCM token when it changes
 */
exports.updateFCMToken = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const { token } = data;
  const userId = context.auth.uid;

  if (!token) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Token is required'
    );
  }

  try {
    const db = admin.firestore();
    await db.collection('fcmTokens').doc(userId).set({
      token,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('Error updating FCM token:', error);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to update FCM token'
    );
  }
});

/**
 * Send test notification (for debugging)
 * Call this function to test push notifications
 */
exports.sendTestNotification = functions.https.onCall(async (data, context) => {
  // Verify user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = context.auth.uid;

  try {
    const db = admin.firestore();
    
    // Get user's FCM token
    const tokenDoc = await db.collection('fcmTokens').doc(userId).get();
    
    if (!tokenDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'No FCM token found for user'
      );
    }

    const fcmToken = tokenDoc.data().token;

    // Send test notification
    const message = {
      notification: {
        title: 'Test Notification',
        body: 'This is a test notification from Firebase Cloud Functions',
        icon: '/images/logo/logo-icon.svg',
      },
      data: {
        type: 'test',
        url: '/notifications',
      },
      token: fcmToken,
    };

    const response = await admin.messaging().send(message);
    
    console.log('Test notification sent:', response);
    
    return { 
      success: true, 
      messageId: response,
      message: 'Test notification sent successfully'
    };
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw new functions.https.HttpsError(
      'internal',
      `Failed to send test notification: ${error.message}`
    );
  }
});
