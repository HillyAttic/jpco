#!/usr/bin/env node

/**
 * PWA Testing Script
 * 
 * This script helps test PWA functionality by checking various aspects
 * of the Progressive Web App implementation.
 */

const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFile(filePath, description) {
  const fullPath = path.join(__dirname, '..', filePath);
  const exists = fs.existsSync(fullPath);
  
  if (exists) {
    log(`✅ ${description}`, 'green');
    return true;
  } else {
    log(`❌ ${description} - Missing: ${filePath}`, 'red');
    return false;
  }
}

function checkManifest() {
  log('\n📱 Checking PWA Manifest...', 'blue');
  
  const manifestPath = path.join(__dirname, '../public/manifest.json');
  
  if (!fs.existsSync(manifestPath)) {
    log('❌ manifest.json not found', 'red');
    return false;
  }
  
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    
    // Check required fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'icons'];
    let allFieldsPresent = true;
    
    for (const field of requiredFields) {
      if (manifest[field]) {
        log(`✅ ${field}: ${typeof manifest[field] === 'object' ? 'configured' : manifest[field]}`, 'green');
      } else {
        log(`❌ Missing required field: ${field}`, 'red');
        allFieldsPresent = false;
      }
    }
    
    // Check icons
    if (manifest.icons && manifest.icons.length > 0) {
      log(`✅ Icons configured: ${manifest.icons.length} icons`, 'green');
      
      // Check if icon files exist
      for (const icon of manifest.icons) {
        const iconPath = path.join(__dirname, '../public', icon.src);
        if (fs.existsSync(iconPath)) {
          log(`  ✅ ${icon.src} (${icon.sizes})`, 'green');
        } else {
          log(`  ❌ ${icon.src} (${icon.sizes}) - File missing`, 'red');
          allFieldsPresent = false;
        }
      }
    }
    
    return allFieldsPresent;
    
  } catch (error) {
    log(`❌ Invalid manifest.json: ${error.message}`, 'red');
    return false;
  }
}

function checkServiceWorker() {
  log('\n🔧 Checking Service Worker...', 'blue');
  
  return checkFile('public/sw.js', 'Service Worker file');
}

function checkPWAIcons() {
  log('\n🎨 Checking PWA Icons...', 'blue');
  
  const iconChecks = [
    ['public/images/logo/logo-192.png', '192x192 icon'],
    ['public/images/logo/logo-512.png', '512x512 icon'],
    ['public/images/logo/logo-maskable-192.png', '192x192 maskable icon'],
    ['public/images/logo/logo-maskable-512.png', '512x512 maskable icon'],
    ['public/images/icons/dashboard-96.png', 'Dashboard shortcut icon'],
    ['public/images/icons/tasks-96.png', 'Tasks shortcut icon'],
    ['public/images/icons/employees-96.png', 'Employees shortcut icon']
  ];
  
  let allIconsPresent = true;
  
  for (const [filePath, description] of iconChecks) {
    if (!checkFile(filePath, description)) {
      allIconsPresent = false;
    }
  }
  
  return allIconsPresent;
}

function checkScreenshots() {
  log('\n📸 Checking Screenshots...', 'blue');
  
  const screenshotChecks = [
    ['public/images/screenshots/desktop-dashboard.png', 'Desktop screenshot'],
    ['public/images/screenshots/mobile-dashboard.png', 'Mobile screenshot']
  ];
  
  let allScreenshotsPresent = true;
  
  for (const [filePath, description] of screenshotChecks) {
    if (!checkFile(filePath, description)) {
      allScreenshotsPresent = false;
    }
  }
  
  return allScreenshotsPresent;
}

function checkReactIntegration() {
  log('\n⚛️ Checking React Integration...', 'blue');
  
  const integrationChecks = [
    ['src/app/service-worker-provider.tsx', 'ServiceWorkerProvider component'],
    ['src/hooks/use-service-worker.ts', 'useServiceWorker hook'],
    ['src/app/layout.tsx', 'Layout with PWA meta tags']
  ];
  
  let allIntegrationsPresent = true;
  
  for (const [filePath, description] of integrationChecks) {
    if (!checkFile(filePath, description)) {
      allIntegrationsPresent = false;
    }
  }
  
  // Check if ServiceWorkerProvider is used in layout
  const layoutPath = path.join(__dirname, '../src/app/layout.tsx');
  if (fs.existsSync(layoutPath)) {
    const layoutContent = fs.readFileSync(layoutPath, 'utf8');
    if (layoutContent.includes('ServiceWorkerProvider')) {
      log('✅ ServiceWorkerProvider integrated in layout', 'green');
    } else {
      log('❌ ServiceWorkerProvider not found in layout', 'red');
      allIntegrationsPresent = false;
    }
  }
  
  return allIntegrationsPresent;
}

function generateTestReport() {
  log('\n📊 PWA Test Report', 'blue');
  log('='.repeat(50), 'blue');
  
  const tests = [
    { name: 'Manifest Configuration', test: checkManifest },
    { name: 'Service Worker', test: checkServiceWorker },
    { name: 'PWA Icons', test: checkPWAIcons },
    { name: 'Screenshots', test: checkScreenshots },
    { name: 'React Integration', test: checkReactIntegration }
  ];
  
  let passedTests = 0;
  const totalTests = tests.length;
  
  for (const { name, test } of tests) {
    if (test()) {
      passedTests++;
    }
  }
  
  log('\n📈 Summary:', 'blue');
  log(`Tests Passed: ${passedTests}/${totalTests}`, passedTests === totalTests ? 'green' : 'yellow');
  
  if (passedTests === totalTests) {
    log('\n🎉 All PWA tests passed! Your app is ready for PWA deployment.', 'green');
    log('\nNext steps:', 'blue');
    log('1. Test PWA installation in Chrome/Edge', 'reset');
    log('2. Verify offline functionality', 'reset');
    log('3. Test on mobile devices', 'reset');
    log('4. Run Lighthouse PWA audit', 'reset');
  } else {
    log('\n⚠️ Some PWA tests failed. Please fix the issues above.', 'yellow');
  }
  
  return passedTests === totalTests;
}

// Browser testing instructions
function showBrowserTestInstructions() {
  log('\n🌐 Browser Testing Instructions:', 'blue');
  log('='.repeat(50), 'blue');
  
  log('\n📱 Desktop Testing (Chrome/Edge):', 'yellow');
  log('1. Open http://localhost:3000 in Chrome or Edge');
  log('2. Look for install icon in address bar');
  log('3. Click install to add PWA to desktop');
  log('4. Test offline: DevTools > Network > Offline checkbox');
  log('5. Verify app still works when offline');
  
  log('\n📱 Mobile Testing:', 'yellow');
  log('1. Open http://[your-ip]:3000 on mobile browser');
  log('2. Use "Add to Home Screen" option');
  log('3. Test installed app from home screen');
  log('4. Turn off mobile data/wifi to test offline');
  
  log('\n🔍 Lighthouse Audit:', 'yellow');
  log('1. Open Chrome DevTools (F12)');
  log('2. Go to Lighthouse tab');
  log('3. Select "Progressive Web App" category');
  log('4. Run audit and aim for 100/100 score');
}

// Main execution
function main() {
  log('🚀 PWA Testing Suite', 'blue');
  log('='.repeat(50), 'blue');
  
  const allTestsPassed = generateTestReport();
  
  if (allTestsPassed) {
    showBrowserTestInstructions();
  }
  
  return allTestsPassed;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main, generateTestReport };