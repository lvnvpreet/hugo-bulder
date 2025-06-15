const fs = require('fs-extra');
const path = require('path');

async function testFsExtra() {
  try {
    console.log('Testing fs-extra functions...');
    
    // Test directory creation
    const testDir = path.join(__dirname, 'test-fs-extra');
    await fs.ensureDir(testDir);
    console.log('✅ ensureDir works');
    
    // Test file writing
    const testFile = path.join(testDir, 'test.txt');
    await fs.writeFile(testFile, 'Hello World', 'utf-8');
    console.log('✅ writeFile works');
    
    // Test file reading
    const content = await fs.readFile(testFile, 'utf-8');
    console.log('✅ readFile works, content:', content);
    
    // Test pathExists
    const exists = await fs.pathExists(testFile);
    console.log('✅ pathExists works:', exists);
    
    // Cleanup
    await fs.remove(testDir);
    console.log('✅ remove works');
    
    console.log('All fs-extra functions working correctly!');
    
  } catch (error) {
    console.error('❌ fs-extra test failed:', error);
  }
}

testFsExtra();
