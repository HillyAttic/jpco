# Attendance Calendar Overview Feature

## Overview

Added a monthly calendar overview feature to the attendance tray page, allowing admins/managers to view an employee's attendance history in a visual calendar format with color-coded indicators.

## Features

### 1. Calendar Overview Button
- Located in the bottom-right of each attendance record card
- Appears next to location information
- Opens a modal showing the employee's monthly attendance calendar

### 2. Visual Calendar Display
- **Monthly View**: Shows full month calendar with all days
- **Color-Coded Indicators**: Circular dots showing attendance status
  - 🟢 **Green**: Present (attended work)
  - 🔴 **Red**: Absent (no attendance record on weekday)
  - 🟡 **Yellow**: Leave (future enhancement)
  - ⚪ **White/Gray**: Upcoming dates (future days)
  - 🔵 **Blue**: Weekend/Holiday (Saturday/Sunday)

### 3. Attendance Statistics
- **Present Days**: Count of days employee was present
- **Absent Days**: Count of days employee was absent
- **Leave Days**: Count of leave days taken
- **Working Days**: Total working days in the month (excluding weekends)
- **Attendance Rate**: Percentage of attendance (Present / Working Days × 100)

### 4. Interactive Features
- **Month Navigation**: Previous/Next buttons to navigate months
- **Today Button**: Quick jump to current month
- **Day Details**: Shows clock-in time and duration for present days
- **Today Highlight**: Current date highlighted with blue background

### 5. Smart Status Detection
- **Present**: Has attendance record for the day
- **Absent**: No attendance record on a past weekday
- **Weekend**: Automatically detects Saturday/Sunday
- **Upcoming**: Future dates (not yet occurred)
- **Holiday**: Weekends marked as holidays

## User Interface

### Calendar Modal Layout:

```
┌─────────────────────────────────────────────────────────┐
│ 📅 Attendance Calendar - Employee Name            [X]   │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  [< Previous]    February 2026    [Today]    [Next >]   │
│                                                          │
│  ┌──────┬──────┬──────┬──────┬──────┐                  │
│  │ 🟢 8 │ 🟢 4 │ 🟡 0 │ 📊 20│ 📈 80%│                  │
│  │Present│Absent│Leave │Working│Rate  │                  │
│  └──────┴──────┴──────┴──────┴──────┘                  │
│                                                          │
│  Sun  Mon  Tue  Wed  Thu  Fri  Sat                      │
│  ┌───┬───┬───┬───┬───┬───┬───┐                         │
│  │🔵│🔵│ 🟢│ 🟢│ 🟢│ 🟢│🔵│                         │
│  │   │   │ 1 │ 2 │ 3 │ 4 │   │                         │
│  ├───┼───┼───┼───┼───┼───┼───┤                         │
│  │🔵│🔵│ 🟢│ 🔴│ 🟢│ 🟢│🔵│                         │
│  │   │   │ 8 │ 9 │10 │11 │   │                         │
│  └───┴───┴───┴───┴───┴───┴───┘                         │
│                                                          │
│  Legend:                                                 │
│  🟢 Present  🔴 Absent  🟡 Leave  ⚪ Upcoming  🔵 Weekend│
│                                                          │
│                                    [Close]               │
└─────────────────────────────────────────────────────────┘
```

## Technical Implementation

### Data Fetching
```typescript
const fetchMonthAttendance = async () => {
  const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

  const q = query(
    collection(db, 'attendance-records'),
    where('employeeId', '==', employeeId),
    where('clockIn', '>=', Timestamp.fromDate(startOfMonth)),
    where('clockIn', '<=', Timestamp.fromDate(endOfMonth))
  );

  const snapshot = await getDocs(q);
  // Process and map attendance data
};
```

### Status Detection Logic
```typescript
const getDateStatus = (date: Date): DayStatus => {
  const today = new Date();
  
  // Future date
  if (date > today) return { status: 'upcoming' };
  
  // Has attendance record
  if (attendanceData.has(dateKey)) return attendanceData.get(dateKey);
  
  // Weekend
  if (dayOfWeek === 0 || dayOfWeek === 6) return { status: 'holiday' };
  
  // Past weekday with no record
  return { status: 'absent' };
};
```

### Statistics Calculation
```typescript
const calculateStats = () => {
  let present = 0, absent = 0, leaves = 0, workingDays = 0;
  
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
    
    // Only count up to today
    if (date > today) break;
    
    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) continue;
    
    workingDays++;
    const status = getDateStatus(date);
    
    if (status.status === 'present') present++;
    else if (status.status === 'absent') absent++;
    else if (status.status === 'leave') leaves++;
  }
  
  const attendanceRate = Math.round((present / workingDays) * 100);
  return { present, absent, leaves, workingDays, attendanceRate };
};
```

## Files Created/Modified

### New File:
1. **src/components/attendance/AttendanceCalendarModal.tsx**
   - Complete calendar modal component
   - Month navigation
   - Statistics calculation
   - Visual calendar grid
   - Color-coded status indicators

### Modified File:
1. **src/app/attendance/tray/page.tsx**
   - Added "Calendar Overview" button to each attendance record
   - Integrated AttendanceCalendarModal component
   - Added state management for calendar modal
   - Added handler for calendar button click

