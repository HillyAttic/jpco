# Quick Test Guide for Reports Export Feature

## How to Test the Export Feature

### Prerequisites
1. Navigate to http://localhost:3000/reports
2. Ensure you're logged in as a Manager or Admin
3. Ensure you have some tasks and clients with completion data

### Test 1: Summary Export
1. On the main reports page, locate the "Export Summary" button (green, top-right)
2. Hover over the button to see dropdown menu
3. Click "Export as PDF"
   - Expected: A PDF file downloads with all tasks summary
   - File name format: `Reports_Summary_YYYYMMDD.pdf`
4. Click "Export as Excel"
   - Expected: An Excel file downloads with all tasks summary
   - File name format: `Reports_Summary_YYYYMMDD.xlsx`

### Test 2: Individual Task Report Export (Regular Task)
1. Click "View Details" on any task that doesn't have team member mapping
2. In the modal, scroll to the bottom footer
3. Click the "PDF" button (red)
   - Expected: PDF downloads with task name and completion matrix
   - File name format: `{task_name}_YYYYMMDD.pdf`
4. Click the "Excel" button (green)
   - Expected: Excel file downloads with two sheets (Info and Report)
   - File name format: `{task_name}_YYYYMMDD.xlsx`

### Test 3: Team Member Report Export
1. Click "View Details" on a task with "Team Mapped" badge
2. (Optional) Click on a specific team member card to filter
3. Click the "PDF" button in the footer
   - Expected: PDF downloads with team member name in filename
   - File name format: `{task_name}_{member_name}_YYYYMMDD.pdf`
4. Click the "Excel" button
   - Expected: Excel file with team member data
   - File name format: `{task_name}_{member_name}_YYYYMMDD.xlsx`

### Verification Checklist

#### PDF Exports Should Include:
- [ ] Task title at the top
- [ ] Metadata (recurrence pattern, client count, generation date)
- [ ] Table with client names and months
- [ ] Color-coded status indicators (✓ green, ✗ red, - gray)
- [ ] Legend at the bottom
- [ ] Proper formatting and readability

#### Excel Exports Should Include:
- [ ] Info sheet with task metadata
- [ ] Report sheet with completion data
- [ ] Proper column widths
- [ ] Status text (Completed/Incomplete/Future)
- [ ] All data properly formatted

#### UI Elements Should:
- [ ] Export buttons are visible and styled correctly
- [ ] Hover dropdown works on summary export button
- [ ] Buttons are responsive on mobile devices
- [ ] Dark mode styling is correct
- [ ] No console errors when clicking export buttons

### Common Issues and Solutions

**Issue**: Export buttons not visible
- **Solution**: Check if you're logged in as Manager/Admin

**Issue**: PDF/Excel file not downloading
- **Solution**: Check browser's download settings and popup blocker

**Issue**: File name has weird characters
- **Solution**: This is expected - special characters are replaced with underscores

**Issue**: Export takes a long time
- **Solution**: Normal for large datasets (100+ clients), wait 2-3 seconds

**Issue**: Dark mode colors look wrong
- **Solution**: Export files use standard colors regardless of theme

### Browser Testing
Test in multiple browsers:
- [ ] Chrome/Edge
- [ ] Firefox
- [ ] Safari (if available)

### Mobile Testing
- [ ] Export buttons are accessible on mobile
- [ ] Files download correctly on mobile browsers
- [ ] Dropdown menu works on touch devices

## Expected Results

All exports should:
1. Download automatically without errors
2. Open correctly in their respective applications (PDF reader, Excel)
3. Display all data accurately
4. Have proper formatting and styling
5. Include all metadata and legends

## Notes
- Export is client-side, so no server logs to check
- Large reports may take a few seconds to generate
- File downloads go to browser's default download folder
