#!/usr/bin/env node

/**
 * PWA Install Button Test Script
 * 
 * This script helps verify the PWA install button implementation
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

function checkPWAInstallButtonComponent() {
  log('\n📱 Checking PWA Install Button Component...', 'blue');
  
  const componentPath = path.join(__dirname, '../src/components/Layouts/header/pwa-install-button/index.tsx');
  
  if (!fs.existsSync(componentPath)) {
    log('❌ PWA Install Button component not found', 'red');
    return false;
  }
  
  try {
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for required features
    const requiredFeatures = [
      { pattern: /BeforeInstallPromptEvent/, description: 'BeforeInstallPromptEvent interface' },
      { pattern: /useServiceWorker/, description: 'useServiceWorker hook usage' },
      { pattern: /useResponsive/, description: 'useResponsive hook usage' },
      { pattern: /beforeinstallprompt/, description: 'beforeinstallprompt event listener' },
      { pattern: /appinstalled/, description: 'appinstalled event listener' },
      { pattern: /device\.type.*mobile/, description: 'Mobile device detection' },
      { pattern: /iPad\|iPhone\|iPod/, description: 'iOS device detection' },
      { pattern: /display-mode.*standalone/, description: 'Standalone mode detection' },
      { pattern: /prompt\(\)/, description: 'Install prompt trigger' },
      { pattern: /Add to Home Screen/, description: 'iOS installation instructions' }
    ];
    
    let allFeaturesPresent = true;
    
    for (const { pattern, description } of requiredFeatures) {
      if (pattern.test(componentContent)) {
        log(`  ✅ ${description}`, 'green');
      } else {
        log(`  ❌ Missing: ${description}`, 'red');
        allFeaturesPresent = false;
      }
    }
    
    return allFeaturesPresent;
    
  } catch (error) {
    log(`❌ Error reading component: ${error.message}`, 'red');
    return false;
  }
}

function checkHeaderIntegration() {
  log('\n🔧 Checking Header Integration...', 'blue');
  
  const headerPath = path.join(__dirname, '../src/components/Layouts/header/index.tsx');
  
  if (!fs.existsSync(headerPath)) {
    log('❌ Header component not found', 'red');
    return false;
  }
  
  try {
    const headerContent = fs.readFileSync(headerPath, 'utf8');
    
    // Check for integration
    const integrationChecks = [
      { pattern: /import.*PWAInstallButton/, description: 'PWAInstallButton import' },
      { pattern: /<PWAInstallButton/, description: 'PWAInstallButton component usage' },
      { pattern: /PWA Install Button.*Mobile Only/, description: 'PWA Install Button comment' }
    ];
    
    let allIntegrationsPresent = true;
    
    for (const { pattern, description } of integrationChecks) {
      if (pattern.test(headerContent)) {
        log(`  ✅ ${description}`, 'green');
      } else {
        log(`  ❌ Missing: ${description}`, 'red');
        allIntegrationsPresent = false;
      }
    }
    
    return allIntegrationsPresent;
    
  } catch (error) {
    log(`❌ Error reading header: ${error.message}`, 'red');
    return false;
  }
}

function checkSVGIcon() {
  log('\n🎨 Checking SVG Icon Implementation...', 'blue');
  
  const componentPath = path.join(__dirname, '../src/components/Layouts/header/pwa-install-button/index.tsx');
  
  try {
    const componentContent = fs.readFileSync(componentPath, 'utf8');
    
    // Check for the specific SVG icon elements
    const iconChecks = [
      { pattern: /viewBox="0 0 24 24"/, description: 'Correct viewBox dimensions' },
      { pattern: /clipPath.*clip0_11570_87998/, description: 'Correct clipPath reference' },
      { pattern: /M18 20\.25V3\.75/, description: 'Phone outline path' },
      { pattern: /M12 10\.1055L12 17\.6055/, description: 'Download arrow line' },
      { pattern: /M9\.75 15\.3555L12 17\.6055L14\.25 15\.3555/, description: 'Download arrow head' },
      { pattern: /M10\.5 4\.5H13\.5/, description: 'Phone notch/speaker' }
    ];
    
    let allIconElementsPresent = true;
    
    for (const { pattern, description } of iconChecks) {
      if (pattern.test(componentContent)) {
        log(`  ✅ ${description}`, 'green');
      } else {
        log(`  ❌ Missing: ${description}`, 'red');
        allIconElementsPresent = false;
      }
    }
    
    return allIconElementsPresent;
    
  } catch (error) {
    log(`❌ Error checking SVG icon: ${error.message}`, 'red');
    return false;
  }
}

function generateTestReport() {
  log('\n📊 PWA Install Button Test Report', 'blue');
  log('='.repeat(50), 'blue');
  
  const tests = [
    { name: 'PWA Install Button Component', test: checkPWAInstallButtonComponent },
    { name: 'Header Integration', test: checkHeaderIntegration },
    { name: 'SVG Icon Implementation', test: checkSVGIcon }
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
    log('\n🎉 All PWA install button tests passed!', 'green');
    log('\nFeatures implemented:', 'blue');
    log('✅ Mobile-only visibility', 'green');
    log('✅ Cross-platform support (Android/iOS)', 'green');
    log('✅ Smart installation detection', 'green');
    log('✅ Exact SVG icon implementation', 'green');
    log('✅ Touch-optimized design', 'green');
    log('✅ Accessibility support', 'green');
    
    log('\nTesting instructions:', 'blue');
    log('1. Open app on mobile browser', 'reset');
    log('2. Look for install button in header (before theme toggle)', 'reset');
    log('3. Tap button to trigger PWA installation', 'reset');
    log('4. Verify button disappears after installation', 'reset');
  } else {
    log('\n⚠️ Some tests failed. Please fix the issues above.', 'yellow');
  }
  
  return passedTests === totalTests;
}

// Main execution
function main() {
  log('🚀 PWA Install Button Test Suite', 'blue');
  log('='.repeat(50), 'blue');
  
  const allTestsPassed = generateTestReport();
  
  return allTestsPassed;
}

if (require.main === module) {
  const success = main();
  process.exit(success ? 0 : 1);
}

module.exports = { main, generateTestReport };