# Attendance Export Feature

## Overview

Added attendance export functionality to the attendance tray page, allowing admins/managers to export attendance records in Excel or PDF format with customizable date ranges and employee selection.

## Features

### 1. Export Modal
- **Multi-select employees**: Choose specific employees or select all
- **Custom date range**: Select start and end dates for the export period
- **Format selection**: Choose between Excel (.xlsx) or PDF (.pdf) format
- **Real-time preview**: Shows selected employee count

### 2. Export Formats

#### Excel Export (.xlsx)
- Includes all attendance data in spreadsheet format
- Columns:
  - Employee Name
  - Date
  - Clock In Time
  - Clock Out Time
  - Duration
  - Status
  - Clock In Location (coordinates)
  - Clock Out Location (coordinates)
- Auto-sized columns for readability
- Easy to filter and analyze in Excel

#### PDF Export (.pdf)
- Professional formatted report
- Includes:
  - Report title
  - Date range
  - Generation timestamp
  - Attendance table with key information
- Landscape orientation for better readability
- Grid theme with blue headers

### 3. User Interface

#### Export Button
- Located in the header next to Refresh and Back buttons
- Green color to stand out
- Download icon for clarity

#### Export Modal
- Clean, organized layout
- Three main sections:
  1. Date Range Selection
  2. Employee Multi-select
  3. Export Format Selection

## Installation

### Required Packages

Run the following command to install the required dependencies:

```bash
npm install xlsx jspdf jspdf-autotable
```

### Package Details:
- **xlsx**: Excel file generation (SheetJS)
- **jspdf**: PDF generation
- **jspdf-autotable**: Table plugin for jsPDF

### Type Definitions

If TypeScript errors occur, install type definitions:

```bash
npm install --save-dev @types/jspdf-autotable
```

## Files Created/Modified

### New Files:
1. **src/components/attendance/AttendanceExportModal.tsx**
   - Main export modal component
   - Handles employee selection, date range, and format selection
   - Implements Excel and PDF export logic

### Modified Files:
1. **src/app/attendance/tray/page.tsx**
   - Added export button in header
   - Integrated AttendanceExportModal component
   - Added state management for export modal

## Usage

### For Admins/Managers:

1. **Navigate to Attendance Tray**
   - Go to `/attendance/tray`

2. **Click Export Button**
   - Green "Export" button in the header

3. **Select Date Range**
   - Choose start date
   - Choose end date
   - Default: Last 30 days

4. **Select Employees**
   - Check individual employees
   - Or click "Select All" for all employees
   - See count of selected employees

5. **Choose Export Format**
   - Click Excel card for .xlsx format
   - Click PDF card for .pdf format

6. **Export**
   - Click "Export EXCEL" or "Export PDF" button
   - File downloads automatically
   - Modal closes on success

## Data Included in Export

### All Formats Include:
- Employee Name
- Date of attendance
- Clock In time
- Clock Out time
- Duration (hours and minutes)
- Status (Active/Completed)

### Excel Format Additionally Includes:
- Clock In Location (latitude, longitude)
- Clock Out Location (latitude, longitude)

### PDF Format:
- Optimized for printing
- Includes report metadata
- Professional table layout

## Example Exports

### Excel File Name:
```
Attendance_2026-01-01_to_2026-01-31.xlsx
```

### PDF File Name:
```
Attendance_2026-01-01_to_2026-01-31.pdf
```

## Technical Implementation

### Data Fetching
```typescript
// Fetches attendance records for selected employees and date range
const fetchAttendanceRecords = async (): Promise<AttendanceRecord[]> => {
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  // Query Firestore for each selected employee
  for (const employeeId of selectedEmployees) {
    const q = query(
      collection(db, 'attendance-records'),
      where('employeeId', '==', employeeId),
      where('clockIn', '>=', Timestamp.fromDate(start)),
      where('clockIn', '<=', Timestamp.fromDate(end)),
      orderBy('clockIn', 'desc')
    );
    // ... fetch and process records
  }
};
```

### Excel Export
```typescript
const exportToExcel = async () => {
  const records = await fetchAttendanceRecords();
  
  // Convert to Excel format
  const data = records.map(record => ({
    'Employee Name': record.employeeName,
    'Date': record.clockIn.toLocaleDateString('en-US'),
    // ... other fields
  }));

  // Create workbook and worksheet
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance');

  // Download file
  XLSX.writeFile(wb, fileName);
};
```

### PDF Export
```typescript
const exportToPDF = async () => {
  const records = await fetchAttendanceRecords();
  const doc = new jsPDF('landscape');
  
  // Add title and metadata
  doc.text('Attendance Report', 14, 20);
  doc.text(`Period: ${startDate} - ${endDate}`, 14, 28);
  
  // Add table
  autoTable(doc, {
    head: [['Employee', 'Date', 'Clock In', 'Clock Out', 'Duration', 'Status']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
  });

  // Download file
  doc.save(fileName);
};
```

## Validation

### The export modal validates:
1. **At least one employee selected**
   - Shows alert if no employees selected

2. **Valid date range**
   - Start and end dates must be provided
   - Start date must be before end date

3. **Format selection**
   - Excel or PDF must be selected (default: Excel)

## Error Handling

### Handles:
- Failed data fetching
- Export errors
- Invalid date ranges
- Empty result sets

### User Feedback:
- Loading states during export
- Success: Modal closes and file downloads
- Error: Alert message with error details

## Performance Considerations

### Optimizations:
1. **Batch Queries**: Fetches records per employee to avoid large queries
2. **Client-side Processing**: Formats data on client side
3. **Async Operations**: Uses async/await for non-blocking operations
4. **Progress Indicators**: Shows loading state during export

### Limitations:
- Large date ranges may take longer to export
- Many employees selected increases processing time
- Recommend exporting in smaller batches for very large datasets

## Security

### Access Control:
- Only admins and managers can access attendance tray
- Protected by `ManagerGuard` component
- Requires authentication

### Data Privacy:
- Exports only data user has permission to view
- No sensitive data exposed beyond what's visible in UI

## Future Enhancements

### Potential Improvements:
1. **Email Export**: Send export directly to email
2. **Scheduled Exports**: Automatic periodic exports
3. **Custom Columns**: Let users choose which columns to include
4. **Charts in PDF**: Add visual charts to PDF reports
5. **CSV Format**: Add CSV export option
6. **Filters in Export**: Apply status/location filters to export
7. **Summary Statistics**: Add totals and averages to exports

## Testing Checklist

- [ ] Export button appears for admins/managers
- [ ] Export button hidden for regular employees
- [ ] Modal opens when clicking Export button
- [ ] Date range defaults to last 30 days
- [ ] Can select individual employees
- [ ] Select All/Deselect All works
- [ ] Selected count updates correctly
- [ ] Can switch between Excel and PDF formats
- [ ] Validation works (no employees, invalid dates)
- [ ] Excel export downloads correctly
- [ ] PDF export downloads correctly
- [ ] File names include date range
- [ ] Data in exports matches UI data
- [ ] Loading states show during export
- [ ] Modal closes after successful export
- [ ] Error handling works for failed exports

## Support

For issues or questions:
- Check browser console for error messages
- Verify npm packages are installed
- Ensure Firestore permissions allow reading attendance records
- Check date range is valid and contains data

---

**Implementation Date:** February 10, 2026
**Status:** ✅ Complete (Pending npm install)
**Priority:** HIGH - Important for reporting and compliance
