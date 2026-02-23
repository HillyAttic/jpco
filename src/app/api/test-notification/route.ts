import { NextRequest, NextResponse } from 'next/server';
import { sendNotification } from '@/lib/notifications/send-notification';

/**
 * Test notification endpoint
 * 
 * Usage:
 * POST /api/test-notification
 * Body: { userId: "user123" }
 * 
 * This sends a test notification to verify push notifications work
 * when the app is closed, locked, or in background.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    console.log('[Test Notification] Sending to user:', userId);

    const result = await sendNotification({
      userIds: [userId],
      title: '🧪 Test Notification',
      body: `This is a test notification sent at ${new Date().toLocaleTimeString()}. If you see this on your locked/closed device, notifications are working!`,
      data: {
        url: '/notifications',
        type: 'test',
        timestamp: Date.now().toString(),
      },
    });

    console.log('[Test Notification] Result:', result);

    if (result.sent.length > 0) {
      return NextResponse.json({
        success: true,
        result,
        message: `✅ Test notification sent successfully! Check your device (even if locked/closed).`,
        deliveryTime: result.totalTime + 'ms',
      });
    } else {
      return NextResponse.json({
        success: false,
        result,
        message: '❌ Failed to send notification. Check errors.',
      }, { status: 500 });
    }
  } catch (error: any) {
    console.error('[Test Notification] Error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error.message,
        message: '❌ Server error while sending notification'
      },
      { status: 500 }
    );
  }
}
