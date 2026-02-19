// Copy and paste this into your browser console to test holidays
// Run this on the attendance roster page

async function testHolidays() {
  console.log('🔍 Testing Holiday Fetch...');
  
  try {
    // Import Firebase
    const { db } = await import('/src/lib/firebase.js');
    const { collection, getDocs } = await import('firebase/firestore');
    
    // Fetch all holidays
    const snapshot = await getDocs(collection(db, 'holidays'));
    
    console.log('📊 Total holidays in database:', snapshot.size);
    
    if (snapshot.size === 0) {
      console.error('❌ No holidays found in database!');
      console.log('💡 Solution: Add holidays using the "Manage Holidays" button');
      return;
    }
    
    // Process each holiday
    const holidays = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      
      let holidayDate;
      let dateType = typeof data.date;
      let isTimestamp = data.date && typeof data.date.toDate === 'function';
      
      if (isTimestamp) {
        holidayDate = data.date.toDate();
      } else if (typeof data.date === 'string') {
        holidayDate = new Date(data.date + 'T00:00:00');
      } else {
        holidayDate = new Date(data.date);
      }
      
      const year = holidayDate.getFullYear();
      const month = String(holidayDate.getMonth() + 1).padStart(2, '0');
      const day = String(holidayDate.getDate()).padStart(2, '0');
      const formattedDate = `${year}-${month}-${day}`;
      
      holidays.push({
        id: doc.id,
        name: data.name,
        rawDate: data.date,
        dateType: dateType,
        isTimestamp: isTimestamp,
        parsedDate: holidayDate.toISOString(),
        formattedDate: formattedDate
      });
      
      console.log(`📅 Holiday: ${data.name}`);
      console.log(`   Date Type: ${dateType} ${isTimestamp ? '(Timestamp ✅)' : '(String ❌)'}`);
      console.log(`   Parsed: ${holidayDate.toISOString()}`);
      console.log(`   Formatted: ${formattedDate}`);
      console.log('');
    });
    
    // Check for Feb 20 and 21, 2026
    const feb20 = holidays.find(h => h.formattedDate === '2026-02-20');
    const feb21 = holidays.find(h => h.formattedDate === '2026-02-21');
    
    console.log('🎯 Checking for Feb 20, 2026:', feb20 ? '✅ FOUND' : '❌ NOT FOUND');
    if (feb20) {
      console.log('   Name:', feb20.name);
      console.log('   Is Timestamp:', feb20.isTimestamp ? '✅ YES' : '❌ NO (needs re-add)');
    }
    
    console.log('🎯 Checking for Feb 21, 2026:', feb21 ? '✅ FOUND' : '❌ NOT FOUND');
    if (feb21) {
      console.log('   Name:', feb21.name);
      console.log('   Is Timestamp:', feb21.isTimestamp ? '✅ YES' : '❌ NO (needs re-add)');
    }
    
    // Summary
    console.log('');
    console.log('📋 SUMMARY:');
    console.log('   Total holidays:', holidays.length);
    console.log('   Feb 20, 2026:', feb20 ? '✅' : '❌');
    console.log('   Feb 21, 2026:', feb21 ? '✅' : '❌');
    
    if (feb20 && feb21) {
      if (feb20.isTimestamp && feb21.isTimestamp) {
        console.log('');
        console.log('✅ Both holidays exist and are in correct format!');
        console.log('💡 If they\'re not showing in blue:');
        console.log('   1. Make sure you\'re viewing February 2026');
        console.log('   2. Click the "Refresh" button');
        console.log('   3. Check the console for [AttendanceRoster] logs');
      } else {
        console.log('');
        console.log('⚠️ Holidays exist but are in STRING format (not Timestamp)');
        console.log('💡 Solution:');
        console.log('   1. Click "Manage Holidays"');
        console.log('   2. Delete both holidays');
        console.log('   3. Re-add them');
        console.log('   4. They will be saved as Timestamps');
      }
    } else {
      console.log('');
      console.log('❌ One or both holidays are missing');
      console.log('💡 Solution:');
      console.log('   1. Click "Manage Holidays"');
      console.log('   2. Add holidays for Feb 20 and Feb 21, 2026');
    }
    
    return holidays;
    
  } catch (error) {
    console.error('❌ Error testing holidays:', error);
    console.log('💡 Make sure you\'re on the attendance roster page');
  }
}

// Run the test
console.log('🚀 Running holiday test...');
console.log('');
testHolidays();