## Usage

### For Admins/Managers:

1. **Navigate to Attendance Tray**
   - Go to `/attendance/tray`

2. **View Attendance Records**
   - See list of all attendance records

3. **Click Calendar Overview**
   - Click "Calendar Overview" button on any attendance record
   - Button located in bottom-right of the card

4. **View Monthly Calendar**
   - See full month calendar with color-coded attendance
   - View statistics at the top
   - Check specific day details

5. **Navigate Months**
   - Use Previous/Next buttons to change months
   - Click "Today" to return to current month

6. **Close Modal**
   - Click "Close" button or X icon

## Color Coding System

### Status Colors:
- **🟢 Green (Present)**: Employee clocked in on this day
- **🔴 Red (Absent)**: No attendance record on a past weekday
- **🟡 Yellow (Leave)**: Employee on approved leave (future enhancement)
- **⚪ Gray (Upcoming)**: Future date, not yet occurred
- **🔵 Blue (Weekend)**: Saturday or Sunday

### Visual Indicators:
- **Circular Dots**: Large colored circles for each day
- **Date Number**: Day of month displayed above circle
- **Time Info**: Clock-in time shown below circle for present days
- **Duration**: Total hours worked shown for completed days
- **Today Badge**: Blue "Today" badge on current date

## Statistics Explained

### Present Days
- Count of days employee has attendance record
- Only counts weekdays up to today

### Absent Days
- Count of weekdays with no attendance record
- Only counts past dates
- Excludes weekends

### Leave Days
- Count of approved leave days
- Currently set to 0 (future enhancement)

### Working Days
- Total weekdays in month up to today
- Excludes weekends (Saturday/Sunday)

### Attendance Rate
- Formula: (Present Days / Working Days) × 100
- Percentage of attendance
- Example: 16 present out of 20 working days = 80%

## Example Scenarios

### Scenario 1: Perfect Attendance
```
Present: 20 days
Absent: 0 days
Working Days: 20 days
Attendance Rate: 100%
```

### Scenario 2: Some Absences
```
Present: 16 days
Absent: 4 days
Working Days: 20 days
Attendance Rate: 80%
```

### Scenario 3: Mid-Month View
```
Present: 8 days
Absent: 2 days
Working Days: 10 days (only counted up to today)
Attendance Rate: 80%
Upcoming: 10 days (not counted)
```

## Benefits

1. **Visual Overview**: Easy to see attendance patterns at a glance
2. **Historical Data**: View past months' attendance
3. **Quick Insights**: Statistics provide immediate understanding
4. **Detailed Information**: See clock-in times and durations
5. **Month Navigation**: Review attendance across different months
6. **Color Coding**: Intuitive visual indicators
7. **Weekend Detection**: Automatically excludes weekends from calculations

## Future Enhancements

### Potential Improvements:
1. **Leave Management Integration**: Show actual leave days in yellow
2. **Holiday Calendar**: Mark public holidays
3. **Half-Day Support**: Show partial attendance
4. **Late Arrival Indicator**: Highlight late clock-ins
5. **Early Departure Indicator**: Highlight early clock-outs
6. **Export Calendar**: Download calendar as image or PDF
7. **Comparison View**: Compare multiple employees side-by-side
8. **Trend Analysis**: Show attendance trends over time
9. **Notifications**: Alert for low attendance rates
10. **Custom Date Range**: Select custom start/end dates

## Performance Considerations

### Optimizations:
- Fetches only one month of data at a time
- Efficient Firestore queries with date range filters
- Client-side status calculation
- Lazy loading of calendar data

### Limitations:
- Loads data when modal opens
- Re-fetches when changing months
- Weekend detection based on day of week (not holiday calendar)

## Accessibility

### Features:
- Keyboard navigation support
- Screen reader friendly
- Clear visual indicators
- High contrast colors
- Responsive design

## Mobile Responsiveness

### Adaptations:
- Statistics cards stack on mobile
- Calendar grid scrolls horizontally if needed
- Touch-friendly button sizes
- Responsive modal sizing

## Testing Checklist

- [ ] Calendar Overview button appears on attendance records
- [ ] Modal opens when clicking button
- [ ] Current month displays by default
- [ ] Statistics calculate correctly
- [ ] Present days show green circles
- [ ] Absent days show red circles
- [ ] Weekends show blue circles
- [ ] Future dates show gray circles
- [ ] Today is highlighted
- [ ] Clock-in times display for present days
- [ ] Duration shows for completed days
- [ ] Previous month button works
- [ ] Next month button works
- [ ] Today button returns to current month
- [ ] Legend displays correctly
- [ ] Modal closes properly
- [ ] Works for different employees
- [ ] Handles months with no attendance
- [ ] Responsive on mobile devices

## Support

For issues or questions:
- Verify employee has attendance records
- Check Firestore permissions
- Ensure date range is valid
- Check browser console for errors

---

**Implementation Date:** February 10, 2026
**Status:** ✅ Complete
**Priority:** MEDIUM - Useful for attendance tracking and reporting
