"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, X } from "lucide-react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";
import {
  requestNotificationPermission,
  requestNotificationPermissionMobile,
  saveFCMToken,
  onForegroundMessage,
  deleteFCMToken,
  isMobileDevice,
  isIOSDevice,
  isStandalonePWA,
  getIOSVersion
} from "@/lib/firebase-messaging";
import { toast } from "react-toastify";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";

interface Notification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: any;
  data?: {
    taskId?: string;
    url?: string;
    type?: string;
  };
}

export default function NotificationsPage() {
  const { user } = useEnhancedAuth();
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null);
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  // Check notification permission on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Request notification permission
  const handleEnableNotifications = async () => {
    if (!user) {
      toast.error("Please log in to enable notifications");
      return;
    }

    try {
      // Mobile-specific checks
      const isMobile = isMobileDevice();
      const isIOS = isIOSDevice();
      const isStandalone = isStandalonePWA();

      console.log('Device info:', { isMobile, isIOS, isStandalone });

      // iOS-specific check
      if (isIOS && !isStandalone) {
        toast.error("On iOS, please add this app to your home screen first to enable notifications", {
          autoClose: 8000
        });
        return;
      }

      // iOS version check
      if (isIOS) {
        const iosVersion = getIOSVersion();
        if (iosVersion && iosVersion < 16.4) {
          toast.error('Push notifications require iOS 16.4 or later');
          return;
        }
      }

      // Check service worker support
      if (!('serviceWorker' in navigator)) {
        toast.error("Push notifications are not supported on this device");
        return;
      }

      // Check notification support
      if (!('Notification' in window)) {
        toast.error("Notifications are not supported on this browser");
        return;
      }

      // Wait for service worker to be ready
      console.log("Waiting for service worker...");
      const registration = await navigator.serviceWorker.ready;
      console.log("Service worker ready:", registration.active?.scriptURL);

      // Verify it's the Firebase service worker
      if (registration.active && !registration.active.scriptURL.includes('firebase-messaging-sw.js')) {
        console.warn('Wrong service worker registered:', registration.active.scriptURL);
        toast.warning("Service worker issue detected. Please refresh the page and try again.");
        return;
      }

      // Request permission (use mobile-specific handler if on mobile)
      const token = isMobile
        ? await requestNotificationPermissionMobile()
        : await requestNotificationPermission();

      if (token) {
        // Save token to Firestore
        const saved = await saveFCMToken(user.uid, token);

        if (saved) {
          setFcmToken(token);
          setNotificationPermission('granted');
          toast.success("Notifications enabled successfully!");

          // Log success for debugging
          console.log('Notification setup complete:', {
            token: token.substring(0, 20) + '...',
            userId: user.uid,
            device: isMobile ? 'mobile' : 'desktop',
            platform: isIOS ? 'iOS' : 'other'
          });
        } else {
          toast.error("Failed to save notification token");
        }
      } else {
        toast.error("Failed to get notification permission");
      }
    } catch (error: any) {
      console.error("Error enabling notifications:", error);

      // Show user-friendly error message
      const errorMessage = error.message || "Failed to enable notifications";
      toast.error(errorMessage, {
        autoClose: 8000
      });
    }
  };

  // Disable notifications
  const handleDisableNotifications = async () => {
    if (!user) return;

    try {
      await deleteFCMToken(user.uid);
      setFcmToken(null);
      toast.success("Notifications disabled");
    } catch (error) {
      console.error("Error disabling notifications:", error);
      toast.error("Failed to disable notifications");
    }
  };

  // Listen for foreground messages
  useEffect(() => {
    if (!user) return;

    const unsubscribe = onForegroundMessage((payload) => {
      console.log("Foreground message:", payload);

      // Show toast notification
      toast.info(payload.notification?.body || "New notification", {
        onClick: () => {
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
        },
      });
    });

    return unsubscribe;
  }, [user]);

  // Load notifications from Firestore
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const notificationsRef = collection(db, 'notifications');
    // NOTE: Do NOT use orderBy here - it requires a composite index in Firestore
    // Sort client-side instead for reliability
    const q = query(
      notificationsRef,
      where('userId', '==', user.uid)
    );

    console.log('Subscribing to notifications for user:', user.uid);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notifs: Notification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        notifs.push({
          id: doc.id,
          title: data.title || 'Notification',
          body: data.body || data.message || '',
          read: data.read || false,
          createdAt: data.createdAt,
          data: data.data || {},
        } as Notification);
      });
      // Sort client-side by createdAt descending
      notifs.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.()?.getTime() || 0;
        const bTime = b.createdAt?.toDate?.()?.getTime() || 0;
        return bTime - aTime;
      });
      console.log('Loaded notifications:', notifs.length);
      setNotifications(notifs);
      setLoading(false);
    }, (error) => {
      console.error("Error loading notifications:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const notifRef = doc(db, 'notifications', notificationId);
      await updateDoc(notifRef, { read: true });
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    markAsRead(notification.id);

    if (notification.data?.url) {
      window.location.href = notification.data.url;
    }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-full">
              <Bell className="w-12 h-12 text-gray-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Notifications
          </h1>
          <p className="text-gray-500 dark:text-gray-400 max-w-md">
            Please log in to view notifications
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Notifications
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Manage your push notifications and view recent alerts
        </p>
      </div>

      {/* Notification Permission Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`p-3 rounded-full ${notificationPermission === 'granted'
              ? 'bg-green-100 dark:bg-green-900'
              : 'bg-gray-100 dark:bg-gray-700'
              }`}>
              {notificationPermission === 'granted' ? (
                <Bell className="w-6 h-6 text-green-600 dark:text-green-400" />
              ) : (
                <BellOff className="w-6 h-6 text-gray-400" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                Push Notifications
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {notificationPermission === 'granted'
                  ? 'Notifications are enabled'
                  : 'Enable notifications to receive task updates'}
              </p>
            </div>
          </div>

          {notificationPermission === 'granted' ? (
            <button
              onClick={handleDisableNotifications}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Disable
            </button>
          ) : (
            <button
              onClick={handleEnableNotifications}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Enable Notifications
            </button>
          )}
        </div>
      </div>

      {/* iOS PWA Info Card */}
      {isIOSDevice() && !isStandalonePWA() && notificationPermission !== 'granted' && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-1">
                iOS Users: Add to Home Screen Required
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
                To enable push notifications on iOS, you need to add this app to your home screen first:
              </p>
              <ol className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Tap the Share button in Safari</li>
                <li>Scroll down and tap "Add to Home Screen"</li>
                <li>Open the app from your home screen</li>
                <li>Return here to enable notifications</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Info Card */}
      {isMobileDevice() && notificationPermission !== 'granted' && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-1">
                Mobile Device Detected
              </h4>
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Make sure notifications are enabled in your device settings and browser settings for the best experience.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notifications List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-white">
            Recent Notifications
          </h2>
        </div>

        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">
              No notifications yet
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors ${!notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {notification.title}
                      </h3>
                      {!notification.read && (
                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">
                      {notification.body}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {notification.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                    </p>
                  </div>

                  {!notification.read && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsRead(notification.id);
                      }}
                      className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      title="Mark as read"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
