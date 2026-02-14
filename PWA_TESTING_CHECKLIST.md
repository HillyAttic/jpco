# PWA Testing Checklist

## 🎯 Quick Test Commands

```bash
# Build for production
npm run build

# Test production build locally
npm run start

# Optimize images
npm run optimize:images

# Run Lighthouse audit
# Open Chrome DevTools → Lighthouse → Generate Report
```

## ✅ Performance Testing

### Lighthouse Audit
- [ ] Open Chrome DevTools (F12)
- [ ] Go to Lighthouse tab
- [ ] Select "Performance" and "Progressive Web App"
- [ ] Click "Generate report"
- [ ] Target scores:
  - Performance: 90+
  - PWA: 100
  - Accessibility: 90+
  - Best Practices: 90+
  - SEO: 90+

### Core Web Vitals
- [ ] First Contentful Paint (FCP): < 1.8s
- [ ] Largest Contentful Paint (LCP): < 2.5s
- [ ] First Input Delay (FID): < 100ms
- [ ] Cumulative Layout Shift (CLS): < 0.1
- [ ] Time to Interactive (TTI): < 3.8s
- [ ] Total Blocking Time (TBT): < 200ms

### Network Testing
- [ ] Test on Fast 3G (Chrome DevTools → Network → Throttling)
- [ ] Test on Slow 3G
- [ ] Test offline (Service Worker should cache assets)
- [ ] Verify lazy loading works (Network tab → check when components load)

### CPU Throttling
- [ ] Open Chrome DevTools → Performance
- [ ] Set CPU throttling to 4x slowdown
- [ ] Navigate through app
- [ ] Verify no freezing or long tasks

## 📱 PWA Installation Testing

### Desktop - Chrome/Edge
1. [ ] Open app in Chrome/Edge
2. [ ] Look for install icon (⊕) in address bar
3. [ ] Click install icon
4. [ ] Verify install prompt appears
5. [ ] Click "Install"
6. [ ] Verify app opens in standalone window
7. [ ] Check app appears in Start Menu/Applications
8. [ ] Test app shortcuts (right-click app icon)

### Desktop - Verification
- [ ] No browser UI (address bar, tabs)
- [ ] Custom title bar with app name
- [ ] App icon in taskbar
- [ ] Can be launched from Start Menu
- [ ] Persists after browser closes

### Android - Chrome
1. [ ] Open app in Chrome on Android
2. [ ] Tap menu (⋮) → "Add to Home screen"
3. [ ] Or look for install banner at bottom
4. [ ] Tap "Install" or "Add"
5. [ ] Verify app icon added to home screen
6. [ ] Tap icon to launch
7. [ ] Verify opens in standalone mode

### Android - Verification
- [ ] No browser UI visible
- [ ] Splash screen shows on launch
- [ ] Status bar matches theme color
- [ ] Back button works correctly
- [ ] Can switch between apps normally
- [ ] Appears in app drawer
- [ ] Can be uninstalled like native app

### iOS - Safari
1. [ ] Open app in Safari on iOS
2. [ ] Tap Share button (square with arrow)
3. [ ] Scroll and tap "Add to Home Screen"
4. [ ] Edit name if desired
5. [ ] Tap "Add"
6. [ ] Verify icon added to home screen
7. [ ] Tap icon to launch

### iOS - Verification
- [ ] No Safari UI visible
- [ ] Splash screen shows on launch
- [ ] Status bar matches theme
- [ ] Can switch between apps
- [ ] Persists after Safari closes

## 🔄 Back/Forward Cache Testing

### Chrome BFCache Test
1. [ ] Open Chrome DevTools
2. [ ] Go to Application → Back/forward cache
3. [ ] Navigate to a page
4. [ ] Click a link to navigate away
5. [ ] Click browser back button
6. [ ] Check "Back/forward cache" panel
7. [ ] Verify "Restored from bfcache: Yes"

### Manual BFCache Test
- [ ] Navigate to dashboard
- [ ] Click to tasks page
- [ ] Click browser back button
- [ ] Verify instant navigation (no loading)
- [ ] Verify data is fresh (not stale)
- [ ] Check console for bfcache events

### BFCache Blockers Check
- [ ] No `beforeunload` event listeners
- [ ] No `unload` event listeners
- [ ] No open IndexedDB transactions
- [ ] No in-progress fetch requests
- [ ] Service worker properly handles freeze/resume

## 🚀 Lazy Loading Verification

### Component Lazy Loading
1. [ ] Open Chrome DevTools → Network
2. [ ] Clear network log
3. [ ] Load attendance page
4. [ ] Verify calendar modal NOT loaded initially
5. [ ] Click "Calendar Overview"
6. [ ] Verify calendar modal loads now
7. [ ] Check bundle size is smaller

