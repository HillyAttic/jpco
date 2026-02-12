# 🧪 Dark Mode Testing Checklist

Use this checklist to verify that dark mode is working correctly across your application.

## 🎯 Quick Test (5 minutes)

- [ ] Toggle dark mode on/off from the theme switcher
- [ ] Visit the dashboard - check if all stat cards are visible
- [ ] Open a modal - verify background and text are visible
- [ ] Fill out a form - check if inputs are readable
- [ ] View a table/list - ensure rows and borders are visible

## 📋 Comprehensive Test (30 minutes)

### Navigation & Layout
- [ ] Header is visible in dark mode
- [ ] Sidebar is visible in dark mode
- [ ] Navigation links are readable
- [ ] Active page indicator is visible
- [ ] Logo and icons are visible

### Dashboard (`/dashboard`)
- [ ] All stat cards are visible
- [ ] Card titles and values are readable
- [ ] Icons have proper contrast
- [ ] Task overview section is visible
- [ ] Activity feed is readable
- [ ] Upcoming deadlines are visible
- [ ] Quick actions buttons are visible
- [ ] Hover states work correctly
- [ ] Modals open with proper styling

### Tasks (`/tasks`)
- [ ] Task list is visible
- [ ] Task cards have proper contrast
- [ ] Task filters are usable
- [ ] Filter dropdowns are readable
- [ ] Search input is visible
- [ ] Task creation modal is visible
- [ ] Task detail modal is readable
- [ ] Status badges are visible
- [ ] Priority indicators are clear
- [ ] Hover effects work

### Employees (`/employees`)
- [ ] Employee list (grid view) is visible
- [ ] Employee list (list view) is visible
- [ ] Employee cards have proper styling
- [ ] Employee filters work
- [ ] Search input is readable
- [ ] Employee modal is visible
- [ ] Form inputs are usable
- [ ] Status badges are visible
- [ ] Bulk selection works
- [ ] Bulk action toolbar is visible

### Teams (`/teams`)
- [ ] Team list is visible
- [ ] Team cards are readable
- [ ] Team filters work
- [ ] Team modal is visible
- [ ] Member selection is usable
- [ ] Team details are visible

### Calendar (`/calendar`)
- [ ] Calendar grid is visible
- [ ] Date cells are readable
- [ ] Events are visible
- [ ] Event modals work
- [ ] Navigation controls are visible

### Kanban (`/kanban`)
- [ ] Kanban board is visible
- [ ] Columns are distinguishable
- [ ] Task cards are readable
- [ ] Drag and drop works
- [ ] Add task modal is visible
- [ ] Filter modal works

### Attendance (`/attendance`)
- [ ] Attendance tracker is visible
- [ ] Check-in/out buttons work
- [ ] History list is readable
- [ ] Calendar modal is visible
- [ ] Stats cards are visible
- [ ] Export modal works

### Reports (`/reports`)
- [ ] Reports table is visible
- [ ] Table headers are readable
- [ ] Table rows are visible
- [ ] Filters work correctly
- [ ] Export functionality is visible
- [ ] Detail modals work

### Roster (`/roster`)
- [ ] Schedule view is visible
- [ ] Calendar grid is readable
- [ ] Shift assignments are visible
- [ ] Update modal works
- [ ] Team member selection is usable

### Clients (`/clients`)
- [ ] Client list is visible
- [ ] Client cards are readable
- [ ] Client filters work
- [ ] Client modal is visible
- [ ] Bulk import works

### Categories (`/categories`)
- [ ] Category list is visible
- [ ] Category cards are readable
- [ ] Category modal works
- [ ] Form inputs are usable

### Notifications (`/notifications`)
- [ ] Notification list is visible
- [ ] Notification items are readable
- [ ] Notification dropdown works
- [ ] Badge counter is visible
- [ ] Mark as read works

### Settings (`/settings`)
- [ ] Settings page is visible
- [ ] Form inputs are readable
- [ ] Save button is visible
- [ ] Sections are distinguishable

### Profile (`/profile`)
- [ ] Profile page is visible
- [ ] User info is readable
- [ ] Edit form works
- [ ] Avatar is visible
- [ ] Save button works

## 🎨 Component-Specific Tests

### Buttons
- [ ] Primary buttons are visible
- [ ] Secondary buttons are visible
- [ ] Outline buttons are visible
- [ ] Ghost buttons are visible
- [ ] Disabled buttons have proper styling
- [ ] Hover states work
- [ ] Focus states are visible

### Forms
- [ ] Text inputs are readable
- [ ] Select dropdowns work
- [ ] Textareas are visible
- [ ] Checkboxes are visible
- [ ] Radio buttons work
- [ ] Labels are readable
- [ ] Placeholders are visible
- [ ] Error messages are visible
- [ ] Success messages are visible

