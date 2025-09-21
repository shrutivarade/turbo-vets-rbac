#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 CSS Analysis Tool\n');

// Function to extract CSS classes from CSS files
function extractCSSClasses(cssContent) {
  const classes = new Set();
  const classRegex = /\.([a-zA-Z][\w-]*)/g;
  let match;
  
  while ((match = classRegex.exec(cssContent)) !== null) {
    classes.add(match[1]);
  }
  
  return classes;
}

// Function to extract used classes from HTML/TS files
function extractUsedClasses(content) {
  const classes = new Set();
  
  // Match class="..." and [class]="..." patterns
  const classAttrRegex = /(?:class|ngClass)=["']([^"']+)["']/g;
  const classList = content.match(classAttrRegex);
  
  if (classList) {
    classList.forEach(classStr => {
      const classNames = classStr.replace(/(?:class|ngClass)=["']/, '').replace(/["']$/, '');
      classNames.split(/\s+/).forEach(className => {
        if (className && !className.includes('{{') && !className.includes('}}')) {
          classes.add(className);
        }
      });
    });
  }
  
  // Also match standalone class names in TypeScript (for dynamic classes)
  const dynamicClassRegex = /['"`]([a-zA-Z][\w-]+)['"`]/g;
  let match;
  while ((match = dynamicClassRegex.exec(content)) !== null) {
    if (match[1].length > 2) { // Avoid very short matches
      classes.add(match[1]);
    }
  }
  
  return classes;
}

async function analyzeCSSUsage() {
  try {
    // Get all CSS files
    const cssFiles = glob.sync('./src/**/*.css');
    console.log(`📁 Found ${cssFiles.length} CSS files:`);
    cssFiles.forEach(file => console.log(`   - ${file}`));
    console.log();
    
    // Get all HTML and TS files
    const sourceFiles = glob.sync('./src/**/*.{html,ts}');
    console.log(`📄 Found ${sourceFiles.length} source files to analyze\n`);
    
    // Extract all defined CSS classes
    const allDefinedClasses = new Set();
    const fileClassCounts = {};
    
    for (const cssFile of cssFiles) {
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      const classes = extractCSSClasses(cssContent);
      fileClassCounts[cssFile] = classes.size;
      
      classes.forEach(cls => allDefinedClasses.add(cls));
      
      console.log(`📋 ${cssFile}: ${classes.size} classes defined`);
      if (classes.size < 20) {
        console.log(`   Classes: ${Array.from(classes).join(', ')}`);
      }
    }
    
    console.log(`\n📊 Total unique CSS classes defined: ${allDefinedClasses.size}\n`);
    
    // Extract all used classes
    const allUsedClasses = new Set();
    
    for (const sourceFile of sourceFiles) {
      const content = fs.readFileSync(sourceFile, 'utf8');
      const classes = extractUsedClasses(content);
      classes.forEach(cls => allUsedClasses.add(cls));
    }
    
    console.log(`✅ Total unique CSS classes used: ${allUsedClasses.size}\n`);
    
    // Find unused classes
    const unusedClasses = new Set();
    allDefinedClasses.forEach(cls => {
      if (!allUsedClasses.has(cls)) {
        unusedClasses.add(cls);
      }
    });
    
    console.log(`❌ Potentially unused CSS classes: ${unusedClasses.size}\n`);
    
    if (unusedClasses.size > 0) {
      console.log('🗑️  Unused classes:');
      Array.from(unusedClasses).sort().forEach(cls => {
        console.log(`   - .${cls}`);
      });
    }
    
    // Calculate potential savings
    const usagePercentage = ((allDefinedClasses.size - unusedClasses.size) / allDefinedClasses.size * 100).toFixed(1);
    console.log(`\n📈 CSS Usage Statistics:`);
    console.log(`   Used: ${allDefinedClasses.size - unusedClasses.size} classes (${usagePercentage}%)`);
    console.log(`   Unused: ${unusedClasses.size} classes (${(100 - usagePercentage).toFixed(1)}%)`);
    
    // File-by-file breakdown
    console.log(`\n📂 Per-file breakdown:`);
    Object.entries(fileClassCounts).forEach(([file, count]) => {
      console.log(`   ${file}: ${count} classes`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing CSS:', error.message);
  }
}

analyzeCSSUsage();
