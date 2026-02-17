# Quick Performance Wins - Implementation Guide

## Immediate Actions (30 minutes)

### 1. Update Dashboard Page (Highest Impact)
Replace the current dashboard data loading with optimized version:

```typescript
// src/app/dashboard/page.tsx
import { useOptimizedFetch } from '@/hooks/use-optimized-fetch';
import { ProgressiveHydration } from '@/components/ProgressiveHydration';
import { ChartWrapper } from '@/components/Charts/ChartWrapper';

// Replace useEffect data fetching with:
const { data: tasks, loading: tasksLoading } = useOptimizedFetch(
  'dashboard-tasks',
  () => taskApi.getTasks(),
  { cacheTime: 5 * 60 * 1000 }
);

// Wrap charts with progressive hydration:
<ProgressiveHydration delay={300} priority="low">
  <ChartWrapper type="task-distribution" data={chartData} />
</ProgressiveHydration>
```

### 2. Lazy Load Firebase (Critical)
Replace all Firebase imports:

```typescript
// Before:
import { db, auth } from '@/lib/firebase';

// After:
import { getDbLazy, getAuthLazy, preloadFirebase } from '@/lib/firebase-optimized';

// In component:
useEffect(() => {
  preloadFirebase(); // Preload during idle time
}, []);

// When needed:
const db = await getDbLazy();
```

### 3. Add Loading Skeletons
Every page should have a loading.tsx:

```typescript
// src/app/[page]/loading.tsx
export default function Loading() {
  return <SkeletonLoader className="h-screen" />;
}
```

## Medium Priority (1-2 hours)

### 4. Optimize AttendanceCalendar
```typescript
// src/components/attendance/AttendanceCalendar.tsx
import { useMemo } from 'react';
import { processInChunks } from '@/utils/chunk-tasks';

// Memoize expensive calculations
const processedDays = useMemo(() => {
  return days.map(day => ({
    ...day,
    color: getDayColor(day.status)
  }));
}, [days]);
```

### 5. Implement Request Batching
```typescript
// src/services/dashboard.service.ts
import { batchFetch } from '@/hooks/use-optimized-fetch';

const [tasks, users, clients] = await batchFetch([
  { key: 'tasks', fetcher: () => taskApi.getTasks() },
  { key: 'users', fetcher: () => userApi.getUsers() },
  { key: 'clients', fetcher: () => clientApi.getClients() }
]);
```

### 6. Optimize Images
```typescript
// Replace all <img> with:
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src="/path/to/image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false} // Only true for above-the-fold images
/>
```

## Low Priority (Nice to Have)

### 7. Add Service Worker Caching
```javascript
// public/sw.js
const CACHE_NAME = 'jpco-v1';
const urlsToCache = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/_next/static/css/app.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});
```

### 8. Implement Virtual Scrolling
For large lists (>100 items):

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const rowVirtualizer = useVirtualizer({
  count: items.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 50,
});
```

## Testing Your Changes

### 1. Build and Test Locally
```bash
npm run build
npm start
```

### 2. Run Lighthouse
```bash
npx lighthouse http://localhost:3000 --view
```

### 3. Check Bundle Sizes
```bash
npm run analyze
```

## Expected Results

### Before
- Performance: 60-70
- TBT: 4,260ms
- FCP: 2.5s
- LCP: 4.5s

### After (Target)
- Performance: 90+
- TBT: <300ms
- FCP: <1.5s
- LCP: <2.5s

## Common Issues & Solutions

### Issue: "Module not found" errors
**Solution**: Run `npm install` to ensure all dependencies are installed

### Issue: Build fails with TypeScript errors
**Solution**: Check that all new files have proper type definitions

### Issue: Charts not loading
**Solution**: Verify ChartWrapper is properly imported and used

### Issue: Firebase connection errors
**Solution**: Ensure environment variables are set correctly

## Verification Checklist

- [ ] Dashboard loads in <2s
- [ ] No console errors
- [ ] Charts load progressively
- [ ] Images lazy load
- [ ] Firebase initializes lazily
- [ ] Loading skeletons appear
- [ ] Lighthouse score 90+
- [ ] No layout shifts (CLS <0.1)
- [ ] Smooth scrolling
- [ ] Fast navigation between pages

## Next Steps

1. Implement immediate actions first
2. Test thoroughly
3. Deploy to staging
4. Monitor performance metrics
5. Iterate based on real-world data

## Support

If you encounter issues:
1. Check browser console for errors
2. Review PERFORMANCE_OPTIMIZATION_GUIDE.md
3. Profile with Chrome DevTools
4. Check network tab for slow requests
