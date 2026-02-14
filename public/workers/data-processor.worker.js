/**
 * Web Worker for heavy data processing
 * Offloads computation from main thread to improve performance
 */

self.addEventListener('message', (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'PROCESS_ATTENDANCE_DATA':
        processAttendanceData(data);
        break;
      
      case 'CALCULATE_STATISTICS':
        calculateStatistics(data);
        break;
      
      case 'FILTER_LARGE_DATASET':
        filterLargeDataset(data);
        break;
      
      case 'SORT_DATA':
        sortData(data);
        break;
      
      default:
        self.postMessage({ 
          type: 'ERROR', 
          error: `Unknown task type: ${type}` 
        });
    }
  } catch (error) {
    self.postMessage({ 
      type: 'ERROR', 
      error: error.message 
    });
  }
});

/**
 * Process attendance data
 */
function processAttendanceData(data) {
  const { records } = data;
  
  const processed = records.map(record => {
    // Calculate duration
    const clockIn = new Date(record.clockIn);
    const clockOut = record.clockOut ? new Date(record.clockOut) : null;
    
    let duration = 0;
    if (clockOut) {
      duration = (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60); // hours
    }
    
    return {
      ...record,
      duration,
      status: clockOut ? 'completed' : 'active'
    };
  });
  
  self.postMessage({ 
    type: 'PROCESS_ATTENDANCE_DATA_COMPLETE', 
    result: processed 
  });
}

/**
 * Calculate statistics from data
 */
function calculateStatistics(data) {
  const { records, groupBy } = data;
  
  const stats = {};
  
  records.forEach(record => {
    const key = record[groupBy] || 'unknown';
    
    if (!stats[key]) {
      stats[key] = {
        count: 0,
        totalHours: 0,
        avgHours: 0
      };
    }
    
    stats[key].count++;
    if (record.duration) {
      stats[key].totalHours += record.duration;
    }
  });
  
  // Calculate averages
  Object.keys(stats).forEach(key => {
    if (stats[key].count > 0) {
      stats[key].avgHours = stats[key].totalHours / stats[key].count;
    }
  });
  
  self.postMessage({ 
    type: 'CALCULATE_STATISTICS_COMPLETE', 
    result: stats 
  });
}

/**
 * Filter large dataset
 */
function filterLargeDataset(data) {
  const { records, filters } = data;
  
  let filtered = [...records];
  
  // Apply filters
  if (filters.status) {
    filtered = filtered.filter(r => r.status === filters.status);
  }
  
  if (filters.dateFrom) {
    const dateFrom = new Date(filters.dateFrom);
    filtered = filtered.filter(r => new Date(r.clockIn) >= dateFrom);
  }
  
  if (filters.dateTo) {
    const dateTo = new Date(filters.dateTo);
    filtered = filtered.filter(r => new Date(r.clockIn) <= dateTo);
  }
  
  if (filters.employeeId) {
    filtered = filtered.filter(r => r.employeeId === filters.employeeId);
  }
  
  self.postMessage({ 
    type: 'FILTER_LARGE_DATASET_COMPLETE', 
    result: filtered 
  });
}

/**
 * Sort data
 */
function sortData(data) {
  const { records, sortBy, sortOrder } = data;
  
  const sorted = [...records].sort((a, b) => {
    const aVal = a[sortBy];
    const bVal = b[sortBy];
    
    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });
  
  self.postMessage({ 
    type: 'SORT_DATA_COMPLETE', 
    result: sorted 
  });
}

console.log('[Worker] Data processor worker loaded');
