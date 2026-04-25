import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeaveRequestModal } from '@/components/attendance/LeaveRequestModal';
import { LeaveType, LeaveBalance } from '@/types/attendance.types';
import '@testing-library/jest-dom';

// Mock toast
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

describe('LeaveRequestModal', () => {
  const mockLeaveTypes: LeaveType[] = [
    {
      id: 'sick',
      name: 'Sick Leave',
      code: 'SICK',
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 10,
      accrualRate: 1,
      carryOverAllowed: false,
      color: '#ef4444',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 'casual',
      name: 'Casual Leave',
      code: 'CASUAL',
      isPaid: true,
      requiresApproval: true,
      maxDaysPerYear: 15,
      accrualRate: 1,
      carryOverAllowed: false,
      color: '#f59e0b',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];

  const mockLeaveBalances: LeaveBalance[] = [
    {
      leaveTypeId: 'sick',
      leaveTypeName: 'Sick Leave',
      totalDays: 10,
      usedDays: 2,
      remainingDays: 8,
      accrualRate: 1,
      updatedAt: new Date(),
    },
    {
      leaveTypeId: 'casual',
      leaveTypeName: 'Casual Leave',
      totalDays: 15,
      usedDays: 5,
      remainingDays: 10,
      accrualRate: 1,
      updatedAt: new Date(),
    },
  ];

  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the modal when open', () => {
    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    expect(screen.getByText('Request Leave')).toBeInTheDocument();
    expect(screen.getByLabelText('Leave Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Start Date')).toBeInTheDocument();
    expect(screen.getByLabelText('End Date')).toBeInTheDocument();
    expect(screen.getByLabelText('Reason')).toBeInTheDocument();
  });

  it('should disable submit button during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Not feeling well' } });

    const submitButton = screen.getByRole('button', { name: /submit request/i });

    // Click submit
    fireEvent.click(submitButton);

    // Button should be disabled during submission
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Submitting...');
    });

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });
  });

  it('should disable cancel button during submission', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Not feeling well' } });

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    // Click submit
    fireEvent.click(submitButton);

    // Cancel button should be disabled during submission
    await waitFor(() => {
      expect(cancelButton).toBeDisabled();
    });
  });

  it('should prevent multiple rapid clicks', async () => {
    mockOnSubmit.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Not feeling well' } });

    const submitButton = screen.getByRole('button', { name: /submit request/i });

    // Rapid clicks
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);

    // Wait for submission to complete
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    }, { timeout: 200 });
  });

  it('should close modal on successful submission', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Not feeling well' } });

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should keep modal open on error', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Network error'));

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-02' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Not feeling well' } });

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalled();
    });

    // Modal should NOT close on error
    expect(mockOnOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('should disable buttons when loading prop is true', () => {
    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={true}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submitting/i });
    const cancelButton = screen.getByRole('button', { name: /cancel/i });

    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });

  it('should validate required fields', async () => {
    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    fireEvent.click(submitButton);

    // Should not call onSubmit if validation fails
    await waitFor(() => {
      expect(mockOnSubmit).not.toHaveBeenCalled();
    });
  });

  it('should handle half day checkbox', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(
      <LeaveRequestModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSubmit={mockOnSubmit}
        leaveTypes={mockLeaveTypes}
        leaveBalances={mockLeaveBalances}
        loading={false}
      />
    );

    // Fill form
    fireEvent.change(screen.getByLabelText('Leave Type'), { target: { value: 'sick' } });
    fireEvent.change(screen.getByLabelText('Start Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('End Date'), { target: { value: '2026-05-01' } });
    fireEvent.change(screen.getByLabelText('Reason'), { target: { value: 'Doctor appointment' } });

    const halfDayCheckbox = screen.getByLabelText('Half day');
    fireEvent.click(halfDayCheckbox);

    const submitButton = screen.getByRole('button', { name: /submit request/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          halfDay: true,
        })
      );
    });
  });
});
