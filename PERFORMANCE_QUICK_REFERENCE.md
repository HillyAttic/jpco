# Performance Optimization - Quick Reference Card

## 🚀 Quick Commands

```bash
# Build and test
npm run build && npm start

# Performance audit
npm run perf:audit

# Lighthouse test
npm run perf:lighthouse

# Bundle analysis
npm run analyze
```

## 📦 Import Patterns

### ❌ Before (Blocking)
```typescript
import { db, auth } from '@/lib/firebase';
import ApexCharts from 'apexcharts';
```

### ✅ After (Optimized)
```typescript
import { getDbLazy, getAuthLazy, preloadFirebase } from '@/lib/firebase-optimized';
const ApexCharts = lazy(() => import('apexcharts'));
```

## 🎯 Component Patterns

### Progressive Hydration
```typescript
<ProgressiveHydration delay={300} priority="low" fallback={<Skeleton />}>
  <HeavyComponent />
</ProgressiveHydration>
```

### Optimized Fetch
```typescript
const { data, loading, error, refetch } = useOptimizedFetch(
  'key',
  fetcher,
  { cacheTime: 5 * 60 * 1000 }
);
```

### Task Chunking
```typescript
const results = await processInChunks(array, processor, 50);
```

### Web Worker
```typescript
const [process, loading] = useWebWorker(heavyFunction);
const result = await process(data);
```

### Optimized Image
```typescript
<OptimizedImage src="/img.jpg" alt="..." width={800} height={600} />
```

## 🎨 Loading States

```typescript
// Skeleton
<SkeletonLoader className="h-64 w-full" />

// Suspense
<Suspense fallback={<Skeleton />}>
  <Component />
</Suspense>

// Loading page
// src/app/[page]/loading.tsx
export default function Loading() {
  return <SkeletonLoader />;
}
```

## 🔧 Optimization Checklist

### Per Component
- [ ] Lazy load heavy dependencies
- [ ] Use optimized fetch
- [ ] Add loading skeletons
- [ ] Memoize expensive operations
- [ ] Handle errors
- [ ] Clean up effects

### Per Page
- [ ] Create loading.tsx
- [ ] Preload Firebase
- [ ] Progressive hydration
- [ ] Optimize images
- [ ] Defer non-critical content

## 📊 Target Metrics

| Metric | Target |
|--------|--------|
| Performance Score | 90+ |
| TBT | <300ms |
| FCP | <1.5s |
| LCP | <2.5s |
| CLS | <0.1 |

## 🐛 Common Issues

### Issue: High TBT
**Fix**: Use `processInChunks` or `useWebWorker`

### Issue: Slow Firebase
**Fix**: Use `getDbLazy()` and `preloadFirebase()`

### Issue: Large Bundles
**Fix**: Check `npm run analyze`, lazy load

### Issue: Layout Shifts
**Fix**: Add loading skeletons, specify image dimensions

## 📚 Key Files

```
src/
├── components/
│   ├── ProgressiveHydration.tsx
│   ├── OptimizedImage.tsx
│   └── Charts/ChartWrapper.tsx
├── hooks/
│   ├── use-optimized-fetch.ts
│   ├── use-deferred-value.ts
│   └── use-web-worker.ts
├── lib/
│   └── firebase-optimized.ts
└── utils/
    └── chunk-tasks.ts
```

## 🎓 Documentation

- **QUICK_PERFORMANCE_WINS.md** - 30-min guide
- **PERFORMANCE_OPTIMIZATION_GUIDE.md** - Full guide
- **IMPLEMENTATION_EXAMPLE.md** - Code examples
- **DEPLOYMENT_PERFORMANCE_CHECKLIST.md** - Deploy guide

## 💡 Pro Tips

1. **Preload Firebase early**
   ```typescript
   useEffect(() => preloadFirebase(), []);
   ```

2. **Batch API calls**
   ```typescript
   const [a, b, c] = await batchFetch([...]);
   ```

3. **Memoize everything expensive**
   ```typescript
   const result = useMemo(() => expensive(), [deps]);
   ```

4. **Use requestIdleCallback**
   ```typescript
   useIdleCallback(() => nonCriticalWork());
   ```

5. **Monitor in production**
   - Vercel Analytics
   - Core Web Vitals
   - Error tracking

## 🚨 Red Flags

- ⚠️ Chunks >500KB
- ⚠️ TBT >300ms
- ⚠️ No loading states
- ⚠️ Synchronous heavy operations
- ⚠️ Direct Firebase imports
- ⚠️ No error handling
- ⚠️ Missing cleanup in useEffect

## ✅ Success Indicators

- ✅ Lighthouse 90+
- ✅ Fast page loads
- ✅ Smooth interactions
- ✅ No layout shifts
- ✅ Proper loading states
- ✅ Good error handling
- ✅ Small bundle sizes

---

**Keep this card handy while implementing optimizations!**