### Modals & Dialogs
- [ ] Modal overlay is visible
- [ ] Modal content is readable
- [ ] Modal headers are visible
- [ ] Modal footers work
- [ ] Close buttons are visible
- [ ] Confirmation dialogs work
- [ ] Form modals are usable

### Tables
- [ ] Table headers are visible
- [ ] Table rows are readable
- [ ] Row hover states work
- [ ] Borders are visible
- [ ] Pagination works
- [ ] Sort indicators are visible
- [ ] Empty states are visible

### Cards
- [ ] Card backgrounds are visible
- [ ] Card borders are visible
- [ ] Card headers are readable
- [ ] Card content is visible
- [ ] Card footers work
- [ ] Hover effects work

### Badges & Tags
- [ ] Status badges are visible
- [ ] Priority badges are visible
- [ ] Category tags are visible
- [ ] Filter tags work
- [ ] Remove buttons are visible

### Icons
- [ ] All icons are visible
- [ ] Icon colors have proper contrast
- [ ] Icon hover states work
- [ ] Icon buttons are usable

### Loading States
- [ ] Loading spinners are visible
- [ ] Skeleton loaders work
- [ ] Progress bars are visible
- [ ] Loading text is readable

### Empty States
- [ ] Empty state messages are visible
- [ ] Empty state icons are visible
- [ ] Action buttons work

## 🔍 Edge Cases

### Hover States
- [ ] Button hover states work
- [ ] Link hover states work
- [ ] Card hover states work
- [ ] Row hover states work
- [ ] Icon hover states work

### Focus States
- [ ] Input focus rings are visible
- [ ] Button focus states work
- [ ] Link focus states work
- [ ] Keyboard navigation works

### Active States
- [ ] Active navigation items are visible
- [ ] Active tabs are visible
- [ ] Active filters are visible
- [ ] Selected items are visible

### Disabled States
- [ ] Disabled buttons are visible
- [ ] Disabled inputs are visible
- [ ] Disabled options are visible

### Error States
- [ ] Error messages are visible
- [ ] Error borders are visible
- [ ] Error icons are visible

### Success States
- [ ] Success messages are visible
- [ ] Success icons are visible
- [ ] Success borders are visible

## 📱 Responsive Testing

### Mobile (< 768px)
- [ ] All content is visible
- [ ] Navigation works
- [ ] Modals are usable
- [ ] Forms are usable
- [ ] Tables are scrollable

### Tablet (768px - 1024px)
- [ ] Layout adapts correctly
- [ ] All content is visible
- [ ] Navigation works
- [ ] Modals fit properly

### Desktop (> 1024px)
- [ ] Full layout is visible
- [ ] All features work
- [ ] Hover states work
- [ ] Modals are centered

## 🌐 Browser Testing

- [ ] Chrome/Edge (Chromium)
- [ ] Firefox
- [ ] Safari
- [ ] Mobile browsers

## ✅ Final Verification

- [ ] No white content on dark backgrounds
- [ ] No dark content on dark backgrounds
- [ ] All borders are visible
- [ ] All text is readable
- [ ] All icons are visible
- [ ] All buttons are usable
- [ ] All forms work correctly
- [ ] All modals are visible
- [ ] All tables are readable
- [ ] All cards are visible
- [ ] Smooth transitions between modes
- [ ] No console errors
- [ ] No visual glitches

## 📊 Test Results

| Category | Pass | Fail | Notes |
|----------|------|------|-------|
| Navigation | ☐ | ☐ | |
| Dashboard | ☐ | ☐ | |
| Tasks | ☐ | ☐ | |
| Employees | ☐ | ☐ | |
| Teams | ☐ | ☐ | |
| Calendar | ☐ | ☐ | |
| Kanban | ☐ | ☐ | |
| Attendance | ☐ | ☐ | |
| Reports | ☐ | ☐ | |
| Roster | ☐ | ☐ | |
| Forms | ☐ | ☐ | |
| Modals | ☐ | ☐ | |
| Tables | ☐ | ☐ | |
| Buttons | ☐ | ☐ | |
| Overall | ☐ | ☐ | |

## 🐛 Issues Found

If you find any issues, document them here:

1. **Issue**: 
   - **Location**: 
   - **Description**: 
   - **Fix**: 

2. **Issue**: 
   - **Location**: 
   - **Description**: 
   - **Fix**: 

## ✨ Sign-Off

- [ ] All tests passed
- [ ] No critical issues found
- [ ] Dark mode is production-ready
- [ ] Documentation is complete

**Tested By**: _______________  
**Date**: _______________  
**Status**: ☐ Approved ☐ Needs Work

---

**Note**: If you find any components that still need dark mode fixes, refer to `DARK_MODE_QUICK_REFERENCE.md` for the correct patterns to apply.