### Firebase Lazy Loading
- [ ] Open Network tab
- [ ] Load dashboard (doesn't use Firestore)
- [ ] Verify Firestore NOT loaded
- [ ] Navigate to attendance page
- [ ] Verify Firestore loads now

### Image Lazy Loading
- [ ] Open Network tab → Images
- [ ] Scroll to bottom of page
- [ ] Verify images load as they enter viewport
- [ ] Check WebP format is used (if supported)

## 🎨 Visual Testing

### Responsive Design
- [ ] Test on mobile (375px width)
- [ ] Test on tablet (768px width)
- [ ] Test on desktop (1920px width)
- [ ] Verify no horizontal scroll
- [ ] Check touch targets (44x44px minimum)

### Dark Mode
- [ ] Toggle dark mode
- [ ] Verify all components update
- [ ] Check contrast ratios
- [ ] Verify images/icons visible

### Accessibility
- [ ] Tab through page (keyboard navigation)
- [ ] Verify focus indicators visible
- [ ] Test with screen reader
- [ ] Check color contrast (WCAG AA)
- [ ] Verify alt text on images

## 🔔 Push Notifications

### Permission Request
- [ ] Verify permission prompt appears
- [ ] Test "Allow" flow
- [ ] Test "Block" flow
- [ ] Verify graceful handling of blocked

### Notification Display
- [ ] Send test notification
- [ ] Verify notification appears
- [ ] Check icon displays correctly
- [ ] Verify title and body correct
- [ ] Test notification click
- [ ] Verify opens correct page

### Background Notifications
- [ ] Close app completely
- [ ] Send notification
- [ ] Verify notification appears
- [ ] Click notification
- [ ] Verify app opens to correct page

## 💾 Offline Functionality

### Service Worker
- [ ] Open DevTools → Application → Service Workers
- [ ] Verify service worker registered
- [ ] Check status is "activated"
- [ ] Verify update on reload works

### Offline Mode
- [ ] Load app while online
- [ ] Open DevTools → Network
- [ ] Check "Offline" checkbox
- [ ] Refresh page
- [ ] Verify app still loads
- [ ] Check cached assets serve correctly

### Offline Actions
- [ ] Go offline
- [ ] Try to perform action (e.g., clock in)
- [ ] Verify queued for later
- [ ] Go back online
- [ ] Verify action syncs automatically

## 🔍 Bundle Analysis

### Check Bundle Size
```bash
npm run build
```

Look for output:
- [ ] Total bundle size < 1 MB
- [ ] First Load JS < 200 KB
- [ ] Shared chunks properly split

### Analyze Bundle
```bash
npm run analyze
```

- [ ] No duplicate dependencies
- [ ] Large libraries code-split
- [ ] Tree-shaking working
- [ ] No unused code in bundles

## 🧪 Web Worker Testing

### Data Processing
- [ ] Load attendance page with 100+ records
- [ ] Verify UI remains responsive
- [ ] Check console for worker messages
- [ ] Verify calculations correct

### Performance Comparison
- [ ] Time operation without worker
- [ ] Time operation with worker
- [ ] Verify worker is faster for large datasets

## 📊 Real User Monitoring

### Vercel Analytics
- [ ] Deploy to Vercel
- [ ] Enable Analytics
- [ ] Monitor Core Web Vitals
- [ ] Check real user metrics

### Error Tracking
- [ ] Check browser console for errors
- [ ] Verify error boundaries work
- [ ] Test error recovery flows

## ✨ Final Verification

### PWA Criteria
- [ ] Served over HTTPS
- [ ] Registers a service worker
- [ ] Has a web app manifest
- [ ] Has icons (192x192, 512x512)
- [ ] Works offline
- [ ] Fast load time (< 3s)
- [ ] Responsive design
- [ ] Cross-browser compatible

### Installation Prompt
- [ ] Appears automatically (if criteria met)
- [ ] Can be triggered manually
- [ ] Shows correct app name
- [ ] Shows correct icon
- [ ] Installation succeeds

### Post-Installation
- [ ] App launches in standalone mode
- [ ] Splash screen displays
- [ ] Theme color applied
- [ ] Navigation works correctly
- [ ] All features functional
- [ ] Can be uninstalled

## 🎉 Success Criteria

All tests passing means:
- ✅ High-performance PWA
- ✅ Installable on all platforms
- ✅ Works offline
- ✅ Fast and responsive
- ✅ Optimized bundle size
- ✅ Excellent user experience

## 📝 Notes

### Common Issues

**Install prompt not showing:**
- Check HTTPS is enabled
- Verify manifest.json is valid
- Ensure service worker registered
- Check Chrome DevTools → Application → Manifest

**Slow performance:**
- Run Lighthouse audit
- Check Network tab for large assets
- Verify lazy loading working
- Check for long tasks in Performance tab

**BFCache not working:**
- Check for beforeunload listeners
- Verify no open connections
- Check Application → Back/forward cache panel

**Images not optimized:**
- Run `npm run optimize:images`
- Use Next.js Image component
- Verify WebP format used

### Testing Tools

- Chrome DevTools
- Lighthouse
- WebPageTest
- PageSpeed Insights
- Chrome UX Report

### Resources

- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Lighthouse Scoring](https://web.dev/performance-scoring/)
- [BFCache Guide](https://web.dev/bfcache/)
