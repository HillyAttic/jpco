"use client";

import { useState, useEffect } from "react";
import { useEnhancedAuth } from "@/contexts/enhanced-auth.context";
import { requestNotificationPermission, saveFCMToken, onForegroundMessage } from "@/lib/firebase-messaging";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

export default function TestNotificationsPage() {
  const { user } = useEnhancedAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [testResult, setTestResult] = useState<string>("");

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev]);
    console.log(message);
  };

  useEffect(() => {
    addLog("Test page loaded");
    
    // Check notification permission
    if ('Notification' in window) {
      addLog(`Notification permission: ${Notification.permission}`);
    } else {
      addLog("❌ Notifications not supported in this browser");
    }

    // Check service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        addLog(`Service workers registered: ${registrations.length}`);
        registrations.forEach(reg => {
          addLog(`  - ${reg.active?.scriptURL || 'inactive'}`);
        });
      });
    }
  }, []);

  // Listen for foreground messages
  useEffect(() => {
    if (!user) return;

    addLog("Setting up foreground message listener");
    const unsubscribe = onForegroundMessage((payload) => {
      addLog("✅ Foreground message received!");
      addLog(JSON.stringify(payload, null, 2));
      setTestResult("✅ Foreground notification received!");
    });

    return unsubscribe;
  }, [user]);

  const handleEnableNotifications = async () => {
    if (!user) {
      addLog("❌ No user logged in");
      return;
    }

    addLog("Requesting notification permission...");
    const token = await requestNotificationPermission();
    
    if (token) {
      addLog(`✅ FCM Token received: ${token.substring(0, 20)}...`);
      setFcmToken(token);
      
      addLog("Saving token to Firestore...");
      const saved = await saveFCMToken(user.uid, token);
      
      if (saved) {
        addLog("✅ Token saved to Firestore");
      } else {
        addLog("❌ Failed to save token");
      }
    } else {
      addLog("❌ Failed to get FCM token");
    }
  };

  const handleTestForeground = async () => {
    if (!user || !fcmToken) {
      addLog("❌ Enable notifications first");
      return;
    }

    addLog("Creating test notification in Firestore...");
    setTestResult("⏳ Waiting for notification...");

    try {
      const notificationRef = await addDoc(collection(db, 'notifications'), {
        fcmToken: fcmToken,
        userId: user.uid,
        title: "Foreground Test",
        body: `Test notification at ${new Date().toLocaleTimeString()}`,
        sent: false,
        read: false,
        createdAt: serverTimestamp(),
        data: {
          url: "/test-notifications",
          type: "test"
        }
      });

      addLog(`✅ Test notification created: ${notificationRef.id}`);
      addLog("Waiting for Cloud Function to process...");
      
      // Wait 5 seconds to see if notification arrives
      setTimeout(() => {
        if (testResult === "⏳ Waiting for notification...") {
          setTestResult("⚠️ No notification received after 5 seconds");
          addLog("⚠️ Timeout: Check Cloud Function logs");
        }
      }, 5000);

    } catch (error) {
      addLog(`❌ Error: ${error}`);
      setTestResult("❌ Failed to create test notification");
    }
  };

  const handleTestBackground = async () => {
    if (!user || !fcmToken) {
      addLog("❌ Enable notifications first");
      return;
    }

    addLog("Creating background test notification...");
    addLog("⚠️ IMPORTANT: Close or minimize this tab within 5 seconds!");

    setTimeout(async () => {
      try {
        const notificationRef = await addDoc(collection(db, 'notifications'), {
          fcmToken: fcmToken,
          userId: user.uid,
          title: "Background Test",
          body: `Background test at ${new Date().toLocaleTimeString()}`,
          sent: false,
          read: false,
          createdAt: serverTimestamp(),
          data: {
            url: "/test-notifications",
            type: "test"
          }
        });

        addLog(`✅ Background test notification created: ${notificationRef.id}`);
        addLog("Check your system notifications!");
      } catch (error) {
        addLog(`❌ Error: ${error}`);
      }
    }, 5000);
  };

  const handleCheckServiceWorker = () => {
    addLog("Checking service worker status...");
    
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        if (registrations.length === 0) {
          addLog("❌ No service workers registered");
        } else {
          registrations.forEach((reg, index) => {
            addLog(`Service Worker ${index + 1}:`);
            addLog(`  URL: ${reg.active?.scriptURL || 'N/A'}`);
            addLog(`  State: ${reg.active?.state || 'N/A'}`);
            addLog(`  Scope: ${reg.scope}`);
          });
        }
      });

      navigator.serviceWorker.ready.then(registration => {
        addLog("✅ Service worker is ready");
        if (registration.pushManager) {
          addLog("✅ Push manager available");
        } else {
          addLog("❌ Push manager not available");
        }
      });
    } else {
      addLog("❌ Service workers not supported");
    }
  };

  const handleTestBrowserNotification = () => {
    addLog("Testing browser notification API directly...");
    
    if (Notification.permission === 'granted') {
      const notification = new Notification("Direct Test", {
        body: "This is a direct browser notification test",
        icon: "/images/logo/logo-icon.svg",
        badge: "/images/logo/logo-icon.svg",
      });
      
      notification.onclick = () => {
        addLog("✅ Notification clicked");
        notification.close();
      };
      
      addLog("✅ Direct notification created");
    } else {
      addLog(`❌ Permission not granted: ${Notification.permission}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setTestResult("");
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          🧪 Push Notifications Test Suite
        </h1>
        <p className="text-gray-500 dark:text-gray-400">
          Comprehensive testing for foreground and background notifications
        </p>
      </div>

      {!user && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <p className="text-yellow-800 dark:text-yellow-200">
            ⚠️ Please log in to test notifications
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Control Panel */}
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Control Panel
            </h2>
            
            <div className="space-y-3">
              <button
                onClick={handleEnableNotifications}
                disabled={!user}
                className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                1. Enable Notifications
              </button>

              <button
                onClick={handleCheckServiceWorker}
                className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
              >
                2. Check Service Worker
              </button>

              <button
                onClick={handleTestBrowserNotification}
                disabled={!fcmToken}
                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                3. Test Browser Notification
              </button>

              <button
                onClick={handleTestForeground}
                disabled={!fcmToken}
                className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                4. Test Foreground (App Open)
              </button>

              <button
                onClick={handleTestBackground}
                disabled={!fcmToken}
                className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                5. Test Background (Close Tab)
              </button>

              <button
                onClick={clearLogs}
                className="w-full px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Clear Logs
              </button>
            </div>
          </div>

          {/* Status */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
              Status
            </h2>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">User:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {user ? user.email : 'Not logged in'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Permission:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {typeof window !== 'undefined' && 'Notification' in window 
                    ? Notification.permission 
                    : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">FCM Token:</span>
                <span className="font-mono text-gray-900 dark:text-white">
                  {fcmToken ? `${fcmToken.substring(0, 20)}...` : 'Not generated'}
                </span>
              </div>
            </div>

            {testResult && (
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  {testResult}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Logs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
            Console Logs
          </h2>
          
          <div className="bg-gray-900 rounded-lg p-4 h-[600px] overflow-y-auto font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">No logs yet. Start testing!</p>
            ) : (
              logs.map((log, index) => (
                <div
                  key={index}
                  className={`mb-1 ${
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('⚠️') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
          📋 Testing Instructions
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 dark:text-blue-200">
          <li>Click "Enable Notifications" and grant permission</li>
          <li>Click "Check Service Worker" to verify it's registered</li>
          <li>Click "Test Browser Notification" to test direct notifications</li>
          <li>Click "Test Foreground" - notification should appear while app is open</li>
          <li>Click "Test Background" - close/minimize tab within 5 seconds, notification should appear in system tray</li>
        </ol>
      </div>
    </div>
  );
}
