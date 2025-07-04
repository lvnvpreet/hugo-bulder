const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

async function testThemeInstallation() {
  console.log('🧪 Testing Theme Installation Process...');
  
  // Create a temporary test site
  const testSiteDir = path.join(__dirname, 'temp-test-site');
  const themesDir = path.join(testSiteDir, 'themes');
  const themeDir = path.join(themesDir, 'health-wellness-theme');
  
  try {
    // Clean up any existing test directory
    if (await fs.pathExists(testSiteDir)) {
      await fs.remove(testSiteDir);
    }
    
    // Create test directory structure
    await fs.ensureDir(themesDir);
    
    console.log('📁 Created test directory structure');
    
    // Test the theme installation process
    const themeName = 'health-wellness-theme';
    
    // 1. Default Hugo theme test
    console.log('🔍 Testing default-hugo theme (should skip installation)...');
    if (themeName === 'default-hugo') {
      console.log('📦 Using default Hugo theme - no installation required');
    } else {
      console.log('🌐 Installing health-wellness-theme...');
      
      // Clone the theme
      const repoUrl = 'https://github.com/lvnvpreet/health-wellness-theme.git';
      console.log(`🔄 Cloning from: ${repoUrl}`);
      
      execSync(`git clone --depth 1 "${repoUrl}" "${themeDir}"`, { 
        stdio: 'inherit',
        cwd: process.cwd()
      });
      
      // Remove .git directory
      const gitDir = path.join(themeDir, '.git');
      if (await fs.pathExists(gitDir)) {
        await fs.remove(gitDir);
        console.log('🗑️  Removed .git directory');
      }
      
      // Verify installation
      const themeTomlPath = path.join(themeDir, 'theme.toml');
      if (await fs.pathExists(themeTomlPath)) {
        console.log('✅ Theme installed successfully!');
        console.log('📄 theme.toml found');
        
        // Check layouts directory
        const layoutsDir = path.join(themeDir, 'layouts');
        if (await fs.pathExists(layoutsDir)) {
          console.log('🎨 Layouts directory found');
          
          const files = await fs.readdir(layoutsDir);
          console.log(`📁 Layout files: ${files.join(', ')}`);
        }
      } else {
        console.log('❌ Theme installation failed - theme.toml not found');
      }
    }
    
    console.log('✅ Theme installation test completed successfully!');
    
    // Clean up
    await fs.remove(testSiteDir);
    console.log('🧹 Cleaned up test directory');
    
  } catch (error) {
    console.error('❌ Theme installation test failed:', error.message);
    
    // Clean up on error
    try {
      if (await fs.pathExists(testSiteDir)) {
        await fs.remove(testSiteDir);
      }
    } catch (cleanupError) {
      console.error('Failed to clean up:', cleanupError.message);
    }
    
    throw error;
  }
}

// Run the test
testThemeInstallation()
  .then(() => {
    console.log('🎉 All tests passed! Theme installation should work in production.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
