// Temporary test component to diagnose holiday fetching
// Add this to your attendance roster page temporarily to test

'use client';

import { useState } from 'react';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export function HolidayDebugger() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const testFetch = async () => {
    setLoading(true);
    try {
      const snapshot = await getDocs(collection(db, 'holidays'));
      
      const holidays = snapshot.docs.map(doc => {
        const data = doc.data();
        let dateInfo = 'Unknown';
        let dateType = typeof data.date;
        let isTimestamp = false;
        let formattedDate = 'N/A';
        
        if (data.date) {
          isTimestamp = typeof data.date.toDate === 'function';
          
          if (isTimestamp) {
            const dateObj = data.date.toDate();
            const year = dateObj.getFullYear();
            const month = String(dateObj.getMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getDate()).padStart(2, '0');
            formattedDate = `${year}-${month}-${day}`;
            dateInfo = dateObj.toString();
          } else if (typeof data.date === 'string') {
            formattedDate = data.date;
            dateInfo = data.date;
          }
        }
        
        return {
          id: doc.id,
          name: data.name,
          dateType,
          isTimestamp,
          dateInfo,
          formattedDate,
          raw: data.date
        };
      });
      
      setResults(holidays);
      console.log('Holiday Debug Results:', holidays);
    } catch (error) {
      console.error('Error fetching holidays:', error);
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 border-2 border-blue-500 rounded-lg p-4 shadow-lg max-w-md z-50">
      <h3 className="font-bold text-lg mb-2">Holiday Debugger</h3>
      
      <button
        onClick={testFetch}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 mb-3"
      >
        {loading ? 'Testing...' : 'Test Holiday Fetch'}
      </button>
      
      {results.length > 0 && (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          <p className="font-semibold">Found {results.length} holidays:</p>
          {results.map((holiday, idx) => (
            <div key={idx} className="border border-gray-300 dark:border-gray-600 rounded p-2 text-xs">
              <div><strong>Name:</strong> {holiday.name}</div>
              <div><strong>Formatted Date:</strong> {holiday.formattedDate}</div>
              <div><strong>Type:</strong> {holiday.dateType}</div>
              <div><strong>Is Timestamp:</strong> {holiday.isTimestamp ? '✅ YES' : '❌ NO'}</div>
              <div className="text-gray-600 dark:text-gray-400 mt-1">
                <strong>Raw:</strong> {holiday.dateInfo}
              </div>
              {!holiday.isTimestamp && (
                <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded">
                  ⚠️ This holiday is stored as a string, not a Timestamp. Delete and re-add it!
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {results.length === 0 && !loading && (
        <p className="text-gray-500">Click the button to test</p>
      )}
    </div>
  );
}

// HOW TO USE:
// 1. Import this component in your attendance roster page:
//    import { HolidayDebugger } from './test-holiday-fetch';
//
// 2. Add it to your JSX (at the end, before the closing </div>):
//    <HolidayDebugger />
//
// 3. A debug panel will appear in the bottom-right corner
// 4. Click "Test Holiday Fetch" to see what's in your database
// 5. Check if holidays are Timestamps or strings
// 6. Remove this component after debugging
