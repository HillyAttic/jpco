/**
 * E2E Tests for Leave Request Submission Flow
 *
 * These tests verify the complete user journey from opening the modal
 * to submitting a leave request and seeing the result.
 */

import { test, expect } from '@playwright/test';

test.describe('Leave Request Submission E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employee
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'employee@test.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard');

    // Navigate to attendance page
    await page.goto('http://localhost:3000/attendance');
    await page.waitForLoadState('networkidle');
  });

  test('should prevent duplicate submissions on rapid clicks', async ({ page }) => {
    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Wait for modal to appear
    await expect(page.locator('text=Request Leave')).toBeVisible();

    // Fill form
    await page.selectOption('select[name="leaveTypeId"]', 'sick');
    await page.fill('input[name="startDate"]', '2026-05-01');
    await page.fill('input[name="endDate"]', '2026-05-02');
    await page.fill('textarea[name="reason"]', 'Not feeling well');

    // Get submit button
    const submitButton = page.locator('button[type="submit"]:has-text("Submit Request")');

    // Rapid clicks (5 times)
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    // Wait for success toast
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });

    // Modal should close
    await expect(page.locator('text=Request Leave')).not.toBeVisible();

    // Check that only ONE request was created
    // Navigate to leave history
    await page.click('button:has-text("History")');
    await page.waitForLoadState('networkidle');

    // Count leave requests with the same dates
    const leaveRequests = page.locator('text=2026-05-01').locator('visible=true');
    const count = await leaveRequests.count();

    expect(count).toBe(1);
  });

  test('should show disabled state during submission', async ({ page }) => {
    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Wait for modal
    await expect(page.locator('text=Request Leave')).toBeVisible();

    // Fill form
    await page.selectOption('select[name="leaveTypeId"]', 'casual');
    await page.fill('input[name="startDate"]', '2026-05-10');
    await page.fill('input[name="endDate"]', '2026-05-11');
    await page.fill('textarea[name="reason"]', 'Personal work');

    // Get buttons
    const submitButton = page.locator('button[type="submit"]');
    const cancelButton = page.locator('button:has-text("Cancel")');

    // Click submit
    await submitButton.click();

    // Buttons should be disabled immediately
    await expect(submitButton).toBeDisabled();
    await expect(cancelButton).toBeDisabled();

    // Submit button text should change
    await expect(submitButton).toHaveText('Submitting...');

    // Wait for completion
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });
  });

  test('should keep modal open on error and allow retry', async ({ page }) => {
    // Intercept API call and force it to fail
    await page.route('**/api/leave-requests', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Fill form
    await page.selectOption('select[name="leaveTypeId"]', 'sick');
    await page.fill('input[name="startDate"]', '2026-05-15');
    await page.fill('input[name="endDate"]', '2026-05-16');
    await page.fill('textarea[name="reason"]', 'Medical appointment');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for error toast
    await expect(page.locator('text=Failed to submit leave request')).toBeVisible({ timeout: 5000 });

    // Modal should still be open
    await expect(page.locator('text=Request Leave')).toBeVisible();

    // Form data should still be there
    await expect(page.locator('textarea[name="reason"]')).toHaveValue('Medical appointment');

    // Remove the route intercept to allow retry
    await page.unroute('**/api/leave-requests');

    // Retry submission
    await page.click('button[type="submit"]');

    // Should succeed this time
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=Request Leave')).not.toBeVisible();
  });

  test('should handle network delay without duplicates', async ({ page }) => {
    // Intercept API call and add delay
    await page.route('**/api/leave-requests', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      route.continue();
    });

    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Fill form
    await page.selectOption('select[name="leaveTypeId"]', 'casual');
    await page.fill('input[name="startDate"]', '2026-05-20');
    await page.fill('input[name="endDate"]', '2026-05-21');
    await page.fill('textarea[name="reason"]', 'Family event');

    const submitButton = page.locator('button[type="submit"]');

    // Click submit
    await submitButton.click();

    // Try to click again during delay
    await submitButton.click();
    await submitButton.click();

    // Wait for success
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });

    // Verify only one request created
    await page.goto('http://localhost:3000/attendance/history');
    await page.waitForLoadState('networkidle');

    const leaveRequests = page.locator('text=2026-05-20').locator('visible=true');
    const count = await leaveRequests.count();

    expect(count).toBe(1);
  });

  test('should show duplicate error from backend', async ({ page }) => {
    // Submit first request
    await page.click('button:has-text("Apply Leave")');
    await page.selectOption('select[name="leaveTypeId"]', 'sick');
    await page.fill('input[name="startDate"]', '2026-06-01');
    await page.fill('input[name="endDate"]', '2026-06-02');
    await page.fill('textarea[name="reason"]', 'Flu');
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });

    // Try to submit identical request immediately
    await page.click('button:has-text("Apply Leave")');
    await page.selectOption('select[name="leaveTypeId"]', 'sick');
    await page.fill('input[name="startDate"]', '2026-06-01');
    await page.fill('input[name="endDate"]', '2026-06-02');
    await page.fill('textarea[name="reason"]', 'Flu');
    await page.click('button[type="submit"]');

    // Should show duplicate error
    await expect(page.locator('text=Duplicate request detected')).toBeVisible({ timeout: 5000 });

    // Modal should stay open
    await expect(page.locator('text=Request Leave')).toBeVisible();
  });

  test('should handle half-day requests correctly', async ({ page }) => {
    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Fill form
    await page.selectOption('select[name="leaveTypeId"]', 'casual');
    await page.fill('input[name="startDate"]', '2026-05-25');
    await page.fill('input[name="endDate"]', '2026-05-25');
    await page.fill('textarea[name="reason"]', 'Doctor appointment');

    // Check half-day checkbox
    await page.check('input[name="halfDay"]');

    // Submit
    await page.click('button[type="submit"]');

    // Wait for success
    await expect(page.locator('text=Leave request submitted successfully')).toBeVisible({ timeout: 5000 });

    // Verify half-day badge appears in history
    await page.goto('http://localhost:3000/attendance');
    await page.waitForLoadState('networkidle');

    // Should show half-day badge
    await expect(page.locator('text=Half Day')).toBeVisible();
  });

  test('should validate form fields before submission', async ({ page }) => {
    // Open leave request modal
    await page.click('button:has-text("Apply Leave")');

    // Try to submit without filling form
    await page.click('button[type="submit"]');

    // Should show validation errors (form should not submit)
    await expect(page.locator('text=Request Leave')).toBeVisible();

    // No success toast should appear
    await expect(page.locator('text=Leave request submitted successfully')).not.toBeVisible({ timeout: 1000 });
  });

  test('should allow admin to see pending requests', async ({ page }) => {
    // Logout and login as admin
    await page.goto('http://localhost:3000/auth/signout');
    await page.goto('http://localhost:3000/auth/signin');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'testpassword');
    await page.click('button[type="submit"]');

    // Navigate to leave approvals
    await page.goto('http://localhost:3000/admin/leave-approvals');
    await page.waitForLoadState('networkidle');

    // Should see pending requests
    await expect(page.locator('text=Pending Approvals')).toBeVisible();

    // Should not see duplicate requests for the same employee
    const pendingCards = page.locator('[data-testid="pending-leave-card"]');
    const count = await pendingCards.count();

    // Verify no duplicates by checking unique employee names
    const employeeNames = new Set();
    for (let i = 0; i < count; i++) {
      const name = await pendingCards.nth(i).locator('.employee-name').textContent();
      expect(employeeNames.has(name)).toBe(false);
      employeeNames.add(name);
    }
  });
});
