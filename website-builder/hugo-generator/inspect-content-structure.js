/**
 * Content Directory Structure Inspector
 * Shows the complete structure with file details
 */

const fs = require('fs');
const path = require('path');

function inspectDirectory(dir, indent = '') {
  try {
    const items = fs.readdirSync(dir);
    const results = [];
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        results.push(`${indent}📁 ${item}/`);
        const subResults = inspectDirectory(itemPath, indent + '  ');
        results.push(...subResults);
      } else {
        const sizeKB = (stats.size / 1024).toFixed(1);
        results.push(`${indent}📄 ${item} (${sizeKB} KB)`);
      }
    });
    
    return results;
  } catch (error) {
    return [`${indent}❌ Error reading directory: ${error.message}`];
  }
}

function showContentStructure() {
  console.log('📋 COMPLETE CONTENT DIRECTORY STRUCTURE');
  console.log('=' .repeat(50));
  
  const contentDir = path.join(__dirname, 'test-output', 'blog-structure-test', 'content');
  
  if (!fs.existsSync(contentDir)) {
    console.log('❌ Content directory not found:', contentDir);
    return;
  }
  
  console.log(`📁 content/`);
  const structure = inspectDirectory(contentDir, '  ');
  structure.forEach(line => console.log(line));
  
  console.log('\n' + '=' .repeat(50));
  console.log('📊 STRUCTURE SUMMARY');
  console.log('=' .repeat(50));
  
  // Count files by type
  const counts = {
    directories: 0,
    markdownFiles: 0,
    totalSize: 0
  };
  
  function countItems(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);
      
      if (stats.isDirectory()) {
        counts.directories++;
        countItems(itemPath);
      } else if (item.endsWith('.md')) {
        counts.markdownFiles++;
        counts.totalSize += stats.size;
      }
    });
  }
  
  countItems(contentDir);
  
  console.log(`📁 Total Directories: ${counts.directories}`);
  console.log(`📄 Total Markdown Files: ${counts.markdownFiles}`);
  console.log(`💾 Total Content Size: ${(counts.totalSize / 1024).toFixed(1)} KB`);
  
  console.log('\n📋 DIRECTORY STRUCTURE VERIFICATION');
  console.log('=' .repeat(50));
  
  // Verify structure matches requirements
  const requiredStructure = [
    'content/_index.md',
    'content/about/_index.md',
    'content/services/_index.md',
    'content/contact/_index.md',
    'content/blogs/_index.md'
  ];
  
  const rootDir = path.join(__dirname, 'test-output', 'blog-structure-test');
  
  requiredStructure.forEach(reqPath => {
    const fullPath = path.join(rootDir, reqPath);
    const exists = fs.existsSync(fullPath);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${reqPath}`);
  });
  
  // Check blog year folders
  const blogsDir = path.join(contentDir, 'blogs');
  if (fs.existsSync(blogsDir)) {
    const years = fs.readdirSync(blogsDir).filter(item => {
      const itemPath = path.join(blogsDir, item);
      return fs.statSync(itemPath).isDirectory() && /^\d{4}$/.test(item);
    });
    
    console.log(`\n📅 Blog Year Folders: ${years.join(', ')}`);
    
    years.forEach(year => {
      const yearDir = path.join(blogsDir, year);
      const posts = fs.readdirSync(yearDir).filter(file => file.endsWith('.md'));
      console.log(`   ${year}: ${posts.length} blog posts`);
    });
  }
}

// Run the inspection
showContentStructure();
