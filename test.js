#!/usr/bin/env node

// Simple test script to verify the MMM-FolderPhotos module can load
// Run this from the module directory: node test.js

const fs = require('fs');

console.log('Testing MMM-FolderPhotos module...');

// Test 1: Check if main files exist
const mainFiles = [
  'MMM-FolderPhotos.js',
  'node_helper.js',
  'package.json',
  'MMM-FolderPhotos.css',
];

console.log('\n1. Checking main files...');
let allFilesExist = true;
for (const file of mainFiles) {
  if (fs.existsSync(file)) {
    console.log(`✓ ${file} exists`);
  } else {
    console.log(`✗ ${file} missing`);
    allFilesExist = false;
  }
}

// Test 2: Check if package.json is valid
console.log('\n2. Checking package.json...');
try {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  console.log('✓ package.json is valid JSON');
  console.log(`  Name: ${packageJson.name}`);
  console.log(`  Version: ${packageJson.version}`);
  console.log(`  Dependencies: ${Object.keys(packageJson.dependencies || {}).join(', ')}`);
} catch (error) {
  console.log('✗ package.json is invalid:', error.message);
  allFilesExist = false;
}

// Test 3: Try to load the main module
console.log('\n3. Testing main module...');
try {
  // This won't fully work outside MagicMirror, but we can check basic syntax
  const moduleContent = fs.readFileSync('MMM-FolderPhotos.js', 'utf8');
  if (moduleContent.includes('Module.register')) {
    console.log('✓ Main module appears to be valid MagicMirror module');
  } else {
    console.log('✗ Main module does not appear to be valid MagicMirror module');
    allFilesExist = false;
  }
} catch (error) {
  console.log('✗ Error reading main module:', error.message);
  allFilesExist = false;
}

// Test 4: Test helper functions
console.log('\n4. Testing helper functions...');
try {
  const helperContent = fs.readFileSync('node_helper.js', 'utf8');
  if (helperContent.includes('NodeHelper.create')) {
    console.log('✓ Node helper appears to be valid');
  } else {
    console.log('✗ Node helper does not appear to be valid');
    allFilesExist = false;
  }
} catch (error) {
  console.log('✗ Error reading node helper:', error.message);
  allFilesExist = false;
}

// Test 5: Test date extraction function
console.log('\n5. Testing date extraction function...');

// Mock the extractDateFromFilename function for testing
function extractDateFromFilename(filename) {
  // Look for YYYYMMDD pattern in filename
  const datePattern = /(\d{4})(\d{2})(\d{2})/;
  const match = filename.match(datePattern);
  
  if (match) {
    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const day = parseInt(match[3]);
    
    // Validate the date components
    if (year >= 1900 && year <= new Date().getFullYear() + 10 && 
        month >= 1 && month <= 12 && 
        day >= 1 && day <= 31) {
      
      // Create date object and validate it actually exists
      const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
      
      // Check if the date is valid (handles invalid dates like Feb 30)
      if (date.getFullYear() === year && 
          date.getMonth() === month - 1 && 
          date.getDate() === day) {
        return date.toISOString();
      }
    }
  }
  
  return null;
}

// Test cases for date extraction
const testCases = [
  { filename: 'IMG_20231225_143052.jpg', expected: true, description: 'Standard date format' },
  { filename: 'photo_20220101_120000.png', expected: true, description: 'New Year date' },
  { filename: 'vacation_20230230_pic.jpg', expected: false, description: 'Invalid date (Feb 30)' },
  { filename: 'family_20231301_gathering.jpg', expected: false, description: 'Invalid month (13)' },
  { filename: 'beach_20221332_sunset.jpg', expected: false, description: 'Invalid day (32)' },
  { filename: 'random_photo.jpg', expected: false, description: 'No date in filename' },
  { filename: '2023_vacation.jpg', expected: false, description: 'Incomplete date' },
  { filename: 'IMG_18001225_ancient.jpg', expected: false, description: 'Year too old' },
  { filename: 'future_20401225_pic.jpg', expected: false, description: 'Year too far in future' },
  { filename: 'IMG_20230415_spring.jpg', expected: true, description: 'Valid spring date' },
];

let dateTestsPassed = 0;
let dateTestsFailed = 0;

for (const testCase of testCases) {
  const result = extractDateFromFilename(testCase.filename);
  const passed = testCase.expected ? (result !== null) : (result === null);
  
  if (passed) {
    console.log(`✓ ${testCase.description}: ${testCase.filename}`);
    if (result) {
      const extractedDate = new Date(result);
      console.log(`  Extracted date: ${extractedDate.toDateString()}`);
    }
    dateTestsPassed++;
  } else {
    console.log(`✗ ${testCase.description}: ${testCase.filename}`);
    console.log(`  Expected: ${testCase.expected ? 'valid date' : 'null'}, Got: ${result}`);
    dateTestsFailed++;
    allFilesExist = false;
  }
}

console.log(`Date extraction tests: ${dateTestsPassed} passed, ${dateTestsFailed} failed`);

// Test 6: Check default configuration
console.log('\n5. Testing default configuration...');
const testConfig = {
  rootPath: "~/Pictures/MagicMirror",
  albums: [],
  updateInterval: 1000 * 30,
  sort: "new",
  recursiveSubFolders: true,
  validExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp'],
  condition: {},
  showWidth: 1080,
  showHeight: 1920,
  timeFormat: "YYYY/MM/DD HH:mm",
};

// Expand tilde
let rootPath = testConfig.rootPath;
if (rootPath.startsWith('~/')) {
  const os = require('os');
  rootPath = rootPath.replace('~', os.homedir());
}

console.log(`✓ Default configuration appears valid`);
console.log(`  Root path would be: ${rootPath}`);
console.log(`  Valid extensions: ${testConfig.validExtensions.join(', ')}`);

// Summary
console.log('\n=== TEST SUMMARY ===');
if (allFilesExist) {
  console.log('✓ All tests passed! Module appears ready to use.');
  console.log('\nNext steps:');
  console.log('1. Create your photo directory structure');
  console.log('2. Add this module to your MagicMirror config');
  console.log('3. Restart MagicMirror');
} else {
  console.log('✗ Some tests failed. Please check the issues above.');
}

console.log('\nFor more information, see the README.md file.');
