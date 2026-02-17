# Performance Optimization - Implementation Example

## Complete Dashboard Page Optimization

This example shows how to transform the existing dashboard page to use all performance optimizations.

### Before (Current Implementation)

```typescript
// src/app/dashboard/page.tsx - BEFORE
'use client';

import { useState, useEffect } from 'react';
import { auth, db } from '@/lib/firebase'; // ❌ Blocks initial load
import { taskApi } from '@/services/task.api';
import { TaskDistributionChart } from '@/components/Charts/TaskDistributionChart'; // ❌ Heavy import
import { WeeklyProgressChart } from '@/components/Charts/WeeklyProgressChart'; // ❌ Heavy import

export default function DashboardPage() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // ❌ Blocks render, no caching, no error handling
  useEffect(() => {
    const loadData = async () => {
      const data = await taskApi.getTasks();
      setTasks(data);
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <div>Loading...</div>; // ❌ No skeleton

  return (
    <div>
      <TaskDistributionChart data={tasks} /> {/* ❌ Blocks render */}
      <WeeklyProgressChart data={tasks} /> {/* ❌ Blocks render */}
    </div>
  );
}
```

### After (Optimized Implementation)

```typescript
// src/app/dashboard/page.tsx - AFTER
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useOptimizedFetch } from '@/hooks/use-optimized-fetch';
import { useDeferredRender } from '@/hooks/use-deferred-value';
import { ProgressiveHydration, SkeletonLoader } from '@/components/ProgressiveHydration';
import { ChartWrapper } from '@/components/Charts/ChartWrapper';
import { getDbLazy, getAuthLazy, preloadFirebase } from '@/lib/firebase-optimized';
import { taskApi } from '@/services/task.api';
import { processInChunks } from '@/utils/chunk-tasks';

export default function DashboardPage() {
  // ✅ Preload Firebase during idle time
  useEffect(() => {
    preloadFirebase();
  }, []);

  // ✅ Optimized fetch with caching and deduplication
  const { data: tasks, loading, error, refetch } = useOptimizedFetch(
    'dashboard-tasks',
    () => taskApi.getTasks(),
    {
      cacheTime: 5 * 60 * 1000, // 5 minutes
      dedupe: true,
      retry: 3
    }
  );

  // ✅ Defer rendering of non-critical components
  const shouldRenderCharts = useDeferredRender(300);

  // ✅ Process large datasets in chunks
  const processedTasks = useMemo(() => {
    if (!tasks) return [];
    return tasks.map(task => ({
      ...task,
      // Expensive computation here
    }));
  }, [tasks]);

  // ✅ Proper loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonLoader className="h-32 w-full" />
        <SkeletonLoader className="h-64 w-full" />
        <SkeletonLoader className="h-64 w-full" />
      </div>
    );
  }

  // ✅ Error handling
  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-800 rounded">
        Error loading dashboard: {error.message}
        <button onClick={refetch} className="ml-4 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ Critical content renders immediately */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard title="Total Tasks" value={tasks?.length || 0} />
        <StatCard title="Completed" value={completedCount} />
        <StatCard title="In Progress" value={inProgressCount} />
        <StatCard title="Overdue" value={overdueCount} />
      </div>

      {/* ✅ Charts load progressively */}
      {shouldRenderCharts && (
        <>
          <ProgressiveHydration
            delay={100}
            priority="medium"
            fallback={<SkeletonLoader className="h-64 w-full" />}
          >
            <Suspense fallback={<SkeletonLoader className="h-64 w-full" />}>
              <ChartWrapper
                type="task-distribution"
                data={processedTasks}
              />
            </Suspense>
          </ProgressiveHydration>

          <ProgressiveHydration
            delay={200}
            priority="low"
            fallback={<SkeletonLoader className="h-64 w-full" />}
          >
            <Suspense fallback={<SkeletonLoader className="h-64 w-full" />}>
              <ChartWrapper
                type="weekly-progress"
                data={processedTasks}
              />
            </Suspense>
          </ProgressiveHydration>
        </>
      )}
    </div>
  );
}
```

## Service Layer Optimization

### Before

```typescript
// src/services/task.api.ts - BEFORE
import { db } from '@/lib/firebase'; // ❌ Blocks import
import { collection, getDocs } from 'firebase/firestore';

export const taskApi = {
  async getTasks() {
    const snapshot = await getDocs(collection(db, 'tasks'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
```

### After

```typescript
// src/services/task.api.ts - AFTER
import { getDbLazy } from '@/lib/firebase-optimized'; // ✅ Lazy load

export const taskApi = {
  async getTasks() {
    // ✅ Load Firebase only when needed
    const { collection, getDocs } = await import('firebase/firestore');
    const db = await getDbLazy();
    
    const snapshot = await getDocs(collection(db, 'tasks'));
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
};
```

## Component Optimization

### Before

```typescript
// src/components/TaskList.tsx - BEFORE
export function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <div>
      {tasks.map(task => (
        <TaskCard key={task.id} task={task} /> // ❌ Renders all at once
      ))}
    </div>
  );
}
```

### After

```typescript
// src/components/TaskList.tsx - AFTER
import { useMemo } from 'react';
import { processInChunks } from '@/utils/chunk-tasks';

export function TaskList({ tasks }: { tasks: Task[] }) {
  // ✅ Memoize expensive operations
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [tasks]);

  // ✅ Render in chunks for large lists
  const [visibleTasks, setVisibleTasks] = useState(sortedTasks.slice(0, 20));

  useEffect(() => {
    if (sortedTasks.length > 20) {
      // Load more in background
      requestIdleCallback(() => {
        setVisibleTasks(sortedTasks);
      });
    }
  }, [sortedTasks]);

  return (
    <div>
      {visibleTasks.map(task => (
        <TaskCard key={task.id} task={task} />
      ))}
    </div>
  );
}

// ✅ Memoize individual cards
const TaskCard = React.memo(({ task }: { task: Task }) => {
  return (
    <div className="p-4 border rounded">
      <h3>{task.title}</h3>
      <p>{task.description}</p>
    </div>
  );
});
```

