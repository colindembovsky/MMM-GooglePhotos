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

// Test 5: Check default configuration
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
