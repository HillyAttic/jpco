/**
 * Performance Audit Script
 * Analyzes bundle sizes and identifies optimization opportunities
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Running Performance Audit...\n');

// Check if build exists
const buildPath = path.join(process.cwd(), '.next');
if (!fs.existsSync(buildPath)) {
  console.error('❌ Build not found. Run "npm run build" first.');
  process.exit(1);
}

// Analyze bundle sizes
const staticPath = path.join(buildPath, 'static', 'chunks');
if (fs.existsSync(staticPath)) {
  console.log('📦 Bundle Analysis:\n');
  
  const chunks = fs.readdirSync(staticPath)
    .filter(file => file.endsWith('.js'))
    .map(file => {
      const filePath = path.join(staticPath, file);
      const stats = fs.statSync(filePath);
      return {
        name: file,
        size: stats.size,
        sizeKB: (stats.size / 1024).toFixed(2)
      };
    })
    .sort((a, b) => b.size - a.size);

  // Show top 10 largest chunks
  console.log('Top 10 Largest Chunks:');
  chunks.slice(0, 10).forEach((chunk, index) => {
    const emoji = chunk.sizeKB > 500 ? '🔴' : chunk.sizeKB > 200 ? '🟡' : '🟢';
    console.log(`${emoji} ${index + 1}. ${chunk.name}: ${chunk.sizeKB} KB`);
  });

  // Calculate total size
  const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);
  const totalSizeKB = (totalSize / 1024).toFixed(2);
  const totalSizeMB = (totalSize / 1024 / 1024).toFixed(2);
  
  console.log(`\n📊 Total Bundle Size: ${totalSizeKB} KB (${totalSizeMB} MB)`);
  
  // Recommendations
  console.log('\n💡 Recommendations:\n');
  
  const largeChunks = chunks.filter(c => c.size > 500 * 1024);
  if (largeChunks.length > 0) {
    console.log('⚠️  Large chunks detected (>500KB):');
    largeChunks.forEach(chunk => {
      console.log(`   - ${chunk.name}: Consider code splitting or lazy loading`);
    });
  }
  
  const firebaseChunk = chunks.find(c => c.name.includes('firebase'));
  if (firebaseChunk && firebaseChunk.size > 300 * 1024) {
    console.log('⚠️  Firebase chunk is large. Ensure lazy loading is implemented.');
  }
  
  const chartChunk = chunks.find(c => c.name.includes('chart') || c.name.includes('apex'));
  if (chartChunk && chartChunk.size > 200 * 1024) {
    console.log('⚠️  Chart library is large. Use dynamic imports and progressive hydration.');
  }
  
  if (totalSize > 5 * 1024 * 1024) {
    console.log('⚠️  Total bundle size exceeds 5MB. Consider:');
    console.log('   - Removing unused dependencies');
    console.log('   - Implementing more aggressive code splitting');
    console.log('   - Using lighter alternatives for heavy libraries');
  }
}

// Check for optimization opportunities
console.log('\n🔧 Optimization Checklist:\n');

const checks = [
  {
    name: 'Progressive Hydration',
    file: 'src/components/ProgressiveHydration.tsx',
    status: fs.existsSync(path.join(process.cwd(), 'src/components/ProgressiveHydration.tsx'))
  },
  {
    name: 'Lazy Firebase',
    file: 'src/lib/firebase-optimized.ts',
    status: fs.existsSync(path.join(process.cwd(), 'src/lib/firebase-optimized.ts'))
  },
  {
    name: 'Optimized Fetch Hook',
    file: 'src/hooks/use-optimized-fetch.ts',
    status: fs.existsSync(path.join(process.cwd(), 'src/hooks/use-optimized-fetch.ts'))
  },
  {
    name: 'Task Chunking Utils',
    file: 'src/utils/chunk-tasks.ts',
    status: fs.existsSync(path.join(process.cwd(), 'src/utils/chunk-tasks.ts'))
  },
  {
    name: 'Dashboard Loading Skeleton',
    file: 'src/app/dashboard/loading.tsx',
    status: fs.existsSync(path.join(process.cwd(), 'src/app/dashboard/loading.tsx'))
  },
  {
    name: 'Performance Headers',
    file: 'next.config.mjs',
    status: (() => {
      try {
        const configPath = path.join(process.cwd(), 'next.config.mjs');
        if (!fs.existsSync(configPath)) return false;
        const content = fs.readFileSync(configPath, 'utf8');
        return content.includes('async headers()') && content.includes('Cache-Control');
      } catch {
        return false;
      }
    })()
  }
];

checks.forEach(check => {
  const emoji = check.status ? '✅' : '❌';
  console.log(`${emoji} ${check.name}`);
});

console.log('\n✨ Audit Complete!\n');

// Exit with appropriate code
const allChecksPass = checks.every(c => c.status);
if (!allChecksPass) {
  console.log('⚠️  Some optimization files are missing. Review QUICK_PERFORMANCE_WINS.md\n');
  process.exit(1);
}

console.log('🎉 All optimization files are in place!\n');
console.log('Next steps:');
console.log('1. Run "npm run perf:lighthouse" to test performance');
console.log('2. Review PERFORMANCE_OPTIMIZATION_GUIDE.md for implementation details');
console.log('3. Update components to use new optimization utilities\n');