## Heavy Computation Optimization

### Before

```typescript
// Heavy computation blocking main thread
function processLargeDataset(data: any[]) {
  return data.map(item => {
    // Expensive operation
    return complexCalculation(item);
  }); // ❌ Blocks for 500ms+
}
```

### After - Option 1: Task Chunking

```typescript
import { processInChunks } from '@/utils/chunk-tasks';

async function processLargeDataset(data: any[]) {
  // ✅ Process in chunks, yielding to main thread
  return await processInChunks(
    data,
    (item) => complexCalculation(item),
    50 // Process 50 items at a time
  );
}
```

### After - Option 2: Web Worker

```typescript
import { useWebWorker } from '@/hooks/use-web-worker';

function MyComponent() {
  const [processData, loading, error] = useWebWorker((data: any[]) => {
    // ✅ Runs in background thread
    return data.map(item => complexCalculation(item));
  });

  const handleProcess = async () => {
    const result = await processData(largeDataset);
    setProcessedData(result);
  };
}
```

## Image Optimization

### Before

```typescript
<img src="/images/large-image.jpg" alt="Description" /> // ❌ No optimization
```

### After

```typescript
import { OptimizedImage } from '@/components/OptimizedImage';

<OptimizedImage
  src="/images/large-image.jpg"
  alt="Description"
  width={800}
  height={600}
  priority={false} // true only for above-the-fold
  className="rounded-lg"
/>
```

## Data Fetching Patterns

### Pattern 1: Single Fetch with Caching

```typescript
const { data, loading, error } = useOptimizedFetch(
  'users',
  () => userApi.getUsers(),
  { cacheTime: 10 * 60 * 1000 } // 10 minutes
);
```

### Pattern 2: Batch Fetching

```typescript
import { batchFetch } from '@/hooks/use-optimized-fetch';

const [tasks, users, clients] = await batchFetch([
  { key: 'tasks', fetcher: () => taskApi.getTasks() },
  { key: 'users', fetcher: () => userApi.getUsers() },
  { key: 'clients', fetcher: () => clientApi.getClients() }
], { cacheTime: 5 * 60 * 1000 });
```

### Pattern 3: Dependent Fetches

```typescript
// Fetch user first
const { data: user } = useOptimizedFetch('user', () => userApi.getCurrent());

// Then fetch user's tasks
const { data: tasks } = useOptimizedFetch(
  `tasks-${user?.id}`,
  () => taskApi.getByUser(user!.id),
  { enabled: !!user } // Only fetch when user is available
);
```

## Testing Your Optimizations

### 1. Visual Comparison

```bash
# Before optimization
npm run build
npm start
# Open DevTools > Performance > Record page load
# Note: TBT, FCP, LCP values

# After optimization
# Record again and compare
```

### 2. Automated Testing

```bash
# Run performance audit
npm run perf:audit

# Run Lighthouse
npm run perf:lighthouse

# Analyze bundles
npm run analyze
```

### 3. Real User Monitoring

```typescript
// Add to layout.tsx
import { useEffect } from 'react';

export default function RootLayout({ children }) {
  useEffect(() => {
    // Report Web Vitals
    if (typeof window !== 'undefined' && 'performance' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log(`${entry.name}: ${entry.duration}ms`);
          // Send to analytics
        }
      });
      observer.observe({ entryTypes: ['measure', 'navigation'] });
    }
  }, []);

  return children;
}
```

## Common Pitfalls to Avoid

### ❌ Don't Do This

```typescript
// Importing heavy libraries at top level
import ApexCharts from 'apexcharts'; // Blocks initial load
import { db } from '@/lib/firebase'; // Blocks initial load

// Synchronous heavy operations
const result = heavyComputation(largeArray); // Blocks main thread

// No loading states
if (!data) return null; // Bad UX

// Fetching in useEffect without cleanup
useEffect(() => {
  fetchData().then(setData); // Memory leak if unmounted
}, []);
```

### ✅ Do This Instead

```typescript
// Lazy load heavy libraries
const ApexCharts = lazy(() => import('apexcharts'));
import { getDbLazy } from '@/lib/firebase-optimized';

// Async heavy operations
const result = await processInChunks(largeArray, processor);

// Proper loading states
if (!data) return <SkeletonLoader />;

// Cleanup in useEffect
useEffect(() => {
  let mounted = true;
  fetchData().then(data => {
    if (mounted) setData(data);
  });
  return () => { mounted = false; };
}, []);
```

## Checklist for Each Component

- [ ] Uses lazy loading for heavy dependencies
- [ ] Implements proper loading states
- [ ] Memoizes expensive computations
- [ ] Handles errors gracefully
- [ ] Cleans up effects properly
- [ ] Uses optimized fetch for data
- [ ] Processes large datasets in chunks
- [ ] Defers non-critical rendering
- [ ] Optimizes images
- [ ] No console errors

## Next Steps

1. Start with the dashboard page (highest impact)
2. Update one component at a time
3. Test after each change
4. Monitor performance metrics
5. Iterate based on results

## Support

If you need help:
1. Review QUICK_PERFORMANCE_WINS.md
2. Check PERFORMANCE_OPTIMIZATION_GUIDE.md
3. Run `npm run perf:audit` for diagnostics
4. Profile with Chrome DevTools
